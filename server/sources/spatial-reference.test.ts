import { describe, expect, it } from 'vitest'
import { querySpatialReferenceSource } from './spatial-reference.mjs'

const now = () => '2026-09-26T22:00:00.000Z'
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

describe('spatial and reference source adapters', () => {
  it('leaves unrelated catalog IDs to their owner', async () => {
    const result = await querySpatialReferenceSource(1, {}, { fetcher: () => { throw Error('unexpected request') }, now })
    expect(result).toBeNull()
  })

  it('uses an exact tract lookup and preserves the 2020 source vintage', async () => {
    let requested = ''
    const fetcher = async (url: string) => {
      requested = url
      return json({ features: [{ attributes: { GEOID: '42003565300', NAME: 'Census Tract 5653', POP100: 1238, HU100: 579 } }] })
    }
    const result = await querySpatialReferenceSource(19, { tract: '42003565300' }, { fetcher, now })
    expect(new URL(requested).searchParams.get('where')).toBe("GEOID='42003565300'")
    expect(result).toMatchObject({ catalogId: 19, status: 'available', sourceDate: '2020', records: [{ tract: '42003565300', population2020: 1238, housingUnits2020: 579 }] })
  })

  it('does not guess a tract from a parcel ID', async () => {
    const result = await querySpatialReferenceSource(19, { parcelId: '0046R00029000000' }, { fetcher: () => { throw Error('unexpected request') }, now })
    expect(result).toMatchObject({ status: 'needs_input', sourceDate: null, records: [] })
    expect(result.summary).toContain('tract')
  })

  it('does not attach a tract from a conflicting county to the site', async () => {
    const result = await querySpatialReferenceSource(19, { tract: '42003565300', countyFips: '42007' }, { fetcher: () => { throw Error('unexpected request') }, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
    expect(result.summary).toContain('conflict')
  })

  it('returns point elevation with meters rather than a parcel slope finding', async () => {
    let requested = ''
    const fetcher = async (url: string) => { requested = url; return json({ value: '304.101074219', resolution: 1 }) }
    const result = await querySpatialReferenceSource(36, { latitude: 40.45, longitude: -79.98 }, { fetcher, now })
    expect(new URL(requested).searchParams.get('units')).toBe('Meters')
    expect(result).toMatchObject({ status: 'available', records: [{ elevationMeters: 304.101074219 }] })
    expect(result.summary).toContain('point')
  })

  it('does not convert a blank elevation response into zero meters', async () => {
    const result = await querySpatialReferenceSource(36, { latitude: 40.45, longitude: -79.98 }, { fetcher: async () => json({ value: '' }), now })
    expect(result).toMatchObject({ status: 'incomplete', records: [] })
  })

  it('bounds a PennDOT point query and treats nearby traffic segments as context', async () => {
    let requested = ''
    const fetcher = async (url: string) => { requested = url; return json({ count: 2 }) }
    const result = await querySpatialReferenceSource(32, { latitude: 40.45, longitude: -79.98 }, { fetcher, now })
    const params = new URL(requested).searchParams
    expect(params.get('distance')).toBe('100')
    expect(params.get('returnCountOnly')).toBe('true')
    expect(result).toMatchObject({ status: 'available', records: [{ nearbyTrafficSegments: 2, radiusMeters: 100 }] })
    expect(result.summary).toContain('not')
  })

  it('keeps a zero nearby eMapPA count from clearing environmental risk', async () => {
    const result = await querySpatialReferenceSource(39, { latitude: 40.45, longitude: -79.98 }, { fetcher: async () => json({ count: 0 }), now })
    expect(result).toMatchObject({ status: 'incomplete', records: [{ nearbyAmlPointFeatures: 0, radiusMeters: 250 }] })
    expect(result.summary).toMatch(/coverage.*not verified/)
  })

  it('does not claim Pennsylvania coverage from a rectangular coordinate bound', async () => {
    const result = await querySpatialReferenceSource(32, { latitude: 40.5, longitude: -80.5 }, { fetcher: async () => json({ count: 0 }), now })
    expect(result.status).toBe('incomplete')
    expect(result.coverage.geography).toMatch(/state not verified/)
  })

  it('does not accept a spatial count marked beyond the transfer limit', async () => {
    const result = await querySpatialReferenceSource(39, { latitude: 40.45, longitude: -79.98 }, { fetcher: async () => json({ count: 1, exceededTransferLimit: true }), now })
    expect(result).toMatchObject({ status: 'incomplete', records: [] })
  })

  it('reads one annual land-cover pixel and its year without inferring development permission', async () => {
    let requested = ''
    const fetcher = async (url: string) => {
      requested = url
      return json({ value: '21', catalogItems: { features: [{ attributes: { Year: 2024 } }] } })
    }
    const result = await querySpatialReferenceSource(43, { latitude: 40.45, longitude: -79.98 }, { fetcher, now })
    expect(new URL(requested).searchParams.get('maxItemCount')).toBe('1')
    expect(result).toMatchObject({ status: 'available', sourceDate: '2024', records: [{ year: 2024, classCode: 21 }] })
    expect(result.summary).toContain('pixel')
  })

  it('uses bounded GET metadata when a public document rejects HEAD', async () => {
    const calls: string[] = []
    const fetcher = async (_url: string, options: RequestInit) => {
      calls.push(options.method ?? 'GET')
      if (options.method === 'HEAD') return new Response(null, { status: 403 })
      return new Response('<html><head><title>Title 9 Zoning Code</title><meta name="description" content="Official Pittsburgh zoning chapters"></head><body><main><a href="/45474054">Title 9 sections</a></main></body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
    }
    const result = await querySpatialReferenceSource(10, { municipality: 'Pittsburgh' }, { fetcher, now })
    expect(calls).toEqual(['HEAD', 'GET'])
    expect(result).toMatchObject({ status: 'available', records: [{ kind: 'public_document', title: 'Title 9 Zoning Code', description: 'Official Pittsburgh zoning chapters' }] })
    expect(result.summary).toContain('not')
  })

  it('keeps document section links relevant to the indexed source', async () => {
    const html = '<html><head><title>ZBA Archive</title></head><body><a href="/press-release-archive">Press Release Archive</a><a href="/zoning-board-decisions">Zoning Board Decisions</a></body></html>'
    const result = await querySpatialReferenceSource(11, {}, { fetcher: async (_url: string, options: RequestInit) => options.method === 'HEAD' ? new Response(null, { status: 200 }) : new Response(html, { headers: { 'content-type': 'text/html' } }), now })
    expect(result.records[0]).toMatchObject({ kind: 'public_document', title: 'ZBA Archive', sectionUrl: 'https://www.pittsburghpa.gov/zoning-board-decisions' })
  })

  it('omits a contour link from an imagery catalog result', async () => {
    const html = '<title>Imagery Search</title><a href="/download/alleghenycountyimagery2017/Contours/">Contours 2017</a>'
    const result = await querySpatialReferenceSource(37, {}, { fetcher: async (_url: string, options: RequestInit) => options.method === 'HEAD' ? new Response(null, { status: 200 }) : new Response(html, { headers: { 'content-type': 'text/html' } }), now })
    expect(result.records[0]).not.toHaveProperty('sectionUrl')
  })

  it('reads PRT GTFS route and stop records with a bounded nearby point count', async () => {
    const encoder = new TextEncoder()
    const entries = new Map([
      ['routes.txt', encoder.encode('route_id,route_short_name,route_type\nR1,16,3\nR2,RED,2\n')],
      ['stops.txt', encoder.encode('stop_id,stop_name,stop_lat,stop_lon,location_type\nS1,"Main, Station",40.45,-79.98,0\nS2,Far,40.5,-79.9,0\n')],
      ['feed_info.txt', encoder.encode('feed_start_date,feed_end_date\n20260628,20261014\n')],
    ])
    const zipReader = async () => ({ entries })
    const result = await querySpatialReferenceSource(31, { latitude: 40.45, longitude: -79.98 }, { zipReader, now })
    expect(result).toMatchObject({ status: 'available', sourceDate: '2026-06-28/2026-10-14', records: [{ routeCount: 2, stopLocationCount: 2, nearbyStopLocationCount: 1 }, { stopId: 'S1', name: 'Main, Station', distanceMeters: 0 }] })
    expect(result.summary).toMatch(/not.*accessibility/i)
  })

  it('reports a missing catalog report distinctly from a denied GET', async () => {
    const missing = await querySpatialReferenceSource(16, {}, { fetcher: async () => new Response(null, { status: 404 }), now })
    const failed = await querySpatialReferenceSource(16, {}, { fetcher: async () => { throw Error('timeout') }, now })
    expect(missing.status).toBe('unavailable')
    expect(failed.status).toBe('error')
  })
})
