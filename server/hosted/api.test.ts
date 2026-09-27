import { afterEach, describe, expect, it, vi } from 'vitest'
import search from '../../api/property/search.mjs'
import parcel from '../../api/property/parcel.mjs'
import candidates from '../../api/property/candidates.mjs'
import screening from '../../api/screening/run.mjs'
import assist from '../../api/assist.mjs'
import config from '../../api/config.mjs'
import { getPublicConfig } from '../account/config.mjs'
import sources from '../../api/sources.mjs'
import sourceQuery from '../../api/sources/query.mjs'

const origin = 'https://housing-preview.vercel.app'
const input = { parcelId: '0046R00029000000', proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' } }
const aiInput = { schemaVersion: 1, operation: 'intake', requestId: 'request-1', draftId: 'draft-1', draftRevision: 1, originalText: 'Repair the house.' }
const aiOutput = { schemaVersion: 1, operation: 'intake', draftId: 'draft-1', draftRevision: 1, suggestions: [{ activityId: 'repair_remodel', intent: 'confirmed_candidate', quote: 'Repair the house', reason: 'The user describes repair.' }], question: null }
const hostedEnvironment = { VERCEL_URL: 'housing-preview.vercel.app', SUPABASE_URL: 'https://housing.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testonly', SUPABASE_SECRET_KEY: 'sb_secret_testonly', OPENROUTER_API_KEY: 'test-only-key', AI_ENABLED: 'true' }

function aiRequest(authorization?: string, requestOrigin = origin) {
  return new Request(`${origin}/api/assist`, { method: 'POST', headers: { origin: requestOrigin, 'content-type': 'application/json', ...(authorization ? { authorization } : {}) }, body: JSON.stringify(aiInput) })
}

function serviceResponses({ validUser = true, reserved = true, rpcStatus = 200 } = {}) {
  const paths: string[] = []
  const calls: Array<{ path: string; options: RequestInit | undefined }> = []
  const fetcher = async (url: string | URL | Request, options?: RequestInit) => {
    const path = String(url)
    paths.push(path)
    calls.push({ path, options })
    if (path.endsWith('/auth/v1/user')) return validUser ? Response.json({ id: '00000000-0000-4000-8000-000000000001', role: 'authenticated' }) : Response.json({ error: 'invalid_token' }, { status: 401 })
    if (path.endsWith('/rest/v1/rpc/reserve_ai_request')) return Response.json(reserved, { status: rpcStatus })
    if (path.endsWith('/api/v1/key')) return Response.json({ data: { limit: 3, limit_reset: 'weekly', limit_remaining: 3, usage: 0 } })
    if (path.endsWith('/api/v1/chat/completions')) return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(aiOutput) } }], usage: { prompt_tokens: 100, completion_tokens: 50 } })
    throw Error(`Unexpected endpoint: ${path}`)
  }
  return { fetcher, paths, calls }
}

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
    const fetcher = () => { throw Error('Unexpected network request') }
    const response = await assist.fetch(new Request(`${origin}/api/assist`, { method: 'POST', headers: { origin } }), { environment: { VERCEL_URL: 'housing-preview.vercel.app' }, fetcher })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'ai_not_configured' })
  })

  it('publishes only validated public configuration on the deployed origin', async () => {
    const response = await config.fetch(new Request(`${origin}/api/config`), { environment: hostedEnvironment })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ supabaseUrl: 'https://housing.supabase.co', supabasePublishableKey: 'sb_publishable_testonly', aiEnabled: true })
    expect((await config.fetch(new Request('https://untrusted.test/api/config'), { environment: hostedEnvironment })).status).toBe(403)
    expect((await config.fetch(new Request(`${origin}/api/config`, { method: 'POST', headers: { origin } }), { environment: hostedEnvironment })).status).toBe(405)
  })

  it('hides privileged or malformed Supabase configuration', () => {
    expect(getPublicConfig({ ...hostedEnvironment, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_testonly' })).toEqual({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false })
    const serviceRole = ['header', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'signature'].join('.')
    expect(getPublicConfig({ ...hostedEnvironment, SUPABASE_PUBLISHABLE_KEY: serviceRole })).toEqual({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false })
    expect(getPublicConfig({ ...hostedEnvironment, SUPABASE_URL: 'http://housing.supabase.co' }).aiEnabled).toBe(false)
    expect(getPublicConfig({ ...hostedEnvironment, SUPABASE_SECRET_KEY: '' }).aiEnabled).toBe(false)
  })

  it('denies foreign origins and missing bearer tokens before contacting services', async () => {
    const { fetcher, paths } = serviceResponses()
    expect((await assist.fetch(aiRequest('Bearer signed-in-token', 'https://untrusted.test'), { environment: hostedEnvironment, fetcher })).status).toBe(403)
    expect((await assist.fetch(aiRequest(), { environment: hostedEnvironment, fetcher })).status).toBe(401)
    expect(paths).toEqual([])
  })

  it('rejects invalid Supabase tokens before reservation or model calls', async () => {
    const { fetcher, paths } = serviceResponses({ validUser: false })
    const response = await assist.fetch(aiRequest('Bearer invalid-token'), { environment: hostedEnvironment, fetcher })
    expect(response.status).toBe(401)
    expect(paths).toEqual(['https://housing.supabase.co/auth/v1/user'])
  })

  it('rejects malformed intake before reserving capacity', async () => {
    const { fetcher, paths } = serviceResponses()
    const request = new Request(`${origin}/api/assist`, { method: 'POST', headers: { origin, authorization: 'Bearer valid-token', 'content-type': 'application/json' }, body: JSON.stringify({ ...aiInput, parcelId: '0046R00029000000' }) })
    const response = await assist.fetch(request, { environment: hostedEnvironment, fetcher })
    expect(response.status).toBe(422)
    expect(paths).toEqual([])
  })

  it('does not spend when atomic reservation is denied or unavailable', async () => {
    const limited = serviceResponses({ reserved: false })
    expect((await assist.fetch(aiRequest('Bearer valid-token'), { environment: hostedEnvironment, fetcher: limited.fetcher })).status).toBe(429)
    expect(limited.paths).toEqual(['https://housing.supabase.co/auth/v1/user', 'https://housing.supabase.co/rest/v1/rpc/reserve_ai_request'])
    const failed = serviceResponses({ rpcStatus: 503 })
    expect((await assist.fetch(aiRequest('Bearer valid-token'), { environment: hostedEnvironment, fetcher: failed.fetcher })).status).toBe(503)
    expect(failed.paths).toEqual(limited.paths)
  })

  it('runs validated intake only after user verification and reservation', async () => {
    const { fetcher, paths, calls } = serviceResponses()
    const response = await assist.fetch(aiRequest('Bearer valid-token'), { environment: hostedEnvironment, fetcher })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(aiOutput)
    expect(paths).toEqual(['https://housing.supabase.co/auth/v1/user', 'https://housing.supabase.co/rest/v1/rpc/reserve_ai_request', 'https://openrouter.ai/api/v1/key', 'https://openrouter.ai/api/v1/chat/completions'])
    const reservation = calls[1].options
    expect(new Headers(reservation?.headers).get('apikey')).toBe('sb_secret_testonly')
    expect(new Headers(reservation?.headers).get('authorization')).toBeNull()
    expect(JSON.parse(String(reservation?.body))).toEqual({ p_user_id: '00000000-0000-4000-8000-000000000001' })
  })

  it('exposes the public source catalog through the hosted adapter', async () => {
    const response = await sources.fetch(new Request(`${origin}/api/sources`))
    expect(response.status).toBe(200)
    expect((await response.json()).catalogCount).toBe(60)
  })

  it('keeps hosted source detail queries on the trusted origin', async () => {
    vi.stubEnv('VERCEL_URL', 'housing-preview.vercel.app')
    const body = JSON.stringify({ catalogId: 2, context: {} })
    const accepted = await sourceQuery.fetch(new Request(`${origin}/api/sources/query`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body }))
    expect(accepted.status).toBe(200)
    expect((await accepted.json()).status).toBe('needs_input')
    expect((await sourceQuery.fetch(new Request(`${origin}/api/sources/query`, { method: 'POST', headers: { origin: 'https://untrusted.test', 'content-type': 'application/json' }, body }))).status).toBe(403)
  })
})
