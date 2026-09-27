import { handleCandidates } from '../../server/property/candidates.mjs'
import { originDenied, trustedDeploymentOrigin } from '../../server/hosted/origin.mjs'

export default {
  fetch(request) {
    if (!trustedDeploymentOrigin(request)) return originDenied()
    return handleCandidates(request)
  },
}
