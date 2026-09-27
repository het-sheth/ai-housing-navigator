import { handleProperty } from '../../server/property/live.mjs'
import { originDenied, trustedDeploymentOrigin } from '../../server/hosted/origin.mjs'

export default {
  fetch(request) {
    if (!trustedDeploymentOrigin(request)) return originDenied()
    return handleProperty(request)
  },
}
