import { describe, expect, it, vi } from 'vitest'
import { queryWprdcSource } from './wprdc.mjs'

const parcelId = '0046R00029000000'
const now = () => '2026-09-26T20:00:00.000Z'
const respond = (records: Array<Record<string, unknown>>, total = records.length) => new Response(JSON.stringify({ success: true, result: { total, records } }))

describe('WPRDC source detail queries', () => {
  it('uses a fixed exact parcel filter and returns only allowlisted sale fields', async () => {
    const fetcher = vi.fn(async (value: string | URL | Request) => {
      const url = new URL(String(value))
      expect(url.searchParams.get('resource_id')).toBe('5bbe6c55-bce6-4edb-9d04-68edeb6bf7b1')
      expect(url.searchParams.get('filters')).toBe(JSON.stringify({ PARID: parcelId }))
      expect(url.searchParams.get('fields')).not.toMatch(/owner|email|phone/i)
      return respond([{ PARID: parcelId, SALEDATE: '2025-01-01', PRICE: 120000, SALECODE: '0', SALEDESC: 'Valid', SELLER: 'do not return' }])
    })
    const result = await queryWprdcSource(2, { parcelId }, { fetcher, now })
    expect(result).toMatchObject({ catalogId: 2, status: 'available', coverage: { geography: 'parcel', matchMethod: 'exact_parcel_id' }, sourceDate: null, retrievedAt: now() })
    expect(result.sourceUrl).toContain('resource_id=5bbe6c55-bce6-4edb-9d04-68edeb6bf7b1')
    expect(result.records).toEqual([{ PARID: parcelId, SALEDATE: '2025-01-01', PRICE: 120000, SALECODE: '0', SALEDESC: 'Valid' }])
    expect(result.summary).toMatch(/not a nearby comparable/i)
  })

  it('blocks mismatched IDs and incomplete returned pages', async () => {
    const municipalityQuery = async () => ({ status: 'available', records: [{ name: 'PITTSBURGH', code: '100' }], sourceUrl: 'https://example.org/municipality' })
    const mismatch = await queryWprdcSource(7, { parcelId }, { fetcher: async () => respond([{ parcel_id: 'different', status: 'Open' }]), now, municipalityQuery })
    expect(mismatch.status).toBe('error')
    expect(mismatch.records).toEqual([])
    const incomplete = await queryWprdcSource(7, { parcelId }, { fetcher: async () => respond([{ parcel_id: parcelId, status: 'Open' }], 30), now, municipalityQuery })
    expect(incomplete.status).toBe('incomplete')
  })

  it('withholds City-only record queries for parcels outside Pittsburgh', async () => {
    const fetcher = vi.fn()
    const municipalityQuery = vi.fn(async () => ({ status: 'available', records: [{ name: 'WILKINSBURG', code: '125' }], sourceUrl: 'https://example.org/municipality' }))
    for (const id of [5, 7, 8, 14, 15, 58]) {
      const result = await queryWprdcSource(id, { parcelId }, { fetcher, now, municipalityQuery })
      expect(result.status).toBe('unsupported')
      expect(result.records).toEqual([])
      expect(result.coverage.matchMethod).toBe('verified_city_scope')
    }
    expect(fetcher).not.toHaveBeenCalled()
    expect(municipalityQuery).toHaveBeenCalledTimes(6)
  })

  it('does not claim a reliable tract join for 311 records', async () => {
    const fetcher = vi.fn(async (value: string | URL | Request) => {
      const url = new URL(String(value))
      expect(url.searchParams.get('limit')).toBe('0')
      expect(url.searchParams.has('filters')).toBe(false)
      return respond([], 815417)
    })
    const result = await queryWprdcSource(53, { tract: '42003000100' }, { fetcher, now })
    expect(result.status).toBe('available')
    expect(result.coverage).toEqual({ geography: 'dataset', matchMethod: 'dataset_record_count' })
    expect(result.records).toEqual([{ recordCount: 815417 }])
  })

  it('uses a dataset count when a reliable 311 tract is unavailable', async () => {
    const fetcher = vi.fn(async (value: string | URL | Request) => {
      const url = new URL(String(value))
      expect(url.searchParams.get('limit')).toBe('0')
      expect(url.searchParams.has('filters')).toBe(false)
      return respond([], 815417)
    })
    const result = await queryWprdcSource(53, {}, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'dataset', matchMethod: 'dataset_record_count' }, records: [{ recordCount: 815417 }] })
    expect(result.summary).toMatch(/not parcel evidence/i)
  })

  it('returns exact required inputs and only aggregate counts for personal financial record sources', async () => {
    expect((await queryWprdcSource(8, {}, { now })).status).toBe('needs_input')
    for (const id of [55, 56, 57]) {
      const fetcher = vi.fn(async (value: string | URL | Request) => {
        const url = new URL(String(value))
        expect(url.searchParams.get('limit')).toBe('0')
        expect(url.searchParams.has('filters')).toBe(false)
        return respond([], 5000)
      })
      const result = await queryWprdcSource(id, { parcelId }, { now, fetcher })
      expect(result.status).toBe('available')
      expect(result.coverage).toEqual({ geography: 'dataset', matchMethod: 'dataset_record_count' })
      expect(result.records).toEqual([{ recordCount: 5000 }])
      expect(result.summary).toMatch(/not parcel evidence/i)
    }
    expect(await queryWprdcSource(17, {}, { now })).toBeNull()
  })

  it('returns only a bounded archive index for historical permit summaries', async () => {
    const fetcher = vi.fn(async (value: string | URL | Request) => {
      expect(String(value)).toContain('package_show?id=city-of-pittsburgh-building-permit-summary')
      return new Response(JSON.stringify({ success: true, result: { resources: [
        { name: 'PLI Permit Summary April 2023', datastore_active: true },
        { name: 'PLI: Building Permit Summary: January 2012', datastore_active: true },
        { name: 'Other attachment', datastore_active: false },
      ] } }))
    })
    const result = await queryWprdcSource(6, { parcelId }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'dataset', matchMethod: 'archive_index_only' }, records: [{ indexedTables: 2 }] })
    expect(result.summary).toMatch(/no parcel records were queried/i)
  })
})
