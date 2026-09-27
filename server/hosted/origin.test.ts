import { describe, expect, it } from 'vitest'
import { trustedDeploymentOrigin } from './origin.mjs'

const environment = { VERCEL_URL: 'housing-preview.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'housing.example.org' }

describe('hosted request origin', () => {
  it('accepts exact preview and production hosts', () => {
    expect(trustedDeploymentOrigin(new Request('https://housing-preview.vercel.app/api/property/search'), environment)).toBe('https://housing-preview.vercel.app')
    expect(trustedDeploymentOrigin(new Request('https://housing.example.org/api/property/search'), environment)).toBe('https://housing.example.org')
  })

  it('rejects forged hosts, insecure schemes, and cross-origin requests', () => {
    expect(trustedDeploymentOrigin(new Request('https://housing-preview.vercel.app.attacker.test/api/property/search'), environment)).toBeNull()
    expect(trustedDeploymentOrigin(new Request('http://housing-preview.vercel.app/api/property/search'), environment)).toBeNull()
    expect(trustedDeploymentOrigin(new Request('https://housing-preview.vercel.app/api/property/search', { headers: { origin: 'https://attacker.test' } }), environment)).toBeNull()
    expect(trustedDeploymentOrigin(new Request('https://housing-preview.vercel.app/api/screening/run'), environment, true)).toBeNull()
    expect(trustedDeploymentOrigin(new Request('https://housing-preview.vercel.app/api/screening/run', { headers: { origin: 'https://housing-preview.vercel.app' } }), environment, true)).toBe('https://housing-preview.vercel.app')
  })
})
