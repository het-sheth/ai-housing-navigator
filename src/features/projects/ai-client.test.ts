import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applySuggestions, requestSuggestions } from './ai-client'
import { createDraft } from './contracts'
import { getAccessToken, getPublicConfig, getSupabase } from '../account/session'
import { watchAiAvailability } from './useAiAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('../account/session', () => ({ getAccessToken: vi.fn(), getPublicConfig: vi.fn(), getSupabase: vi.fn() }))

beforeEach(() => { vi.mocked(getAccessToken).mockResolvedValue('test-user-token') })

const response = {
  schemaVersion: 1, operation: 'intake', draftId: 'draft-1', draftRevision: 3,
  suggestions: [{ activityId: 'repair_remodel', intent: 'confirmed_candidate', quote: 'Repair the house', reason: 'Repair is named.' }],
  question: null,
}

describe('AI suggestion client', () => {
  it('sends the active Supabase bearer with an intake request', async () => {
    let authorization = ''
    await requestSuggestions('Repair the house', 'draft-1', 3, async (_url, options) => {
      authorization = new Headers(options?.headers).get('authorization') ?? ''
      return Response.json(response)
    })
    expect(authorization).toBe('Bearer test-user-token')
  })

  it('does not send intake when the user has no session', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null)
    const fetcher = vi.fn(async () => Response.json(response))
    await expect(requestSuggestions('Repair the house', 'draft-1', 3, fetcher)).rejects.toThrow('authentication_required')
    expect(fetcher).not.toHaveBeenCalled()
  })

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

describe('AI availability', () => {
  it('reports unavailable when hosted AI is disabled without opening auth', async () => {
    vi.mocked(getPublicConfig).mockResolvedValue({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false })
    const states: string[] = []
    const stop = watchAiAvailability(state => states.push(state))
    await vi.waitFor(() => expect(states).toEqual(['loading', 'unavailable']))
    expect(getSupabase).not.toHaveBeenCalled()
    stop()
  })

  it('tracks sign-out and ignores auth events after cleanup', async () => {
    vi.mocked(getPublicConfig).mockResolvedValue({ supabaseUrl: 'https://housing.supabase.co', supabasePublishableKey: 'sb_publishable_testonly', aiEnabled: true })
    let authChanged: ((event: string, session: unknown) => void) = () => {}
    const unsubscribe = vi.fn()
    vi.mocked(getSupabase).mockResolvedValue({ auth: {
      onAuthStateChange(callback: (event: string, session: unknown) => void) { authChanged = callback; return { data: { subscription: { unsubscribe } } } },
      async getSession() { return { data: { session: { access_token: 'test-user-token' } }, error: null } },
    } } as unknown as SupabaseClient)
    const states: string[] = []
    const stop = watchAiAvailability(state => states.push(state))
    await vi.waitFor(() => expect(states.at(-1)).toBe('ready'))
    authChanged('SIGNED_OUT', null)
    expect(states.at(-1)).toBe('signed_out')
    stop()
    authChanged('SIGNED_IN', { access_token: 'late-token' })
    expect(states.at(-1)).toBe('signed_out')
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
