import { getPublicConfig } from '../server/account/config.mjs'
import { originDenied, trustedDeploymentOrigin } from '../server/hosted/origin.mjs'

export default {
  fetch(request, { environment = process.env } = {}) {
    if (!trustedDeploymentOrigin(request, environment)) return originDenied()
    if (request.method !== 'GET') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { 'cache-control': 'no-store' } })
    return Response.json(getPublicConfig(environment), { headers: { 'cache-control': 'no-store' } })
  },
}
