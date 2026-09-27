import { describe, expect, it } from 'vitest'
import { hasConfirmedParcel, type PropertyDetail } from './property-client'

const parcelId = '0000000000000042'
const observation = { status: 'unavailable' as const, sourceDate: null, retrievedAt: '2026-09-27T18:00:00Z', sourceUrl: 'https://example.com/source' }
const detail: PropertyDetail = { parcelId, assessment: { ...observation, record: null }, boundary: { ...observation, geometry: null, sourceCrs: 'EPSG:4326', displayCrs: 'EPSG:4326', modifiedOn: null } }

describe('parcel confirmation evidence', () => {
  it('does not confirm identity from an echoed ID when both sources fail', () => {
    expect(hasConfirmedParcel(detail, parcelId)).toBe(false)
    expect(hasConfirmedParcel({ ...detail, assessment: { ...detail.assessment, status: 'error' }, boundary: { ...detail.boundary, status: 'error' } }, parcelId)).toBe(false)
  })
  it('requires actual matching source data, not an available label alone', () => {
    expect(hasConfirmedParcel({ ...detail, assessment: { ...detail.assessment, status: 'available' } }, parcelId)).toBe(false)
    const available: PropertyDetail = { ...detail, boundary: { ...detail.boundary, status: 'available', geometry: { type: 'Polygon', coordinates: [[[-80,40],[-79.9,40],[-80,40.1],[-80,40]]] } } }
    expect(hasConfirmedParcel(available, parcelId)).toBe(true)
    expect(hasConfirmedParcel(available, '0000000000000043')).toBe(false)
  })
})
