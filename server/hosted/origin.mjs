export function trustedDeploymentOrigin(request, environment = process.env, requireOrigin = false) {
  const url = new URL(request.url)
  if (url.protocol !== 'https:' || url.port) return null
  const hosts = [environment.VERCEL_URL, environment.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(value => typeof value === 'string' && /^[a-z0-9.-]+$/i.test(value))
    .map(value => value.toLowerCase())
  if (!hosts.includes(url.hostname.toLowerCase())) return null
  const expected = `https://${url.hostname}`
  const supplied = request.headers.get('origin')
  if (requireOrigin && supplied !== expected || supplied !== null && supplied !== expected) return null
  return expected
}

export function originDenied() {
  return Response.json({ error: 'origin_denied' }, { status: 403, headers: { 'cache-control': 'no-store' } })
}
