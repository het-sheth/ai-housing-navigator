import { describe, expect, it, vi } from 'vitest'
import { querySource, validEnvelope } from './query.mjs'

const now = () => '2026-09-27T14:00:00.000Z'
const chasRow = { GEOID: '42003', NAME: 'Allegheny', T2_EST1: 545695, T8_EST69: 53055 }
const response = (features: unknown) => new Response(JSON.stringify({ features }))

describe('HUD public sources', () => {
  it('returns documented historical CHAS counts for one exact county', async () => {
    const fetcher = vi.fn(async () => response([{ attributes: chasRow }]))
    const result = await querySource(20, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ catalogId: 20, status: 'available', sourceDate: '2013-2017', coverage: { geography: 'county', matchMethod: 'exact_county_fips' }, records: [{ countyFips: '42003', occupiedHousingUnits: 545695, renterHouseholdsAtOrBelow30PercentHamfi: 53055 }] })
    expect(result.summary).toMatch(/historical 2013-2017/i)
    expect(validEnvelope(result, 20)).toBe(true)
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.get('where')).toBe("GEOID='42003'")
    expect(url.searchParams.get('outFields')).toBe('GEOID,NAME,T2_EST1,T8_EST69')
    expect(url.searchParams.get('returnGeometry')).toBe('false')
  })

  it('requires an exact county and does not infer one from a parcel or tract', async () => {
    const fetcher = vi.fn()
    for (const context of [{}, { parcelId: '0046R00029000000' }, { tract: '42003050900' }, { countyFips: '4203' }, { countyFips: '42003', tract: '42003050900' }, { countyFips: '42003', year: 2026 }]) {
      expect(await querySource(20, context, { fetcher, now })).toMatchObject({ status: 'needs_input', records: [] })
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects mismatched, duplicate and suppressed county rows', async () => {
    const mismatch = await querySource(20, { countyFips: '42003' }, { fetcher: vi.fn(async () => response([{ attributes: { ...chasRow, GEOID: '42001' } }])), now })
    expect(mismatch).toMatchObject({ status: 'error', records: [] })
    const duplicate = await querySource(20, { countyFips: '42003' }, { fetcher: vi.fn(async () => response([{ attributes: chasRow }, { attributes: chasRow }])), now })
    expect(duplicate).toMatchObject({ status: 'error', records: [] })
    const suppressed = await querySource(20, { countyFips: '42003' }, { fetcher: vi.fn(async () => response([{ attributes: { ...chasRow, T8_EST69: null } }])), now })
    expect(suppressed).toMatchObject({ status: 'incomplete', records: [] })
  })

  it('does not turn a truncated response into zero CHAS households', async () => {
    const fetcher = vi.fn(async () => new Response('{"features":[', { headers: { 'content-length': '13' } }))
    expect(await querySource(20, { countyFips: '42003' }, { fetcher, now })).toMatchObject({ status: 'error', records: [] })
  })

  it('discloses the verified FY2026 income workbook access barrier', async () => {
    const fetcher = vi.fn()
    const result = await querySource(23, { countyFips: '42003', year: 2026 }, { fetcher, now })
    expect(result).toMatchObject({ status: 'unavailable', sourceUrl: 'https://www.huduser.gov/portal/datasets/il/il26/Section8-FY26.xlsx', records: [] })
    expect(result.summary).toMatch(/HTTP 202 access challenge/)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
