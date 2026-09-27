const activities = ['repair_remodel', 'addition', 'interior_conversion', 'additional_dwelling', 'partial_demolition_rebuild', 'demolition', 'new_construction', 'site_work', 'mixed_use', 'other_uncertain']
const intents = ['confirmed_candidate', 'tentative', 'negated']
const maxBodyBytes = 8192
const maxRequestCost = 0.01
const maxWeeklyKeyLimit = 3
const maxLifetimeKeyUsage = 10
const model = 'deepseek/deepseek-v4-flash-0731'

function exactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
}

function error(status, code) {
  return Response.json({ error: code }, { status, headers: { 'cache-control': 'no-store' } })
}

async function boundedBody(request) {
  if (Number(request.headers.get('content-length')) > maxBodyBytes) throw Error('too_large')
  const reader = request.body?.getReader()
  if (!reader) throw Error('invalid_body')
  const chunks = []
  let length = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > maxBodyBytes) {
      await reader.cancel()
      throw Error('too_large')
    }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

function validInput(value) {
  return exactKeys(value, ['schemaVersion', 'operation', 'requestId', 'draftId', 'draftRevision', 'originalText']) &&
    value.schemaVersion === 1 && value.operation === 'intake' &&
    typeof value.requestId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.requestId) &&
    typeof value.draftId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.draftId) &&
    Number.isSafeInteger(value.draftRevision) && value.draftRevision >= 0 &&
    typeof value.originalText === 'string' && value.originalText.trim().length > 0 && value.originalText.length <= 4000
}

async function readValidatedInput(request, trustedOrigin) {
  if (request.method !== 'POST') return { failure: error(405, 'method_not_allowed') }
  const url = new URL(request.url)
  const allowedOrigin = trustedOrigin === null
    ? ['127.0.0.1', 'localhost'].includes(url.hostname) && request.headers.get('origin') === 'http://127.0.0.1:5173'
    : url.origin === trustedOrigin && request.headers.get('origin') === trustedOrigin
  if (!allowedOrigin) return { failure: error(403, 'origin_denied') }
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return { failure: error(415, 'json_required') }
  let input
  try { input = await boundedBody(request) } catch { return { failure: error(413, 'invalid_or_large_body') } }
  if (!validInput(input)) return { failure: error(422, 'invalid_request') }
  return { input }
}

export async function validateAssistRequest(request, trustedOrigin = null) {
  return (await readValidatedInput(request, trustedOrigin)).failure ?? null
}

function validOutput(value, input) {
  if (!exactKeys(value, ['schemaVersion', 'operation', 'draftId', 'draftRevision', 'suggestions', 'question']) || value.schemaVersion !== 1 || value.operation !== 'intake' || value.draftId !== input.draftId || value.draftRevision !== input.draftRevision) return false
  if (!Array.isArray(value.suggestions) || value.suggestions.length > 10 || !(value.question === null || typeof value.question === 'string' && value.question.length > 0 && value.question.length <= 300)) return false
  const seen = new Set()
  for (const suggestion of value.suggestions) {
    if (!exactKeys(suggestion, ['activityId', 'intent', 'quote', 'reason']) || !activities.includes(suggestion.activityId) || !intents.includes(suggestion.intent) || seen.has(suggestion.activityId)) return false
    if (typeof suggestion.quote !== 'string' || suggestion.quote.length < 1 || suggestion.quote.length > 200 || !input.originalText.includes(suggestion.quote)) return false
    if (typeof suggestion.reason !== 'string' || suggestion.reason.length < 1 || suggestion.reason.length > 180) return false
    seen.add(suggestion.activityId)
  }
  return true
}

const responseSchema = {
  name: 'housing_intake',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    properties: {
      schemaVersion: { type: 'integer', enum: [1] },
      operation: { type: 'string', enum: ['intake'] },
      draftId: { type: 'string' },
      draftRevision: { type: 'integer' },
      suggestions: { type: 'array', maxItems: 10, items: { type: 'object', additionalProperties: false, properties: {
        activityId: { type: 'string', enum: activities },
        intent: { type: 'string', enum: intents },
        quote: { type: 'string', maxLength: 200 },
        reason: { type: 'string', maxLength: 180 },
      }, required: ['activityId', 'intent', 'quote', 'reason'] } },
      question: { type: ['string', 'null'], maxLength: 300 },
    },
    required: ['schemaVersion', 'operation', 'draftId', 'draftRevision', 'suggestions', 'question'],
  },
}

export function createAssistHandler(now = () => Date.now()) {
  const inFlight = new Set()
  const recent = []
  return async function handleAssist(request, { fetcher = fetch, key = '', log = () => {}, trustedOrigin = null } = {}) {
  const { input, failure } = await readValidatedInput(request, trustedOrigin)
  if (failure) return failure
  if (!key) return error(503, 'ai_unavailable')
  const minuteAgo = now() - 60000
  while (recent.length && recent[0] < minuteAgo) recent.shift()
  if (inFlight.size || recent.length >= 3) return error(429, 'local_rate_limit')
  inFlight.add(input.requestId)
  try {
    const capResponse = await fetcher('https://openrouter.ai/api/v1/key', { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
    if (!capResponse.ok) return error(503, 'budget_unverified')
    const cap = (await capResponse.json()).data
    if (!cap || !Number.isFinite(cap.limit) || cap.limit < 0 || cap.limit > maxWeeklyKeyLimit || cap.limit_reset !== 'weekly' || !Number.isFinite(cap.limit_remaining) || cap.limit_remaining < maxRequestCost || !Number.isFinite(cap.usage) || cap.usage < 0 || cap.usage + maxRequestCost > maxLifetimeKeyUsage) return error(503, 'budget_unverified')
    recent.push(now())
    const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Extract each distinct housing work activity that appears in the user text, including explicitly excluded activities. Classify each activity independently: confirmed_candidate means explicitly intended work; tentative means possible or conditional work; negated means the user explicitly excludes that same activity. Negation in one clause does not reverse other activities. An addition or extension is distinct from an additional dwelling. A bedroom is not another dwelling. Do not infer a property, municipality, permission, legal status, price, or feasibility. Return one question only if needed. Quotes must be exact substrings of the user text.' },
          { role: 'user', content: JSON.stringify({ draftId: input.draftId, draftRevision: input.draftRevision, originalText: input.originalText }) },
        ],
        response_format: { type: 'json_schema', json_schema: responseSchema },
        provider: { only: ['deepinfra/fp8'], zdr: true, data_collection: 'deny', require_parameters: true, allow_fallbacks: false, max_price: { prompt: 0.06, completion: 0.18 } },
        temperature: 0,
        reasoning: { enabled: false },
        max_tokens: 1024,
        stream: false,
      }),
    })
    if (!response.ok) return error(response.status === 429 ? 429 : 502, 'ai_unavailable')
    const completion = await response.json()
    const promptTokens = Number.isSafeInteger(completion?.usage?.prompt_tokens) ? completion.usage.prompt_tokens : null
    const completionTokens = Number.isSafeInteger(completion?.usage?.completion_tokens) ? completion.usage.completion_tokens : null
    const estimatedCostUsd = promptTokens === null || completionTokens === null ? null : Number((promptTokens * 0.06 / 1000000 + completionTokens * 0.18 / 1000000).toFixed(6))
    log({ requestId: input.requestId, model, promptTokens, completionTokens, estimatedCostUsd, status: 'provider_completed' })
    if (completion?.choices?.[0]?.finish_reason !== 'stop' || completion?.choices?.[0]?.message?.refusal) return error(502, 'invalid_ai_response')
    const content = completion?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return error(502, 'invalid_ai_response')
    const result = JSON.parse(content)
    if (!validOutput(result, input)) return error(502, 'invalid_ai_response')
    return Response.json(result, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return error(503, 'ai_unavailable')
  } finally {
    inFlight.delete(input.requestId)
  }
  }
}

export const handleAssist = createAssistHandler()
