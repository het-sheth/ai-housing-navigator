import { describe, expect, it, vi } from 'vitest'
import { createDraft, type Draft } from './contracts'
import { hasCompleteScreen, requestScreening, type ScreeningResult } from './screening-client'

describe('screening request', () => {
  it('sends only confirmed proposal fields and preserves the parcel ID as text', async () => {
    const fetcher = vi.fn(async (_path: string | URL | Request, options?: RequestInit) => {
      expect(JSON.parse(String(options?.body))).toEqual({ parcelId: '0046R00029000000', proposal: { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'unknown' } })
      return new Response(JSON.stringify({ status: 'pending', score: null, parcelId: '0046R00029000000', proposal: { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' }))
    })
    const draft: Draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live', activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached' }
    const result = await requestScreening(draft, fetcher)
    expect(result.status).toBe('pending')
  })

  it('requires a confirmed live parcel before calling the source', async () => {
    const fetcher = vi.fn()
    await expect(requestScreening(createDraft(), fetcher)).rejects.toThrow(/confirmed live parcel/i)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects malformed source findings and a different parcel', async () => {
    const draft: Draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' }
    const base = { status: 'pending', score: null, parcelId: draft.parcelId, proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' }
    const malformed = vi.fn(async () => new Response(JSON.stringify({ ...base, checks: [{ id: 'flood', status: 'screened_low_friction' }] })))
    await expect(requestScreening(draft, malformed)).rejects.toThrow('screening_invalid_response')
    const mismatched = vi.fn(async () => new Response(JSON.stringify({ ...base, parcelId: 'different' })))
    await expect(requestScreening(draft, mismatched)).rejects.toThrow('screening_invalid_response')
    const wrongProposal = vi.fn(async () => new Response(JSON.stringify({ ...base, proposal: { ...base.proposal, housingForm: 'detached' } })))
    await expect(requestScreening(draft, wrongProposal)).rejects.toThrow('screening_invalid_response')
    const leakedPoints = vi.fn(async () => new Response(JSON.stringify({ ...base, checks: [{ id: 'flood', label: 'Flood', status: 'unknown', reason: 'Unknown', sourceUrl: null, sourceDate: null, retrievedAt: null, points: { lower: 0, upper: 12 } }] })))
    await expect(requestScreening(draft, leakedPoints)).rejects.toThrow('screening_invalid_response')
  })

  it('withholds a score for missing checks or an interval with uncertainty', () => {
    const result: ScreeningResult = { status: 'scored', score: { lower: 60, upper: 90 }, parcelId: '0046R00029000000', proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' }
    expect(hasCompleteScreen(result)).toBe(false)
  })
})
