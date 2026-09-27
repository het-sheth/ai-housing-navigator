import { handleScreening } from '../../server/screening/run.mjs'
import { originDenied, trustedDeploymentOrigin } from '../../server/hosted/origin.mjs'

export default {
  fetch(request) {
    const trustedOrigin = trustedDeploymentOrigin(request, undefined, true)
    if (!trustedOrigin) return originDenied()
    return handleScreening(request, { trustedOrigin })
  },
}
