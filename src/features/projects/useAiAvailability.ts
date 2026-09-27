import { useEffect, useState } from 'react'
import { getPublicConfig, getSupabase } from '../account/session'

export type AiAvailability = 'loading' | 'unavailable' | 'signed_out' | 'ready'

export function watchAiAvailability(onChange: (state: AiAvailability) => void): () => void {
  let active = true
  let revision = 0
  let unsubscribe: (() => void) | null = null
  onChange('loading')

  async function start() {
    try {
      const config = await getPublicConfig()
      if (!active) return
      if (!config.aiEnabled) {
        onChange('unavailable')
        return
      }
      const client = await getSupabase()
      if (!active) return
      if (!client) {
        onChange('unavailable')
        return
      }
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        revision += 1
        onChange(session ? 'ready' : 'signed_out')
      })
      unsubscribe = () => subscription.unsubscribe()
      const pendingRevision = revision
      const { data, error } = await client.auth.getSession()
      if (!active || revision !== pendingRevision) return
      onChange(error ? 'unavailable' : data.session ? 'ready' : 'signed_out')
    } catch {
      if (active) onChange('unavailable')
    }
  }

  void start()
  return () => {
    active = false
    unsubscribe?.()
  }
}

export function useAiAvailability(): AiAvailability {
  const [state, setState] = useState<AiAvailability>('loading')
  useEffect(() => watchAiAvailability(setState), [])
  return state
}
