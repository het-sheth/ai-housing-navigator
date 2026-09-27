import { originDenied, trustedDeploymentOrigin } from '../server/hosted/origin.mjs'

export default {
  fetch(request) {
    if (!trustedDeploymentOrigin(request, undefined, request.method === 'POST')) return originDenied()
    return Response.json({ error: request.method === 'POST' ? 'ai_not_configured' : 'method_not_allowed' }, { status: request.method === 'POST' ? 503 : 405, headers: { 'cache-control': 'no-store' } })
  },
}
