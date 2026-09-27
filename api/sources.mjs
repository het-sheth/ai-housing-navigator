import { handleSources } from '../server/sources/registry.mjs'

export default {
  fetch(request) {
    return handleSources(request)
  },
}
