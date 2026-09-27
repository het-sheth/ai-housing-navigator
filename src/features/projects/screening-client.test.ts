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
    const malformedObservation = vi.fn(async () => new Response(JSON.stringify({ ...base, sourceObservations: [{ id: 'mapped-undermining', status: 'mapped_flag', count: -1 }] })))
    await expect(requestScreening(draft, malformedObservation)).rejects.toThrow('screening_invalid_response')
    const wrongEmptyCount = vi.fn(async () => new Response(JSON.stringify({ ...base, sourceObservations: [{ id: 'pli-permits', status: 'empty', coverage: 'exact_parcel_record_search', sourceUrl: 'https://example.org', sourceDate: null, retrievedAt: base.retrievedAt, count: 12, summary: 'Empty' }] })))
    await expect(requestScreening(draft, wrongEmptyCount)).rejects.toThrow('screening_invalid_response')
    const leakedObservationPoints = vi.fn(async () => new Response(JSON.stringify({ ...base, sourceObservations: [{ id: 'mapped-undermining', status: 'mapped_flag', coverage: 'mapped_intersection_only', sourceUrl: 'https://example.org', sourceDate: null, retrievedAt: base.retrievedAt, count: 1, summary: 'Flag', points: 8 }] })))
    await expect(requestScreening(draft, leakedObservationPoints)).rejects.toThrow('screening_invalid_response')
  })

  it('accepts bounded supplemental observations without treating them as rubric checks', async () => {
    const draft: Draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' }
    const observation = { id: 'mapped-undermining', status: 'mapped_flag', coverage: 'mapped_intersection_only', sourceUrl: 'https://example.org/layer', sourceDate: null, retrievedAt: '2026-09-26T20:00:00Z', count: 1, summary: 'Mapped feature intersects the parcel.' }
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: 'pending', score: null, parcelId: draft.parcelId, proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], sourceObservations: [observation], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' })))
    const result = await requestScreening(draft, fetcher)
    expect(result.sourceObservations).toEqual([observation])
    expect(hasCompleteScreen(result)).toBe(false)
  })

  it('accepts a narrow metric score while the overall assessment is pending', async () => {
    const draft: Draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' }
    const check = { id: 'flood', label: 'FEMA mapped flood zone', status: 'screened_low_friction', reason: 'Whole parcel covered.', sourceUrl: 'https://hazards.fema.gov/layer', sourceDate: null, retrievedAt: '2026-09-26T20:00:00Z', metricScore: { value: 2, max: 2, scope: 'Whole parcel minimal-hazard X zone', rule: 'FEMA minimal-hazard X coverage' } }
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: 'pending', score: null, parcelId: draft.parcelId, proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [check], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' })))
    expect((await requestScreening(draft, fetcher)).checks[0].metricScore).toEqual(check.metricScore)
  })

  it('rejects malformed or unsupported metric scores', async () => {
    const draft: Draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' }
    const base = { status: 'pending', score: null, parcelId: draft.parcelId, proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' }
    const check = { id: 'flood', label: 'Flood', status: 'screened_low_friction', reason: 'Mapped', sourceUrl: 'https://hazards.fema.gov/layer', sourceDate: null, retrievedAt: base.retrievedAt }
    const invalid = [
      { ...check, metricScore: { value: 1, max: 2, scope: 'Parcel', rule: 'Rule' } },
      { ...check, metricScore: { value: 2, max: 100, scope: 'Parcel', rule: 'Rule' } },
      { ...check, metricScore: { value: 2, max: 2, scope: '', rule: 'Rule' } },
      { ...check, metricScore: { value: 2, max: 2, scope: 'Parcel', rule: 'Rule', extra: true } },
      { ...check, status: 'unknown', metricScore: { value: 2, max: 2, scope: 'Parcel', rule: 'Rule' } },
      { ...check, id: 'slope', metricScore: { value: 2, max: 2, scope: 'Parcel', rule: 'Rule' } },
      { ...check, id: 'zoning-use', status: 'mapped_flag', metricScore: { value: 0, max: 2, scope: 'Parcel', rule: 'Rule' } },
    ]
    for (const item of invalid) {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({ ...base, checks: [item] })))
      await expect(requestScreening(draft, fetcher)).rejects.toThrow('screening_invalid_response')
    }
  })

  it('accepts no and unknown map flags as incomplete source observations', async () => {
    const draft: Draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' }
    const base = { id: 'mapped-undermining', coverage: 'mapped_intersection_only', sourceUrl: 'https://example.org/layer', sourceDate: null, retrievedAt: '2026-09-26T20:00:00Z', count: 1, summary: 'Review the mapped condition.' }
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: 'pending', score: null, parcelId: draft.parcelId, proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], sourceObservations: [{ ...base, status: 'mapped_no_flag' }, { ...base, id: 'mapped-landslide', status: 'unknown' }], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' })))
    const result = await requestScreening(draft, fetcher)
    expect(result.sourceObservations?.map(item => item.status)).toEqual(['mapped_no_flag', 'unknown'])
  })

  it('withholds a score for missing checks or an interval with uncertainty', () => {
    const result: ScreeningResult = { status: 'scored', score: { lower: 60, upper: 90 }, parcelId: '0046R00029000000', proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], nextActions: [], rubricVersion: 'test', retrievedAt: '2026-09-26T20:00:00Z', caveat: '' }
    expect(hasCompleteScreen(result)).toBe(false)
  })
})
