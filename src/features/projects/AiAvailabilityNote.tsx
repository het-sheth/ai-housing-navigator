import type { AiAvailability } from './useAiAvailability'

export function AiAvailabilityNote({ state, id, hasDescription = true }: { state: AiAvailability; id?: string; hasDescription?: boolean }) {
  if (state === 'ready') return <p id={id} className="gp-helper">{hasDescription ? 'Ready to suggest activities. Click the button, then review and apply the suggestions. AI does not check property suitability.' : 'Write a short description to enable AI suggestions, for example: Build a six-story apartment building. You can also choose activities yourself.'}</p>
  if (state === 'signed_out') return <p id={id} className="gp-helper"><a href="/account" target="_blank" rel="noreferrer">Sign in or try as a guest to use AI</a>. Your work stays open here. Manual activity selection and property search work without an account.</p>
  return <p id={id} className="gp-helper">{state === 'loading' ? 'Checking your session and AI availability...' : 'AI availability could not be confirmed. Check your connection and Account session, then reload to retry. Your saved draft and manual choices remain available.'}</p>
}
