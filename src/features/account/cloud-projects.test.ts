import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraft } from '../projects/contracts'
import { createComparison } from '../comparison/comparison-model'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe('owned cloud snapshots', () => {
  it('sends a validated snapshot with the captured user token', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify([{ id: 'saved-1', owner_id: 'user-a', kind: 'walkthrough', title: 'Home', created_at: '2026-09-27T14:00:00Z' }]), { status: 201 })
    })
    const { saveCloudSnapshot } = await import('./cloud-projects')
    const saved = await saveCloudSnapshot({ userId: 'user-a', token: 'token-a' }, { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_test', aiEnabled: false }, 'walkthrough', 'Home', createDraft(), fetcher as typeof fetch)
    expect(saved.owner_id).toBe('user-a')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://example.supabase.co/rest/v1/saved_projects')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer token-a')
    expect(JSON.parse(String(calls[0].init.body)).owner_id).toBeUndefined()
  })

  it('rejects a foreign row even if a server response contains one', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([{ id: 'saved-2', owner_id: 'user-b', kind: 'walkthrough', title: 'Other', created_at: '2026-09-27T14:00:00Z' }]), { status: 200 }))
    const { listCloudSnapshots } = await import('./cloud-projects')
    await expect(listCloudSnapshots({ userId: 'user-a', token: 'token-a' }, { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_test', aiEnabled: false }, fetcher as typeof fetch)).rejects.toThrow(/saved projects/i)
  })

  it('rejects an invalid snapshot before making a request', async () => {
    const fetcher = vi.fn()
    const { saveCloudSnapshot } = await import('./cloud-projects')
    await expect(saveCloudSnapshot({ userId: 'user-a', token: 'token-a' }, { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_test', aiEnabled: false }, 'walkthrough', 'Home', { ...createDraft(), existingHomes: -1 }, fetcher as typeof fetch)).rejects.toThrow(/home counts/i)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects a session switched to a different user before saving', async () => {
    const client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'user-b' }, access_token: 'token-b' } }, error: null }) } }
    const { captureCloudIdentity } = await import('./cloud-projects')
    await expect(captureCloudIdentity('user-a', client as never)).rejects.toThrow(/account changed/i)
  })

  it('rejects a snapshot above the database payload limit before sending it', async () => {
    const fetcher = vi.fn()
    const comparison = createComparison('0046R00029000000')
    comparison.proposals.A.result = {
      status: 'pending', score: null, rubricVersion: 'test', parcelId: comparison.parcelId,
      proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' },
      municipality: 'Pittsburgh', checks: [], nextActions: ['x'.repeat(262145)],
      retrievedAt: '2026-09-27T14:00:00Z', caveat: 'Incomplete',
    }
    const { saveCloudSnapshot } = await import('./cloud-projects')
    await expect(saveCloudSnapshot({ userId: 'user-a', token: 'token-a' }, { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_test', aiEnabled: false }, 'comparison', 'Oversized', comparison, fetcher as typeof fetch)).rejects.toThrow(/too large/i)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('requests older snapshots after the first page', async () => {
    const urls: string[] = []
    const fetcher = vi.fn(async (url: string) => {
      urls.push(url)
      return new Response(JSON.stringify([{ id: 'older-1', owner_id: 'user-a', kind: 'walkthrough', title: 'Earlier', created_at: '2026-09-26T14:00:00Z' }]), { status: 200 })
    })
    const { listCloudSnapshots } = await import('./cloud-projects')
    const rows = await listCloudSnapshots({ userId: 'user-a', token: 'token-a' }, { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_test', aiEnabled: false }, fetcher as typeof fetch, 100)
    expect(rows.map(row => row.title)).toEqual(['Earlier'])
    expect(urls[0]).toContain('offset=100')
  })
})
