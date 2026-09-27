import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe('public auth configuration', () => {
  it('reports missing Supabase settings without creating an auth client', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false }), { status: 200 })))
    const { getPublicConfig, getSupabase, getAccessToken } = await import('./session')
    expect(await getPublicConfig()).toEqual({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false })
    expect(await getSupabase()).toBeNull()
    expect(await getAccessToken()).toBeNull()
  })

  it('rejects a privileged key in the public response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_secret_x', aiEnabled: false }), { status: 200 })))
    const { getPublicConfig } = await import('./session')
    await expect(getPublicConfig()).rejects.toThrow(/configuration/i)
  })

  it('retries a failed configuration request rather than caching failure', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false }), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    const { getPublicConfig } = await import('./session')
    await expect(getPublicConfig()).rejects.toThrow(/configuration/i)
    await expect(getPublicConfig()).resolves.toEqual({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
