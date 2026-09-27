import { afterEach, describe, expect, it, vi } from 'vitest'
import search from '../../api/property/search.mjs'
import parcel from '../../api/property/parcel.mjs'
import candidates from '../../api/property/candidates.mjs'
import screening from '../../api/screening/run.mjs'
import assist from '../../api/assist.mjs'

const origin = 'https://housing-preview.vercel.app'
const input = { parcelId: '0046R00029000000', proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' } }

afterEach(() => vi.unstubAllEnvs())

describe('hosted API functions', () => {
  it('routes public property requests without changing their validation', async () => {
    vi.stubEnv('VERCEL_URL', 'housing-preview.vercel.app')
    expect((await search.fetch(new Request(`${origin}/api/property/search`))).status).toBe(400)
    expect((await parcel.fetch(new Request(`${origin}/api/property/parcel`, { method: 'POST' }))).status).toBe(405)
    expect((await search.fetch(new Request('https://untrusted.test/api/property/search'))).status).toBe(403)
    expect((await candidates.fetch(new Request(`${origin}/api/property/candidates?use=other`))).status).toBe(400)
    expect((await candidates.fetch(new Request('https://untrusted.test/api/property/candidates?use=vacant_land'))).status).toBe(403)
  })

  it('runs a same-origin preliminary screen and rejects cross-origin posts', async () => {
    vi.stubEnv('VERCEL_URL', 'housing-preview.vercel.app')
    const request = new Request(`${origin}/api/screening/run`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const response = await screening.fetch(request)
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.status).toBe('pending')
    expect(result.score).toBeNull()
    expect((await screening.fetch(new Request(`${origin}/api/screening/run`, { method: 'POST', headers: { origin: 'https://untrusted.test', 'content-type': 'application/json' }, body: JSON.stringify(input) }))).status).toBe(403)
  })

  it('keeps hosted AI unavailable without contacting a provider', async () => {
    vi.stubEnv('VERCEL_URL', 'housing-preview.vercel.app')
    const response = await assist.fetch(new Request(`${origin}/api/assist`, { method: 'POST', headers: { origin } }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'ai_not_configured' })
  })
})
