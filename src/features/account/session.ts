import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type PublicConfig = { supabaseUrl: string | null; supabasePublishableKey: string | null; aiEnabled: boolean }
let configPromise: Promise<PublicConfig> | null = null
let clientPromise: Promise<SupabaseClient | null> | null = null

function validConfig(value: unknown): value is PublicConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Record<string, unknown>
  if (typeof config.aiEnabled !== 'boolean' || config.supabaseUrl !== null && typeof config.supabaseUrl !== 'string' || config.supabasePublishableKey !== null && typeof config.supabasePublishableKey !== 'string') return false
  if (typeof config.supabasePublishableKey === 'string' && (!config.supabasePublishableKey || config.supabasePublishableKey.startsWith('sb_secret_'))) return false
  if (typeof config.supabaseUrl === 'string') {
    try {
      const url = new URL(config.supabaseUrl)
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return false
    } catch { return false }
  }
  return true
}

export async function getPublicConfig(): Promise<PublicConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const response = await fetch('/api/config', { headers: { accept: 'application/json' }, credentials: 'same-origin' })
      if (!response.ok) throw new Error('Application configuration is unavailable. Try again later.')
      const value: unknown = await response.json()
      if (!validConfig(value)) throw new Error('Application configuration is invalid. Try again later.')
      return value
    })().catch(error => { configPromise = null; throw error })
  }
  return configPromise
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = getPublicConfig().then(config => config.supabaseUrl && config.supabasePublishableKey
      ? createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
      : null).catch(error => { clientPromise = null; throw error })
  }
  return clientPromise
}

export async function getAccessToken(): Promise<string | null> {
  const client = await getSupabase()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  return error ? null : data.session?.access_token ?? null
}
