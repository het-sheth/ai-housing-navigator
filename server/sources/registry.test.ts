import { describe, expect, it } from 'vitest'
import { handleSources } from './registry.mjs'

describe('source coverage registry', () => {
  it('accounts for every organizer row without claiming catalog data is stored in the application', async () => {
    const response = await handleSources(new Request('http://127.0.0.1:5175/api/sources'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.catalogCount).toBe(60)
    expect(body.sources.map((item: { catalogId: number }) => item.catalogId)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1))
    expect(body.sources.every((item: { storedInApplication: boolean; catalogUrl: string }) => item.storedInApplication === false && item.catalogUrl.startsWith('https://'))).toBe(true)
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 1)).toMatchObject({ runtimeStatus: 'runtime', queryMode: 'live_exact_parcel' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 4).note).toMatch(/municipality layer is queried/)
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 5)).toMatchObject({ runtimeStatus: 'source_query', queryMode: 'live_exact_parcel' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 6)).toMatchObject({ runtimeStatus: 'source_query', queryMode: 'live_archive_index' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 46)).toMatchObject({ runtimeStatus: 'source_query', queryRequirements: ['countyFips'] })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 46).runtimeUrl).toMatch(/County_zhvi_.*\.csv$/)
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 49).runtimeUrl).toMatch(/RDC_Inventory_Core_Metrics_County\.csv$/)
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 22)).toMatchObject({ queryMode: 'live_point', queryRequirements: ['latitude', 'longitude'] })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 52)).toMatchObject({ queryMode: 'live_2010_tract_context', queryRequirements: ['tract'] })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 54)).toMatchObject({ queryMode: 'live_school_location_context', runtimeStatus: 'source_query' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 31)).toMatchObject({ queryMode: 'live_gtfs_feed_or_point', runtimeStatus: 'source_query' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 19)).toMatchObject({ queryMode: 'live_tract', queryRequirements: ['tract'] })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 32)).toMatchObject({ queryMode: 'live_point', queryRequirements: ['latitude', 'longitude'] })
    for (const id of [19, 32, 36, 39, 43]) expect(body.sources.find((item: { catalogId: number }) => item.catalogId === id).runtimeUrl).toMatch(/^https:\/\//)
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 2)).toMatchObject({ queryMode: 'live_exact_parcel', catalogUrl: 'https://data.wprdc.org/dataset/real-estate-sales' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 55)).toMatchObject({ queryMode: 'aggregate_only', queryRequirements: [] })
    for (const id of [7, 8, 14, 58]) expect(body.sources.find((item: { catalogId: number }) => item.catalogId === id).runtimeUrl).toBe('https://data.wprdc.org/api/3/action/datastore_search')
  })

  it('rejects unsupported methods and paths', async () => {
    expect((await handleSources(new Request('http://127.0.0.1:5175/api/sources', { method: 'POST' }))).status).toBe(405)
    expect((await handleSources(new Request('http://127.0.0.1:5175/api/other'))).status).toBe(404)
  })
})
