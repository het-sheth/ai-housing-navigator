import { describe, expect, it, vi } from 'vitest'
import { searchCandidates } from './explorer-client'

const result = {
  status: 'candidates', candidates: [{ parcelId: '0046R00029000000', address: '2003 MOUNTFORD AVE', city: 'PITTSBURGH', municipality: '14th Ward - PITTSBURGH', zip: '15217', recordedUse: 'SINGLE FAMILY', sourceDate: '2026-09-01', matched: 'Assessment recorded use: SINGLE FAMILY' }],
  truncated: false, retrievedAt: '2026-09-27T12:00:00.000Z', sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', sourceDate: '2026-09-01', coverage: 'Pittsburgh-labeled assessment records', unknowns: ['Confirmed City jurisdiction', 'Proposal suitability'],
}

describe('Explorer candidate client', () => {
  it('requests the fixed search criterion and preserves string parcel IDs', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toContain('/api/property/candidates')
      return new Response(JSON.stringify(result))
    })
    const response = await searchCandidates({ recordedUse: 'single_family', zip: '' }, undefined, fetcher)
    expect(fetcher.mock.calls[0][0]).toBe('/api/property/candidates?use=single_family')
    expect(response.candidates[0].parcelId).toBe('0046R00029000000')
  })

  it('rejects an invalid source response rather than rendering matches', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ...result, candidates: [{ ...result.candidates[0], parcelId: 46 }] })))
    await expect(searchCandidates({ recordedUse: 'single_family', zip: '' }, undefined, fetcher)).rejects.toThrow('invalid_candidate_response')
  })

  it('throws on source failure so the confirmed criteria can stay visible', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 502 }))
    await expect(searchCandidates({ recordedUse: 'vacant_land', zip: '' }, undefined, fetcher)).rejects.toThrow('candidate_search_unavailable')
  })
})
