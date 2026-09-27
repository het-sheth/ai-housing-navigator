import { getPublicConfig } from '../server/account/config.mjs'
import { bearerToken, reserveAiRequest, verifySupabaseUser } from '../server/account/verified-session.mjs'
import { handleAssist, validateAssistRequest } from '../server/ai/intake.mjs'
import { originDenied, trustedDeploymentOrigin } from '../server/hosted/origin.mjs'

function error(status, code) {
  return Response.json({ error: code }, { status, headers: { 'cache-control': 'no-store' } })
}

export default {
  async fetch(request, { environment = process.env, fetcher = fetch } = {}) {
    const trustedOrigin = trustedDeploymentOrigin(request, environment, request.method === 'POST')
    if (!trustedOrigin) return originDenied()
    if (request.method !== 'POST') return error(405, 'method_not_allowed')
    const config = getPublicConfig(environment)
    if (!config.aiEnabled) return error(503, 'ai_not_configured')
    const invalidInput = await validateAssistRequest(request.clone(), trustedOrigin)
    if (invalidInput) return invalidInput
    const token = bearerToken(request)
    if (!token) return error(401, 'authentication_required')
    const verification = await verifySupabaseUser(token, config, fetcher)
    if (verification.status === 'invalid') return error(401, 'authentication_required')
    if (verification.status !== 'valid') return error(503, 'auth_unavailable')
    const reservation = await reserveAiRequest(verification.userId, config, environment.SUPABASE_SECRET_KEY, fetcher)
    if (reservation === 'limited') return error(429, 'ai_limit_reached')
    if (reservation !== 'reserved') return error(503, 'reservation_unavailable')
    return handleAssist(request, { fetcher, key: environment.OPENROUTER_API_KEY, trustedOrigin })
  },
}
