import type { AiAvailability } from './useAiAvailability'

export function AiAvailabilityNote({ state }: { state: AiAvailability }) {
  if (state === 'ready') return <p className="gp-helper">AI suggests work activities from your description. It does not assess whether a property fits your proposal.</p>
  if (state === 'signed_out') return <p className="gp-helper"><a href="/account" target="_blank" rel="noreferrer">Sign in to use AI</a>. Your work stays open here. Manual activity selection and property search work without an account.</p>
  return <p className="gp-helper">{state === 'loading' ? 'Checking AI availability...' : 'AI is not connected right now. Select activities manually to continue.'}</p>
}
