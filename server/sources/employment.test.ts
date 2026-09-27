import { describe, expect, it, vi } from 'vitest'
import { gzipSync } from 'node:zlib'
import { handleSourceQuery, querySource } from './query.mjs'
import { queryEmploymentSource } from './employment.mjs'

const now = () => '2026-09-27T12:00:00.000Z'
const header = 'w_geocode,C000,createdate\n'
const fixture = (rows: string) => gzipSync(header + rows)
const source = (rows: string) => vi.fn(async () => new Response(fixture(rows), { headers: { 'content-type': 'application/x-gzip' } }))

describe('Census LODES employment context', () => {
  it('sums complete 2023 Pennsylvania workplace blocks for an exact county', async () => {
    const fetcher = source('420030001001001,2,20251203\n420030001001002,3,20251203\n420050001001001,7,20251203\n')
    const result = await querySource(28, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({
      catalogId: 28,
      status: 'available',
      sourceDate: '2023',
      coverage: { geography: 'Pennsylvania county', matchMethod: 'exact_county_fips_2020_block_prefix' },
      records: [{ countyFips: '42003', year: 2023, workplaceJobs: 5, workplaceBlockCount: 2, jobType: 'all_jobs' }],
    })
    expect(result.sourceUrl).toBe('https://lehd.ces.census.gov/data/lodes/LODES8/pa/wac/pa_wac_S000_JT00_2023.csv.gz')
    expect(result.summary).toMatch(/not.*parcel/i)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('uses an exact 2020 tract prefix while preserving the GEOID as a string', async () => {
    const fetcher = source('420030001001001,2,20251203\n420030001002002,3,20251203\n420030002001001,7,20251203\n')
    const result = await querySource(28, { tract: '42003000100' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { matchMethod: 'exact_tract_geoid_2020_block_prefix' }, records: [{ tract: '42003000100', workplaceJobs: 5, workplaceBlockCount: 2 }] })
  })

  it('does not turn a no-match geography into a zero workplace-jobs total', async () => {
    const fetcher = source('420050001001001,7,20251203\n')
    const result = await querySource(28, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
    expect(result.summary).toMatch(/no matching.*block/i)
  })

  it('rejects a parcel ID, another state, or an unpublished year before fetching', async () => {
    const fetcher = vi.fn()
    for (const context of [{ parcelId: '0046R00029000000' }, { countyFips: '36061' }, { countyFips: '42003', year: 2022 }]) {
      const result = await queryEmploymentSource(28, context, { fetcher, now })
      expect(result).toMatchObject({ status: 'needs_input', sourceDate: null, records: [] })
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not report a total from a truncated gzip', async () => {
    const full = fixture('420030001001001,2,20251203\n')
    const fetcher = vi.fn(async () => new Response(full.subarray(0, full.length - 6)))
    const result = await querySource(28, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
  })

  it('rejects an advertised archive above the compressed byte cap', async () => {
    const fetcher = vi.fn(async () => new Response(fixture('420030001001001,2,20251203\n'), { headers: { 'content-length': '4000001' } }))
    const result = await querySource(28, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
  })

  it('cancels the source stream when an inflated row exceeds its bound', async () => {
    let canceled = false
    const bytes = fixture(`420030001001001,2,20251203${'x'.repeat(5000)}\n`)
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(bytes) },
      cancel() { canceled = true },
    })
    const fetcher = vi.fn(async () => new Response(stream))
    const result = await querySource(28, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
    expect(canceled).toBe(true)
  })

  it('rejects duplicate matching blocks rather than double-counting jobs', async () => {
    const fetcher = source('420030001001001,2,20251203\n420030001001001,3,20251203\n')
    const result = await querySource(28, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'error', sourceDate: null, records: [] })
  })

  it('does not own unrelated catalog entries', async () => {
    expect(await queryEmploymentSource(27, {}, { fetcher: vi.fn(), now })).toBeNull()
  })

  it('returns only a bounded source envelope through the public query route', async () => {
    const origin = 'http://127.0.0.1:5173'
    const request = new Request(`${origin}/api/sources/query`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ catalogId: 28, context: { countyFips: '42003' } }) })
    const response = await handleSourceQuery(request, { trustedOrigin: origin, fetcher: source('420030001001001,2,20251203\n'), now })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ catalogId: 28, status: 'available', records: [{ workplaceJobs: 2 }] })
    expect(body).not.toHaveProperty('score')
  })
})
