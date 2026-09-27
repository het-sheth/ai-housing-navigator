import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { AppHeader } from '../../components/AppHeader'
import { captureCloudIdentity, deleteCloudSnapshot, getCloudSnapshot, listCloudSnapshots, type CloudSnapshot } from './cloud-projects'
import { getPublicConfig, getSupabase } from './session'
import { listDeviceComparisonBackups, restoreCloudSnapshot } from './snapshot'
import { accountTransition } from './account-auth'
import './account.css'

function callbackErrorPresent(): boolean {
  const query = new URLSearchParams(window.location.search)
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return query.has('error') || query.has('error_code') || fragment.has('error') || fragment.has('error_code')
}

function callbackPresent(): boolean {
  const query = new URLSearchParams(window.location.search)
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return query.has('code') || query.has('token_hash') || callbackErrorPresent() || fragment.has('access_token') || fragment.has('refresh_token')
}

export default function AccountPage() {
  const [client, setClient] = useState<SupabaseClient | null | undefined>(undefined)
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>([])
  const [listOwner, setListOwner] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [reload, setReload] = useState(0)
  const [actionId, setActionId] = useState('')
  const epoch = useRef(0)
  const activeUserId = useRef<string | null>(null)
  const restoreController = useRef<AbortController | null>(null)
  const backups = (() => { try { return listDeviceComparisonBackups() } catch { return [] } })()

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    const returning = callbackPresent()
    const callbackFailed = callbackErrorPresent()
    void getSupabase().then(next => {
      if (!active) return
      setClient(next)
      if (!next) {
        if (returning) {
          setError('That sign-in link could not be completed. Request a new link.')
          window.history.replaceState(window.history.state, '', '/account')
        }
        return
      }
      const { data: listener } = next.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return
        const transition = accountTransition({ userId: activeUserId.current, epoch: epoch.current }, nextSession?.user.id ?? null)
        activeUserId.current = transition.userId
        epoch.current = transition.epoch
        setSession(nextSession)
        if (transition.changed) { restoreController.current?.abort(); setSnapshots([]); setListOwner(''); setHasMore(false); setNextOffset(0); setActionId(''); setMoreLoading(false); setError('') }
      })
      unsubscribe = () => listener.subscription.unsubscribe()
      const initialEpoch = epoch.current
      void next.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return
        if (epoch.current === initialEpoch) { activeUserId.current = data.session?.user.id ?? null; setSession(data.session) }
        if (returning && (callbackFailed || sessionError || !data.session)) setError('That sign-in link could not be completed. Request a new link.')
        if (returning && data.session && !callbackFailed && !sessionError) setNotice('Signed in. Your saved projects are ready.')
      }).catch(() => { if (active) setError('Your session could not be recovered. Request a new sign-in link.') }).finally(() => {
        if (active && returning) window.history.replaceState(window.history.state, '', '/account')
      })
    }).catch(() => {
      if (active) {
        setClient(null)
        setError('Account service is unavailable right now. Your device work is still here.')
        if (returning) window.history.replaceState(window.history.state, '', '/account')
      }
    })
    return () => { active = false; epoch.current += 1; restoreController.current?.abort(); unsubscribe() }
  }, [])

  useEffect(() => {
    if (!client || !session?.user.id) return
    let active = true
    const owner = session.user.id
    const requestEpoch = epoch.current
    setSnapshots([])
    setListOwner('')
    setHasMore(false)
    setNextOffset(0)
    setListLoading(true)
    void captureCloudIdentity(owner, client).then(async identity => listCloudSnapshots(identity, await getPublicConfig())).then(rows => {
      if (active && epoch.current === requestEpoch) { setSnapshots(rows); setListOwner(owner); setHasMore(rows.length === 100); setNextOffset(rows.length); setError('') }
    }).catch(() => { if (active && epoch.current === requestEpoch) setError('Saved projects could not load. Retry from this account.') }).finally(() => {
      if (active && epoch.current === requestEpoch) setListLoading(false)
    })
    return () => { active = false }
  }, [client, session?.user.id, reload])

  async function loadOlder() {
    if (!client || !session || moreLoading || !hasMore) return
    const owner = session.user.id
    const requestEpoch = epoch.current
    const offset = nextOffset
    setMoreLoading(true)
    setError('')
    try {
      const identity = await captureCloudIdentity(owner, client)
      const rows = await listCloudSnapshots(identity, await getPublicConfig(), fetch, offset)
      if (epoch.current === requestEpoch) {
        setSnapshots(current => [...current, ...rows])
        setHasMore(rows.length === 100)
        setNextOffset(current => current + rows.length)
      }
    } catch { if (epoch.current === requestEpoch) setError('Older saved projects could not load. Retry from this account.') }
    finally { if (epoch.current === requestEpoch) setMoreLoading(false) }
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const { error: authError } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/account`, shouldCreateUser: true } })
      if (authError) throw authError
      setNotice('Check your email for a sign-in link. Open it in this browser to finish signing in.')
    } catch { setError('The sign-in link could not be sent. Check the address and try again.') }
    finally { setSending(false) }
  }

  async function signOut() {
    if (!client) return
    setError('')
    const { error: authError } = await client.auth.signOut()
    if (authError) { setError('Sign-out failed. Try again.'); return }
    const transition = accountTransition({ userId: activeUserId.current, epoch: epoch.current }, null)
    activeUserId.current = transition.userId
    epoch.current = transition.epoch
    restoreController.current?.abort()
    setSession(null)
    setSnapshots([])
    setListOwner('')
    setHasMore(false)
    setNextOffset(0)
    setActionId('')
    setMoreLoading(false)
    setNotice('Signed out. Device drafts remain on this browser.')
  }

  async function reopen(snapshot: CloudSnapshot) {
    if (!session || !client) return
    const requestEpoch = epoch.current
    const controller = new AbortController()
    restoreController.current?.abort()
    restoreController.current = controller
    setActionId(snapshot.id)
    setError('')
    try {
      const identity = await captureCloudIdentity(session.user.id, client)
      const full = await getCloudSnapshot(identity, await getPublicConfig(), snapshot.id)
      if (epoch.current !== requestEpoch) return
      const path = await restoreCloudSnapshot(full.kind, full.data, controller.signal)
      if (epoch.current === requestEpoch) window.location.assign(path)
    } catch (cause) {
      if (epoch.current === requestEpoch) setError(cause instanceof Error ? cause.message : 'This snapshot could not be opened. Your device work is unchanged.')
    } finally { if (restoreController.current === controller) restoreController.current = null; if (epoch.current === requestEpoch) setActionId('') }
  }

  async function remove(snapshot: CloudSnapshot) {
    if (!session || !client || !window.confirm(`Delete the saved snapshot "${snapshot.title}" from your account?`)) return
    const requestEpoch = epoch.current
    setActionId(snapshot.id)
    setError('')
    try {
      const identity = await captureCloudIdentity(session.user.id, client)
      if (epoch.current !== requestEpoch) return
      await deleteCloudSnapshot(identity, await getPublicConfig(), snapshot.id)
      if (epoch.current === requestEpoch) setSnapshots(current => current.filter(row => row.id !== snapshot.id))
    } catch { if (epoch.current === requestEpoch) setError('This snapshot could not be deleted. Retry from this account.') }
    finally { if (epoch.current === requestEpoch) setActionId('') }
  }

  return <div className="account-page"><AppHeader current="/account" /><main className="account-main">
    <div className="account-heading"><span className="gp-kicker">Your account</span><h1>Keep a copy you can reopen</h1><p>Sign in with an email link to save a snapshot of an assessment or comparison. Device drafts stay on this browser until you clear them.</p></div>
    {client === undefined ? <section className="account-card" role="status">Checking account availability...</section>
      : client === null ? <section className="account-card"><h2>Account saving is unavailable</h2><p>Cloud storage is not connected right now. You can keep working on this device and return when it is available.</p><a href="/projects/new">Return to your assessment</a></section>
        : session ? <section className="account-card" aria-label="Signed-in account"><div className="account-card-title"><div><span className="gp-kicker">Signed in</span><h2>{session.user.email ?? 'Your account'}</h2></div><button type="button" className="account-text-button" onClick={() => void signOut()}>Sign out</button></div><p>Saved snapshots belong to this account. Reopening a walkthrough archives the current device draft first.</p></section>
          : <section className="account-card"><h2>Sign in by email</h2><form onSubmit={event => void sendLink(event)}><label htmlFor="account-email">Email address</label><div className="account-email-row"><input id="account-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /><button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send sign-in link'}</button></div></form><p>New email addresses can create an account. The link returns to this account page.</p></section>}
    {notice && <p className="account-notice" role="status">{notice}</p>}
    {error && <p className="account-error" role="alert">{error}</p>}
    {session && client && <section className="account-card"><div className="account-card-title"><div><span className="gp-kicker">Cloud snapshots</span><h2>Saved projects</h2></div><button type="button" className="account-text-button" onClick={() => setReload(value => value + 1)}>Refresh list</button></div>{listLoading ? <p role="status">Loading your saved projects...</p> : listOwner === session.user.id && snapshots.length === 0 ? <p>No cloud snapshots yet. Use Save to account in an assessment or comparison.</p> : listOwner === session.user.id ? <><ul className="account-snapshot-list">{snapshots.map(snapshot => <li key={snapshot.id}><div><strong>{snapshot.title}</strong><span>{snapshot.kind === 'walkthrough' ? 'Property assessment' : 'Proposal comparison'} · {new Date(snapshot.created_at).toLocaleString()}</span></div><div className="account-item-actions"><button type="button" onClick={() => void reopen(snapshot)} disabled={Boolean(actionId)}>Open</button><button type="button" className="account-text-button" onClick={() => void remove(snapshot)} disabled={Boolean(actionId)}>Delete</button></div></li>)}</ul>{hasMore && <button type="button" className="account-load-more" disabled={moreLoading} onClick={() => void loadOlder()}>{moreLoading ? 'Loading older projects...' : 'Load older projects'}</button>}</> : null}</section>}
    {backups.length > 0 && <section className="account-card"><span className="gp-kicker">On this device</span><h2>Previous comparisons</h2><p>These copies were kept when a cloud comparison replaced a comparison for the same parcel.</p><ul className="account-snapshot-list">{backups.map(backup => <li key={backup.key}><strong>Parcel {backup.parcelId}</strong><button type="button" onClick={() => { void restoreCloudSnapshot('comparison', backup.saved).then(path => window.location.assign(path)).catch(() => setError('Device comparison could not be reopened. The copy is unchanged.')) }}>Open device copy</button></li>)}</ul></section>}
  </main></div>
}
