import { beforeEach, describe, expect, it } from 'vitest'
import { createAssistHandler } from './intake.mjs'

let handleAssist: ReturnType<typeof createAssistHandler>
beforeEach(() => { handleAssist = createAssistHandler() })

const input = {
  schemaVersion: 1,
  operation: 'intake',
  requestId: 'request-1',
  draftId: 'draft-1',
  draftRevision: 4,
  originalText: 'Repair the house, maybe add a bedroom, not another unit.',
}
const output = {
  schemaVersion: 1,
  operation: 'intake',
  draftId: 'draft-1',
  draftRevision: 4,
  suggestions: [
    { activityId: 'repair_remodel', intent: 'confirmed_candidate', quote: 'Repair the house', reason: 'The proposal describes repair.' },
    { activityId: 'additional_dwelling', intent: 'negated', quote: 'not another unit', reason: 'The proposal excludes a new dwelling.' },
  ],
  question: null,
}

function request(body: unknown = input) {
  return new Request('http://127.0.0.1:5175/api/assist', {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function provider(cap = { limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 0 }, content: unknown = output) {
  const paths: string[] = []
  const fetcher = async (url: string | URL | Request) => {
    const path = String(url)
    paths.push(path)
    if (path.endsWith('/key')) return Response.json({ data: cap })
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 100, completion_tokens: 80 } })
  }
  return { fetcher, paths }
}

describe('local AI intake boundary', () => {
  it('returns only validated suggestions after checking the capped key', async () => {
    const { fetcher, paths } = provider()
    const response = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(output)
    expect(paths).toHaveLength(2)
  })

  it('does not call completion when the key cap exceeds $3', async () => {
    const { fetcher, paths } = provider({ limit: 10, limit_reset: 'weekly', limit_remaining: 10, usage: 0 })
    const response = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(503)
    expect(paths).toHaveLength(1)
  })

  it('does not call completion when the key resets more often than weekly', async () => {
    const { fetcher, paths } = provider({ limit: 3, limit_reset: 'daily', limit_remaining: 3, usage: 0 })
    const response = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(503)
    expect(paths).toHaveLength(1)
  })

  it('does not call completion when lifetime key usage leaves less than one request in the $10 budget', async () => {
    const { fetcher, paths } = provider({ limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 9.995 })
    const response = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(503)
    expect(paths).toHaveLength(1)
  })

  it("rejects a model suggestion whose quoted text is absent from the user's text", async () => {
    const { fetcher } = provider(undefined, { ...output, suggestions: [{ ...output.suggestions[0], quote: 'Build a second unit' }] })
    const response = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: 'invalid_ai_response' })
  })

  it('rejects extra request fields before any provider request', async () => {
    const { fetcher, paths } = provider()
    const response = await handleAssist(request({ ...input, parcelId: '0023C00208000000' }), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(422)
    expect(paths).toHaveLength(0)
  })

  it('rejects a duplicate request while the first completion is in flight', async () => {
    let release = () => {}
    let completionStarted = () => {}
    const waiting = new Promise<void>(resolve => { completionStarted = resolve })
    const fetcher = async (url: string | URL | Request) => {
      if (String(url).endsWith('/key')) return Response.json({ data: { limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 0 } })
      completionStarted()
      await new Promise<void>(resolve => { release = resolve })
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] })
    }
    const first = handleAssist(request(), { fetcher, key: 'test-only-key' })
    await waiting
    const second = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(second.status).toBe(429)
    release()
    expect((await first).status).toBe(200)
  })

  it('limits completed paid calls within a minute', async () => {
    const { fetcher, paths } = provider()
    for (let index = 0; index < 3; index++) {
      const response = await handleAssist(request({ ...input, requestId: `request-${index}` }), { fetcher, key: 'test-only-key' })
      expect(response.status).toBe(200)
    }
    const fourth = await handleAssist(request({ ...input, requestId: 'request-4' }), { fetcher, key: 'test-only-key' })
    expect(fourth.status).toBe(429)
    expect(paths).toHaveLength(6)
  })

  it('rejects a nonlocal origin before any provider request', async () => {
    const { fetcher, paths } = provider()
    const foreign = new Request('http://127.0.0.1:5175/api/assist', { method: 'POST', headers: { origin: 'https://other.example', 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const response = await handleAssist(foreign, { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(403)
    expect(paths).toHaveLength(0)
  })

  it('pins the single verified model and privacy route with bounded output', async () => {
    let sent: Record<string, unknown> | null = null
    const fetcher = async (url: string | URL | Request, options?: RequestInit) => {
      if (String(url).endsWith('/key')) return Response.json({ data: { limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 0 } })
      sent = JSON.parse(String(options?.body)) as Record<string, unknown>
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] })
    }
    expect((await handleAssist(request(), { fetcher, key: 'test-only-key' })).status).toBe(200)
    expect(sent).toMatchObject({ model: 'deepseek/deepseek-v4-flash-0731', max_tokens: 1024, provider: { only: ['deepinfra/fp8'], zdr: true, data_collection: 'deny', require_parameters: true, allow_fallbacks: false, max_price: { prompt: 0.06, completion: 0.18 } } })
    expect(sent).not.toHaveProperty('models')
  })

  it('tells the model how to classify independent work and scoped negation', async () => {
    let systemMessage = ''
    const fetcher = async (url: string | URL | Request, options?: RequestInit) => {
      if (String(url).endsWith('/key')) return Response.json({ data: { limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 0 } })
      const payload = JSON.parse(String(options?.body)) as { messages: Array<{ role: string; content: string }> }
      systemMessage = payload.messages.find(message => message.role === 'system')?.content ?? ''
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] })
    }
    expect((await handleAssist(request(), { fetcher, key: 'test-only-key' })).status).toBe(200)
    expect(systemMessage).toContain('confirmed_candidate means explicitly intended work')
    expect(systemMessage).toContain('tentative means possible or conditional work')
    expect(systemMessage).toContain('negated means the user explicitly excludes that same activity')
    expect(systemMessage).toContain('Negation in one clause does not reverse other activities')
    expect(systemMessage).toContain('An addition or extension is distinct from an additional dwelling')
  })

  it('does not accept a truncated completion', async () => {
    const fetcher = async (url: string | URL | Request) => String(url).endsWith('/key')
      ? Response.json({ data: { limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 0 } })
      : Response.json({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(output) } }] })
    const response = await handleAssist(request(), { fetcher, key: 'test-only-key' })
    expect(response.status).toBe(502)
  })
})
