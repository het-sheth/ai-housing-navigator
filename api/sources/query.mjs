import { handleSourceQuery } from '../../server/sources/query.mjs'
import { originDenied, trustedDeploymentOrigin } from '../../server/hosted/origin.mjs'

export default {
  fetch(request) {
    const trustedOrigin = trustedDeploymentOrigin(request, undefined, true)
    if (!trustedOrigin) return originDenied()
    return handleSourceQuery(request, { trustedOrigin })
  },
}
