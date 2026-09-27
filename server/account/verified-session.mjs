const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function bearerToken(request) {
  const match = /^Bearer ([A-Za-z0-9._~-]{1,4096})$/.exec(request.headers.get('authorization') ?? '')
  return match?.[1] ?? null
}

export async function verifySupabaseUser(token, config, fetcher = fetch) {
  try {
    const response = await fetcher(`${config.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: config.supabasePublishableKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    if (response.status === 401 || response.status === 403) return { status: 'invalid' }
    if (!response.ok) return { status: 'unavailable' }
    const user = await response.json()
    return user?.role === 'authenticated' && typeof user.id === 'string' && userIdPattern.test(user.id)
      ? { status: 'valid', userId: user.id }
      : { status: 'invalid' }
  } catch {
    return { status: 'unavailable' }
  }
}

export async function reserveAiRequest(userId, config, secretKey, fetcher = fetch) {
  if (!userIdPattern.test(userId) || !/^sb_secret_[A-Za-z0-9_-]{8,}$/.test(secretKey)) return 'unavailable'
  try {
    const response = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/reserve_ai_request`, {
      method: 'POST',
      headers: { apikey: secretKey, 'content-type': 'application/json' },
      body: JSON.stringify({ p_user_id: userId }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return 'unavailable'
    const value = await response.json()
    return value === true ? 'reserved' : value === false ? 'limited' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}
