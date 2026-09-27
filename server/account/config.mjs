function publicKey(value) {
  if (typeof value !== 'string' || value.length > 4096) return false
  if (/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(value)) return true
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return false
  try {
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8')).role === 'anon'
  } catch {
    return false
  }
}

function serverKey(value) {
  return typeof value === 'string' && /^sb_secret_[A-Za-z0-9_-]{8,}$/.test(value)
}

function projectUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url.origin
  } catch {
    return null
  }
}

export function getPublicConfig(environment = process.env) {
  const supabaseUrl = projectUrl(environment.SUPABASE_URL)
  const supabasePublishableKey = publicKey(environment.SUPABASE_PUBLISHABLE_KEY) ? environment.SUPABASE_PUBLISHABLE_KEY : null
  if (!supabaseUrl || !supabasePublishableKey) return { supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false }
  return {
    supabaseUrl,
    supabasePublishableKey,
    aiEnabled: environment.AI_ENABLED === 'true' && serverKey(environment.SUPABASE_SECRET_KEY) && typeof environment.OPENROUTER_API_KEY === 'string' && environment.OPENROUTER_API_KEY.trim().length > 0,
  }
}
