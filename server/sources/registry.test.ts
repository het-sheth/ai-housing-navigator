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
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 1)).toMatchObject({ runtimeStatus: 'property_runtime', queryMode: 'property_only' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 4).note).toMatch(/municipal boundaries layer only/)
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 5)).toMatchObject({ runtimeStatus: 'catalog_reference', queryMode: 'not_connected' })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 46)).toMatchObject({ runtimeStatus: 'catalog_reference', queryRequirements: [] })
    expect(body.sources.find((item: { catalogId: number }) => item.catalogId === 2)).toMatchObject({ queryMode: 'not_connected', catalogUrl: 'https://data.wprdc.org/dataset/real-estate-sales' })
    expect(body.sources.every((item: { runtimeStatus: string }) => ['property_runtime', 'screening_runtime', 'catalog_reference'].includes(item.runtimeStatus))).toBe(true)
  })

  it('rejects unsupported methods and paths', async () => {
    expect((await handleSources(new Request('http://127.0.0.1:5175/api/sources', { method: 'POST' }))).status).toBe(405)
    expect((await handleSources(new Request('http://127.0.0.1:5175/api/other'))).status).toBe(404)
  })
})
