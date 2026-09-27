import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AiAvailabilityNote } from './AiAvailabilityNote'

describe('AI entry explanations', () => {
  it('explains an empty description even with a valid session', () => {
    const html = renderToStaticMarkup(<AiAvailabilityNote id="ai-help" state="ready" hasDescription={false} />)
    expect(html).toContain('id="ai-help"')
    expect(html).toContain('Write a short description to enable')
    expect(html).not.toContain('Ready to suggest')
  })
  it('makes guest access discoverable without promising email delivery', () => {
    const html = renderToStaticMarkup(<AiAvailabilityNote state="signed_out" />)
    expect(html).toContain('try as a guest')
    expect(html).toContain('Your work stays open here')
  })
})
