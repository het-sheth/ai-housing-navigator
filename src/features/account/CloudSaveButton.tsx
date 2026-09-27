import { useEffect, useRef, useState } from 'react'
import { captureCloudIdentity, saveCloudSnapshot } from './cloud-projects'
import { getPublicConfig, getSupabase } from './session'
import { validateCloudSnapshot, type SnapshotKind } from './snapshot'
import { accountTransition } from './account-auth'
import './account.css'

export function CloudSaveButton({ kind, title, data }: { kind: SnapshotKind; title: string; data: unknown }) {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const epoch = useRef(0)
  const activeUserId = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    void getSupabase().then(client => {
      if (!active) return
      setAvailable(Boolean(client))
      if (!client) return
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        const transition = accountTransition({ userId: activeUserId.current, epoch: epoch.current }, session?.user.id ?? null)
        activeUserId.current = transition.userId
        epoch.current = transition.epoch
        setAccountId(session?.user.id ?? null)
        if (transition.changed) { setMessage(''); setBusy(false) }
      })
      unsubscribe = () => listener.subscription.unsubscribe()
      const initialEpoch = epoch.current
      void client.auth.getSession().then(({ data: result }) => {
        if (active && epoch.current === initialEpoch) { activeUserId.current = result.session?.user.id ?? null; setAccountId(result.session?.user.id ?? null) }
      }).catch(() => { if (active) setAccountId(null) })
    }).catch(() => { if (active) { setAvailable(false); setMessage('Cloud saving is unavailable right now.') } })
    return () => { active = false; epoch.current += 1; unsubscribe() }
  }, [])

  async function save() {
    const expectedId = accountId
    if (!expectedId) return
    const requestEpoch = epoch.current
    setBusy(true)
    setMessage('')
    try {
      const snapshot = validateCloudSnapshot(kind, data)
      const identity = await captureCloudIdentity(expectedId)
      const config = await getPublicConfig()
      if (epoch.current !== requestEpoch) return
      await saveCloudSnapshot(identity, config, kind, title.trim().slice(0, 160) || (kind === 'walkthrough' ? 'Untitled property assessment' : 'Untitled proposal comparison'), snapshot)
      if (epoch.current === requestEpoch) setMessage('Saved to your account. Your device copy is still here.')
    } catch (error) {
      if (epoch.current === requestEpoch) setMessage(error instanceof Error ? error.message : 'Cloud save failed. Your device copy is still here.')
    } finally { if (epoch.current === requestEpoch) setBusy(false) }
  }

  return <div className="cloud-save-control">
    {available === null ? <span role="status">Checking cloud saving...</span>
      : !available ? <span role="status">Cloud saving unavailable.</span>
        : accountId ? <button type="button" className="gp-secondary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving to account...' : 'Save to account'}</button>
          : <a href="/account">Sign in to save to your account</a>}
    {message && <span role="status" className="cloud-save-message">{message}</span>}
  </div>
}
