import { describe, expect, it, vi } from 'vitest'
import { queryNcesSource } from './nces.mjs'

const now = () => '2026-09-26T22:00:00.000Z'
const json = (value: unknown) => new Response(JSON.stringify(value))

describe('NCES EDGE school source', () => {
  it('owns only catalog ID 54', async () => {
    expect(await queryNcesSource(53, {}, { now })).toBeNull()
  })

  it('returns an exact county count with bounded institution samples', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams
      expect(params.get('where')).toBe("CNTY='42003'")
      if (params.get('returnCountOnly') === 'true') return json({ count: 276 })
      expect(params.get('resultRecordCount')).toBe('19')
      expect(params.get('outFields')).toBe('NCESSCH,NAME,CNTY,STFIP,CITY,SCHOOLYEAR')
      return json({ exceededTransferLimit: true, features: [{ attributes: { NCESSCH: '420001700336', NAME: 'Manchester Academic CS', CNTY: '42003', STFIP: '42', CITY: 'Pittsburgh', SCHOOLYEAR: '2023-2024' } }] })
    })
    const result = await queryNcesSource(54, { countyFips: '42003', stateFips: '42' }, { fetcher, now })
    expect(result).toMatchObject({ catalogId: 54, status: 'incomplete', sourceDate: '2023-2024', coverage: { geography: 'county', matchMethod: 'exact_county_fips' }, records: [{ countyFips: '42003', schoolCount: 276 }, { schoolId: '420001700336', name: 'Manchester Academic CS', city: 'Pittsburgh' }] })
    expect(result.summary).toMatch(/not.*assignment/i)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects conflicting state and county FIPS before fetching', async () => {
    const fetcher = vi.fn()
    const result = await queryNcesSource(54, { countyFips: '42003', stateFips: '36' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not treat a truncated count as complete school coverage', async () => {
    const fetcher = vi.fn(async () => json({ count: 0, exceededTransferLimit: true }))
    const result = await queryNcesSource(54, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', sourceDate: null, records: [] })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
