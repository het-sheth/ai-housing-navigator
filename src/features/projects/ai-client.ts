import { ACTIVITIES, type ActivityId, type Draft } from './contracts'

export type IntakeSuggestion = { activityId: ActivityId; intent: 'confirmed_candidate' | 'tentative' | 'negated'; quote: string; reason: string }
export type IntakeResponse = { schemaVersion: 1; operation: 'intake'; draftId: string; draftRevision: number; suggestions: IntakeSuggestion[]; question: string | null }

function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
}

function validResponse(value: unknown, text: string, draftId: string, revision: number): value is IntakeResponse {
  if (!exactKeys(value, ['schemaVersion', 'operation', 'draftId', 'draftRevision', 'suggestions', 'question']) || value.schemaVersion !== 1 || value.operation !== 'intake' || value.draftId !== draftId || value.draftRevision !== revision) return false
  if (!Array.isArray(value.suggestions) || value.suggestions.length > 10 || !(value.question === null || typeof value.question === 'string' && value.question.length > 0 && value.question.length <= 300)) return false
  const seen = new Set<string>()
  for (const item of value.suggestions) {
    if (!exactKeys(item, ['activityId', 'intent', 'quote', 'reason']) || typeof item.activityId !== 'string' || !ACTIVITIES.some(activity => activity.id === item.activityId) || seen.has(item.activityId)) return false
    if (!['confirmed_candidate', 'tentative', 'negated'].includes(String(item.intent)) || typeof item.quote !== 'string' || !item.quote || item.quote.length > 200 || !text.includes(item.quote)) return false
    if (typeof item.reason !== 'string' || !item.reason || item.reason.length > 180) return false
    seen.add(item.activityId)
  }
  return true
}

export async function requestSuggestions(text: string, draftId: string, revision: number, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<IntakeResponse> {
  const response = await fetcher('/api/assist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ schemaVersion: 1, operation: 'intake', requestId: crypto.randomUUID(), draftId, draftRevision: revision, originalText: text }),
    signal,
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    throw new Error(exactKeys(body, ['error']) && typeof body.error === 'string' ? body.error : 'ai_unavailable')
  }
  const body: unknown = await response.json()
  if (exactKeys(body, ['schemaVersion', 'operation', 'draftId', 'draftRevision', 'suggestions', 'question']) && (body.draftId !== draftId || body.draftRevision !== revision)) throw new Error('stale_ai_response')
  if (!validResponse(body, text, draftId, revision)) throw new Error('invalid_ai_response')
  return body
}

export function applySuggestions(draft: Draft, suggestions: IntakeSuggestion[], selected: ActivityId[]): Pick<Draft, 'activities' | 'tentativeActivities'> {
  const activities = new Set(draft.activities)
  const tentative = new Set(draft.tentativeActivities)
  for (const suggestion of suggestions) {
    if (!selected.includes(suggestion.activityId) || suggestion.intent === 'negated') continue
    if (activities.has(suggestion.activityId) || tentative.has(suggestion.activityId)) continue
    if (suggestion.intent === 'confirmed_candidate') {
      activities.add(suggestion.activityId)
    } else tentative.add(suggestion.activityId)
  }
  return { activities: [...activities], tentativeActivities: [...tentative] }
}
