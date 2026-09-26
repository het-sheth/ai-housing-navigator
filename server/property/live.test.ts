import { describe, expect, it, vi } from 'vitest'
import { handleProperty } from './live.mjs'

const record = { PARID: '0046R00029000000', PROPERTYHOUSENUM: '2003', PROPERTYADDRESS: 'MOUNTFORD AVE', PROPERTYCITY: 'PITTSBURGH', MUNIDESC: 'Pittsburgh', CLASSDESC: 'RESIDENTIAL', USEDESC: 'SINGLE FAMILY', LOTAREA: '1620', ASOFDATE: '2026-09-01' }
const success = (records: unknown[], total = records.length) => new Response(JSON.stringify({ success: true, result: { records, total } }))

describe('live property lookup', () => {
  it('returns address candidates without selecting the first and discloses truncation', async () => {
    const fetcher = vi.fn(async () => success([record, { ...record, PARID: '0000000000000001' }], 22))
    const response = await handleProperty(new Request('http://localhost/api/property/search?q=2003%20Mountford%20Ave'), { fetcher, now: () => '2026-09-26T20:00:00.000Z' })
    const body = await response.json()
    expect(body.status).toBe('candidates')
    expect(body.candidates.map((candidate: { parcelId: string }) => candidate.parcelId)).toEqual(['0046R00029000000', '0000000000000001'])
    expect(body.truncated).toBe(true)
    expect(body.selected).toBeUndefined()
  })

  it('preserves the exact parcel ID and returns independent assessment and boundary states', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (url.hostname === 'data.wprdc.org') return success([record])
      return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }))
    })
    const response = await handleProperty(new Request('http://localhost/api/property/parcel?pin=0046R00029000000'), { fetcher, now: () => '2026-09-26T20:00:00.000Z' })
    const body = await response.json()
    expect(body.parcelId).toBe('0046R00029000000')
    expect(body.assessment.status).toBe('available')
    expect(body.assessment.sourceDate).toBe('2026-09-01')
    expect(body.boundary.status).toBe('unavailable')
  })

  it('rejects a mismatched parcel row instead of substituting it', async () => {
    const fetcher = vi.fn(async () => success([{ ...record, PARID: '9999' }]))
    const response = await handleProperty(new Request('http://localhost/api/property/parcel?pin=0046R00029000000'), { fetcher })
    const body = await response.json()
    expect(body.assessment.status).toBe('error')
  })

  it('uses only exact County GeoJSON geometry and keeps its vintage unknown', async () => {
    const coordinates = [[[-80.0075, 40.4638], [-80.0076, 40.4638], [-80.0076, 40.4639], [-80.0075, 40.4638]]]
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (url.hostname === 'data.wprdc.org') return success([record])
      expect(url.searchParams.get('outSR')).toBe('4326')
      expect(url.searchParams.get('where')).toBe("PIN='0046R00029000000'")
      return new Response(JSON.stringify({ type: 'FeatureCollection', features: [{ properties: { PIN: '0046R00029000000', MODIFIEDON: '4/20/2005' }, geometry: { type: 'Polygon', coordinates } }] }))
    })
    const body = await (await handleProperty(new Request('http://localhost/api/property/parcel?pin=0046R00029000000'), { fetcher })).json()
    expect(body.boundary.status).toBe('available')
    expect(body.boundary.geometry.coordinates).toEqual(coordinates)
    expect(body.boundary.sourceDate).toBeNull()
    expect(body.boundary.modifiedOn).toBe('4/20/2005')
  })

  it('rejects a source row that does not match the requested address', async () => {
    const fetcher = vi.fn(async () => success([{ ...record, PROPERTYADDRESS: 'LANARK ST' }]))
    const body = await (await handleProperty(new Request('http://localhost/api/property/search?q=2003%20MOUNTFORD%20AVE'), { fetcher })).json()
    expect(body.status).toBe('error')
  })

  it('leaves an invalid assessment file date unknown', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => new URL(String(input)).hostname === 'data.wprdc.org' ? success([{ ...record, ASOFDATE: '2026-02-30' }]) : new Response(JSON.stringify({ type: 'FeatureCollection', features: [] })))
    const body = await (await handleProperty(new Request('http://localhost/api/property/parcel?pin=0046R00029000000'), { fetcher })).json()
    expect(body.assessment.sourceDate).toBeNull()
  })
})
