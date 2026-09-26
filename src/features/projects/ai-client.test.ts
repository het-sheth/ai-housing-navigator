import { describe, expect, it } from 'vitest'
import { applySuggestions, requestSuggestions } from './ai-client'
import { createDraft } from './contracts'

const response = {
  schemaVersion: 1, operation: 'intake', draftId: 'draft-1', draftRevision: 3,
  suggestions: [{ activityId: 'repair_remodel', intent: 'confirmed_candidate', quote: 'Repair the house', reason: 'Repair is named.' }],
  question: null,
}

describe('AI suggestion client', () => {
  it('keeps a valid response tied to the submitted draft revision', async () => {
    const result = await requestSuggestions('Repair the house', 'draft-1', 3, async () => Response.json(response))
    expect(result.suggestions).toEqual(response.suggestions)
  })

  it('rejects a stale response before it can be applied', async () => {
    await expect(requestSuggestions('Repair the house', 'draft-1', 4, async () => Response.json(response))).rejects.toThrow('stale')
  })

  it('rejects an unrecognized work activity from the server', async () => {
    const wrong = { ...response, suggestions: [{ ...response.suggestions[0], activityId: 'fabricated_activity' }] }
    await expect(requestSuggestions('Repair the house', 'draft-1', 3, async () => Response.json(wrong))).rejects.toThrow('invalid')
  })

  it('surfaces a named unavailable state on a failed request', async () => {
    await expect(requestSuggestions('Repair the house', 'draft-1', 3, async () => Response.json({ error: 'budget_unverified' }, { status: 503 }))).rejects.toThrow('budget_unverified')
  })

  it('applies selected work without removing manual choices or adding negated work', () => {
    const draft = { ...createDraft(), activities: ['addition' as const], tentativeActivities: ['site_work' as const] }
    const suggestions = [
      { activityId: 'repair_remodel' as const, intent: 'confirmed_candidate' as const, quote: 'Repair', reason: 'Named' },
      { activityId: 'site_work' as const, intent: 'confirmed_candidate' as const, quote: 'site', reason: 'Named' },
      { activityId: 'additional_dwelling' as const, intent: 'negated' as const, quote: 'not a unit', reason: 'Excluded' },
    ]
    expect(applySuggestions(draft, suggestions, ['repair_remodel', 'site_work', 'additional_dwelling'])).toEqual({ activities: ['addition', 'repair_remodel'], tentativeActivities: ['site_work'] })
  })
})
