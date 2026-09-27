import { describe, expect, it, vi } from 'vitest'
import { handleCandidates } from './candidates.mjs'

const row = { PARID: '0046R00029000000', PROPERTYHOUSENUM: '2003', PROPERTYADDRESS: 'MOUNTFORD AVE', PROPERTYCITY: 'PITTSBURGH', MUNIDESC: '14th Ward - PITTSBURGH', PROPERTYZIP: '15217', USEDESC: 'SINGLE FAMILY', ASOFDATE: '2026-09-01' }
const success = (records: unknown[], total = records.length) => new Response(JSON.stringify({ success: true, result: { records, total } }))
const request = (use: string) => new Request(`http://localhost/api/property/candidates?use=${use}`)

describe('Pittsburgh assessment candidate search', () => {
  it('filters County records by fixed municipality and recorded use', async () => {
    const fetcher = vi.fn(async () => success([row], 1))
    const response = await handleCandidates(request('single_family'), { fetcher, now: () => '2026-09-27T12:00:00.000Z' })
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.pathname).toBe('/api/3/action/datastore_search')
    expect(JSON.parse(url.searchParams.get('filters')!)).toEqual({ USEDESC: 'SINGLE FAMILY' })
    expect(JSON.parse(url.searchParams.get('q')!)).toEqual({ MUNIDESC: 'PITTSBURGH' })
    expect(url.searchParams.get('limit')).toBe('21')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.candidates[0].parcelId).toBe('0046R00029000000')
    expect(body.candidates[0].matched).toContain('SINGLE FAMILY')
    expect(body.candidates[0].sourceDate).toBe('2026-09-01')
    expect(body.coverage).toContain('Pittsburgh-labeled')
    expect(body.unknowns).toContain('Proposal suitability')
    expect(body.unknowns).toContain('Confirmed City jurisdiction')
  })

  it('narrows by an exact user-confirmed postal ZIP', async () => {
    const fetcher = vi.fn(async () => success([row]))
    await handleCandidates(new Request('http://localhost/api/property/candidates?use=single_family&zip=15217'), { fetcher })
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(JSON.parse(url.searchParams.get('filters')!)).toEqual({ USEDESC: 'SINGLE FAMILY', PROPERTYZIP: '15217' })
    const body = await (await handleCandidates(new Request('http://localhost/api/property/candidates?use=single_family&zip=15217'), { fetcher })).json()
    expect(body.candidates[0].matched).toContain('postal ZIP 15217')
  })

  it('stamps retrieval after source records arrive', async () => {
    let fetched = false
    const fetcher = vi.fn(async () => { fetched = true; return success([row]) })
    const now = () => fetched ? '2026-09-27T12:00:12.000Z' : '2026-09-27T12:00:00.000Z'
    const body = await (await handleCandidates(request('single_family'), { fetcher, now })).json()
    expect(body.retrievedAt).toBe('2026-09-27T12:00:12.000Z')
  })

  it('returns only 20 records and marks additional results', async () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({ ...row, PARID: String(index).padStart(16, '0') }))
    const body = await (await handleCandidates(request('single_family'), { fetcher: async () => success(rows, 134) })).json()
    expect(body.candidates).toHaveLength(20)
    expect(body.truncated).toBe(true)
    expect(body.candidates[0].parcelId).toBe('0000000000000000')
  })

  it('rejects source rows that violate confirmed municipality or use', async () => {
    const fetcher = vi.fn(async () => success([{ ...row, MUNIDESC: 'Wilkinsburg' }]))
    const response = await handleCandidates(request('single_family'), { fetcher })
    expect(response.status).toBe(502)
    expect((await response.json()).status).toBe('error')
  })

  it('never marks an omitted recorded use as a match', async () => {
    const fetcher = vi.fn(async () => success([{ ...row, USEDESC: null }]))
    const response = await handleCandidates(request('single_family'), { fetcher })
    expect(response.status).toBe(502)
  })

  it('rejects unsupported criteria without consulting the source', async () => {
    const fetcher = vi.fn()
    const response = await handleCandidates(request('mixed_use'), { fetcher })
    expect(response.status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('shows source failure instead of a no-match result', async () => {
    const response = await handleCandidates(request('vacant_land'), { fetcher: async () => new Response('{}', { status: 503 }) })
    expect(response.status).toBe(502)
    expect((await response.json()).status).toBe('error')
  })
})
