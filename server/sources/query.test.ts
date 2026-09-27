import { describe, expect, it, vi } from 'vitest'
import { handleSourceQuery, querySource, validEnvelope } from './query.mjs'

const origin = 'http://127.0.0.1:5173'
const request = (value: unknown, overrideOrigin = origin) => new Request('http://127.0.0.1:5175/api/sources/query', { method: 'POST', headers: { origin: overrideOrigin, 'content-type': 'application/json' }, body: JSON.stringify(value) })

describe('catalog source detail route', () => {
  it('rejects extra scoring fields in a source-only envelope', () => {
    const base = { catalogId: 1, status: 'available', coverage: { geography: 'parcel', matchMethod: 'exact_parcel_id' }, sourceUrl: 'https://example.org/source', sourceDate: null, retrievedAt: '2026-09-26T20:00:00.000Z', records: [{ recordCount: 1 }], summary: 'Test source.' }
    expect(validEnvelope(base, 1)).toBe(true)
    expect(validEnvelope({ ...base, score: 75 }, 1)).toBe(false)
    expect(validEnvelope({ ...base, coverage: { ...base.coverage, points: 5 } }, 1)).toBe(false)
    expect(validEnvelope({ ...base, records: [{ points: 5 }] }, 1)).toBe(false)
    expect(validEnvelope({ ...base, records: [{ owner_info: 'private' }] }, 1)).toBe(false)
    expect(validEnvelope({ ...base, records: [{ contact_address: 'private' }] }, 1)).toBe(false)
    expect(validEnvelope({ ...base, records: [{ ownerOccupiedCount: 5 }] }, 1)).toBe(true)
  })
  it('rejects caller URLs, unknown fields and unpaired coordinates before contacting sources', async () => {
    const fetcher = vi.fn()
    for (const value of [
      { catalogId: 2, context: { parcelId: '0046R00029000000', url: 'https://attacker.test' } },
      { catalogId: 2, context: { parcelId: '0046R00029000000', latitude: 40.46 } },
      { catalogId: 2, context: { parcelId: '0046R00029000000', countyFips: '42003' } },
      { catalogId: 61, context: {} },
      { catalogId: 2, context: {}, fields: '*' },
    ]) expect((await handleSourceQuery(request(value), { fetcher })).status).toBe(422)
    expect(fetcher).not.toHaveBeenCalled()
    expect((await handleSourceQuery(request({ catalogId: 2, context: {} }, 'https://attacker.test'), { fetcher })).status).toBe(403)
  })

  it('returns a source-specific needs-input envelope for exact sale queries', async () => {
    const response = await handleSourceQuery(request({ catalogId: 2, context: {} }), { fetcher: vi.fn(), now: () => '2026-09-26T20:00:00.000Z' })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ catalogId: 2, status: 'needs_input', coverage: { geography: 'parcel', matchMethod: 'exact_parcel_id' }, records: [], retrievedAt: '2026-09-26T20:00:00.000Z' })
  })

  it('returns parcel-source envelopes and marks other catalog rows unconnected', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, result: { total: 0, records: [] } })))
    const connected = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60])
    for (let catalogId = 1; catalogId <= 60; catalogId++) {
      const result = await querySource(catalogId, {}, { fetcher, now: () => '2026-09-26T20:00:00.000Z' })
      if (!connected.has(catalogId)) {
        expect(result).toBeNull()
        const response = await handleSourceQuery(request({ catalogId, context: {} }), { fetcher, now: () => '2026-09-26T20:00:00.000Z' })
        expect(response.status).toBe(501)
        expect(await response.json()).toEqual({ error: 'adapter_not_connected' })
        continue
      }
      expect(result.catalogId).toBe(catalogId)
      expect(result.status).toMatch(/^(available|empty|needs_input|unsupported|unavailable|incomplete|error)$/)
      expect(result.coverage.geography).toBeTruthy()
      expect(result.coverage.matchMethod).toBeTruthy()
      expect(result.sourceUrl).toMatch(/^https:\/\//)
      expect(result.summary).not.toMatch(/no verified adapter yet/i)
      expect(result.records.length).toBeLessThanOrEqual(20)
      const response = await handleSourceQuery(request({ catalogId, context: {} }), { fetcher, now: () => '2026-09-26T20:00:00.000Z' })
      expect(response.status).toBe(200)
    }
  })
})
