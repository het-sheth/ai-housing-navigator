import { describe, expect, it, vi } from 'vitest'
import { queryCoreSource } from './core.mjs'

const parcelId = '0046R00029000000'
const now = () => '2026-09-26T20:00:00.000Z'
const polygon = { type: 'Polygon', coordinates: [[[-80.01, 40.46], [-80.009, 40.46], [-80.009, 40.461], [-80.01, 40.46]]] }
const response = (value: unknown) => new Response(JSON.stringify(value))

function fetcher(value: string | URL | Request) {
  const url = new URL(String(value))
  if (url.pathname.includes('Web_Parcels')) return Promise.resolve(response({ type: 'FeatureCollection', features: [{ properties: { PIN: parcelId }, geometry: polygon }] }))
  if (url.pathname.includes('AlleghenyCountyMunicipalBoundaries')) return Promise.resolve(response({ features: [{ attributes: { OBJECTID: 1, NAME: 'PITTSBURGH', MUNICODE: 100 } }] }))
  if (url.pathname.includes('Zoning/MapServer')) return Promise.resolve(response({ features: [{ attributes: { OBJECTID: 2, zon_new: 'R1D-L', status: 'Approved' } }] }))
  if (url.pathname.includes('NFHL')) return Promise.resolve(response({ features: [{ attributes: { OBJECTID: 3, FLD_ZONE: 'X', ZONE_SUBTY: 'AREA OF MINIMAL FLOOD HAZARD', SFHA_TF: 'F' } }] }))
  if (url.pathname.includes('PGHWebSlope25')) return Promise.resolve(response({ features: [{ attributes: { objectid_1: 4, slope25: 'No' } }] }))
  if (url.pathname.includes('PGHWebUndermined')) return Promise.resolve(response({ features: [{ attributes: { objectid: 5, undermined: 'No' } }] }))
  throw new Error(`unexpected ${url}`)
}

describe('existing live source detail queries', () => {
  it('returns full-parcel municipality identity without inventing a proposal', async () => {
    const result = await queryCoreSource(4, { parcelId }, { fetcher, now })
    expect(result).toMatchObject({ catalogId: 4, status: 'available', sourceDate: null, coverage: { geography: 'parcel', matchMethod: 'whole_parcel_polygon' } })
    expect(result.records).toEqual([{ name: 'PITTSBURGH', code: '100' }])
  })

  it('returns a mapped No hazard flag as a record without clearing site risk', async () => {
    const result = await queryCoreSource(41, { parcelId }, { fetcher, now })
    expect(result.status).toBe('available')
    expect(result.records).toEqual([{ flag: 'No' }])
    expect(result.summary).toMatch(/not a site safety clearance/i)
  })

  it('uses an exact parcel boundary for each spatial source and bounds records', async () => {
    const tracked = vi.fn(fetcher)
    for (const id of [3, 9, 38, 40]) {
      const result = await queryCoreSource(id, { parcelId }, { fetcher: tracked, now })
      expect(result.status).toBe('available')
      if (id === 3) expect(result.records[0]).toMatchObject({ geometryType: 'EsriPolygon' })
      expect(result.records.length).toBeLessThanOrEqual(20)
      expect(result.sourceDate).toBeNull()
    }
    expect(tracked.mock.calls.filter(([url]) => String(url).includes('Web_Parcels'))).toHaveLength(4)
  })

  it('explains absent parcel input and the unverified OneStop portal API', async () => {
    expect((await queryCoreSource(9, {}, { now })).status).toBe('needs_input')
    const portal = await queryCoreSource(13, { parcelId }, { now })
    expect(portal.status).toBe('unsupported')
    expect(portal.summary).toMatch(/public portal/i)
    expect(await queryCoreSource(17, {}, { now })).toBeNull()
  })

  it('does not apply City layers to a parcel outside Pittsburgh', async () => {
    const outside = async (value: string | URL | Request) => {
      const url = new URL(String(value))
      if (url.pathname.includes('AlleghenyCountyMunicipalBoundaries')) return response({ features: [{ attributes: { OBJECTID: 7, NAME: 'WILKINSBURG', MUNICODE: 125 } }] })
      return fetcher(value)
    }
    for (const id of [9, 40, 41]) {
      const result = await queryCoreSource(id, { parcelId }, { fetcher: outside, now })
      expect(result.status).toBe('unsupported')
      expect(result.records).toEqual([])
    }
  })

  it('keeps an unapproved or blank mapped zoning feature incomplete', async () => {
    for (const mappedStatus of ['Draft', 'Approved']) {
      const altered = async (value: string | URL | Request) => {
        const url = new URL(String(value))
        if (url.pathname.includes('Zoning/MapServer')) return response({ features: [{ attributes: { OBJECTID: 2, zon_new: mappedStatus === 'Draft' ? 'R1D-L' : ' ', status: mappedStatus } }] })
        return fetcher(value)
      }
      const result = await queryCoreSource(9, { parcelId }, { fetcher: altered, now })
      expect(result.status).toBe('incomplete')
      expect(result.records).toEqual([])
    }
  })

  it('does not bind parcel evidence to contradictory supplied geography', async () => {
    const tracked = vi.fn(fetcher)
    for (const context of [{ parcelId, countyFips: '42007' }, { parcelId, stateFips: '36' }]) {
      const result = await queryCoreSource(3, context, { fetcher: tracked, now })
      expect(result.status).toBe('needs_input')
      expect(result.records).toEqual([])
    }
    expect(tracked).not.toHaveBeenCalled()
    const municipality = await queryCoreSource(4, { parcelId, municipality: 'Wilkinsburg' }, { fetcher, now })
    expect(municipality.status).toBe('incomplete')
    expect(municipality.records).toEqual([])
  })

  it('cancels oversized mapped responses before parsing', async () => {
    let cancelled = false
    const oversized = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1_500_000))
        controller.enqueue(new Uint8Array(600_000))
      },
      cancel() { cancelled = true },
    })
    const result = await queryCoreSource(3, { parcelId }, { fetcher: async () => new Response(oversized), now })
    expect(result).toMatchObject({ status: 'error', records: [] })
    expect(cancelled).toBe(true)
  })
})
