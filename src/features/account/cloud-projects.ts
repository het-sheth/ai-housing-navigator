import { getSupabase, type PublicConfig } from './session'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateCloudSnapshot, type SnapshotKind } from './snapshot'

export type CloudIdentity = { userId: string; token: string }
export type CloudSnapshot = { id: string; owner_id: string; kind: SnapshotKind; title: string; created_at: string }
export type CloudSnapshotWithData = CloudSnapshot & { data: unknown }

export async function captureCloudIdentity(expectedUserId: string, suppliedClient?: SupabaseClient): Promise<CloudIdentity> {
  const client = suppliedClient ?? await getSupabase()
  if (!client) throw new Error('Cloud projects are unavailable until account storage is connected.')
  const { data, error } = await client.auth.getSession()
  if (error || !data.session?.access_token || !data.session.user?.id) throw new Error('Sign in again before opening cloud projects.')
  if (data.session.user.id !== expectedUserId) throw new Error('The active account changed. Try again from the current account.')
  return { userId: expectedUserId, token: data.session.access_token }
}

function endpoint(config: PublicConfig): string {
  if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error('Cloud projects are unavailable until account storage is connected.')
  return `${config.supabaseUrl}/rest/v1/saved_projects`
}

function headers(identity: CloudIdentity, config: PublicConfig, representation = false): Record<string, string> {
  if (!identity.userId || !identity.token || !config.supabasePublishableKey) throw new Error('Sign in again before opening cloud projects.')
  return {
    apikey: config.supabasePublishableKey,
    Authorization: `Bearer ${identity.token}`,
    Accept: 'application/json',
    ...(representation ? { Prefer: 'return=representation', 'Content-Type': 'application/json' } : {}),
  }
}

async function rows(response: Response): Promise<unknown[]> {
  if (response.status === 401 || response.status === 403) throw new Error('Your session expired or access was denied. Sign in again.')
  if (!response.ok) throw new Error('Saved projects could not be reached. Your device work is unchanged.')
  let value: unknown
  try { value = await response.json() } catch { throw new Error('Saved projects returned an unreadable response.') }
  if (!Array.isArray(value)) throw new Error('Saved projects returned an invalid response.')
  return value
}

function metadata(value: unknown, identity: CloudIdentity): CloudSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Saved projects returned an invalid record.')
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id || row.owner_id !== identity.userId || !['walkthrough', 'comparison'].includes(String(row.kind)) || typeof row.title !== 'string' || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) throw new Error('Saved projects returned an invalid or foreign record.')
  return row as CloudSnapshot
}

export async function saveCloudSnapshot(identity: CloudIdentity, config: PublicConfig, kind: SnapshotKind, title: string, data: unknown, fetcher: typeof fetch = fetch): Promise<CloudSnapshot> {
  const snapshot = validateCloudSnapshot(kind, data)
  if (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > 262144) throw new Error('This snapshot is too large for cloud saving. Your device copy is unchanged.')
  const safeTitle = title.trim()
  if (!safeTitle || safeTitle.length > 160) throw new Error('Give this snapshot a title of 1 to 160 characters.')
  const response = await fetcher(endpoint(config), {
    method: 'POST',
    headers: headers(identity, config, true),
    body: JSON.stringify({ kind, title: safeTitle, data: snapshot }),
  })
  const saved = await rows(response)
  if (saved.length !== 1) throw new Error('Cloud save could not be confirmed. Check your saved projects before retrying.')
  return metadata(saved[0], identity)
}

export async function listCloudSnapshots(identity: CloudIdentity, config: PublicConfig, fetcher: typeof fetch = fetch, offset = 0): Promise<CloudSnapshot[]> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Saved project page is invalid.')
  const url = `${endpoint(config)}?select=id,owner_id,kind,title,created_at&owner_id=eq.${encodeURIComponent(identity.userId)}&order=created_at.desc,id.desc&limit=100&offset=${offset}`
  const response = await fetcher(url, { headers: headers(identity, config) })
  return (await rows(response)).map(row => metadata(row, identity))
}

export async function getCloudSnapshot(identity: CloudIdentity, config: PublicConfig, id: string, fetcher: typeof fetch = fetch): Promise<CloudSnapshotWithData> {
  const url = `${endpoint(config)}?select=id,owner_id,kind,title,created_at,data&id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(identity.userId)}&limit=1`
  const response = await fetcher(url, { headers: headers(identity, config) })
  const found = await rows(response)
  if (found.length !== 1) throw new Error('This saved project is unavailable. Your device work is unchanged.')
  const row = metadata(found[0], identity) as CloudSnapshotWithData
  row.data = validateCloudSnapshot(row.kind, (found[0] as Record<string, unknown>).data)
  return row
}

export async function deleteCloudSnapshot(identity: CloudIdentity, config: PublicConfig, id: string, fetcher: typeof fetch = fetch): Promise<void> {
  const url = `${endpoint(config)}?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(identity.userId)}`
  const response = await fetcher(url, { method: 'DELETE', headers: headers(identity, config, true) })
  const deleted = await rows(response)
  if (deleted.length !== 1 || metadata(deleted[0], identity).id !== id) throw new Error('Cloud deletion could not be confirmed.')
}
