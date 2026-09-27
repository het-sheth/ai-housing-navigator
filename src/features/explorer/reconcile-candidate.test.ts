import { describe, expect, it } from 'vitest'
import type { PropertyDetail } from '../projects/property-client'
import type { ExplorerCandidate } from './explorer-client'
import { reconcileCandidate } from './reconcile-candidate'

const candidate: ExplorerCandidate = {
  parcelId: '0000000000000001', address: '10 TEST ST', city: 'PITTSBURGH',
  municipality: '25th Ward - PITTSBURGH', zip: '15217', recordedUse: 'VACANT LAND',
  sourceDate: '2026-09-01', matched: 'Assessment recorded use: VACANT LAND',
}
const detail: PropertyDetail = {
  parcelId: candidate.parcelId,
  assessment: {
    status: 'available', sourceDate: '2026-09-10', retrievedAt: '2026-09-27T12:00:00.000Z',
    sourceUrl: 'https://example.test/assessment',
    record: { parcelId: candidate.parcelId, address: '12 TEST ST', city: 'PITTSBURGH',
      municipality: '25th Ward - PITTSBURGH', zip: '15217', classification: 'RESIDENTIAL',
      useDescription: 'SINGLE FAMILY', lotAreaSqFt: null, yearBuilt: null },
  },
  boundary: { status: 'unavailable', sourceDate: null, retrievedAt: '2026-09-27T12:00:00.000Z',
    sourceUrl: 'https://example.test/boundary', geometry: null, sourceCrs: 'EPSG:2272', displayCrs: 'EPSG:4326', modifiedOn: null },
}

describe('candidate and refreshed assessment reconciliation', () => {
  it('shows changed address, recorded use, and file date with both observations', () => {
    const result = reconcileCandidate(candidate, detail.assessment)
    expect(result.status).toBe('changed')
    expect(result.changes).toEqual([
      { field: 'Address', search: '10 TEST ST', refreshed: '12 TEST ST' },
      { field: 'Recorded use', search: 'VACANT LAND', refreshed: 'SINGLE FAMILY' },
      { field: 'Assessment file date', search: '2026-09-01', refreshed: '2026-09-10' },
    ])
  })

  it('does not invent a mismatch when refreshed assessment is missing', () => {
    const result = reconcileCandidate(candidate, { ...detail.assessment, status: 'unavailable', record: null, sourceDate: null })
    expect(result.status).toBe('unconfirmed')
    expect(result.changes).toEqual([])
  })

  it('leaves missing values unconfirmed and ignores case-only differences', () => {
    const result = reconcileCandidate(candidate, { ...detail.assessment, sourceDate: null, record: {
      ...detail.assessment.record!, address: '10 test st', useDescription: null,
    } })
    expect(result.status).toBe('unconfirmed')
    expect(result.changes).toEqual([])
    expect(result.missing).toContain('Recorded use')
    expect(result.missing).toContain('Assessment file date')
  })
})
