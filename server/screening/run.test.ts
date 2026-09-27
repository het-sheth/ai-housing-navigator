import { describe, expect, it, vi } from 'vitest'
import { handleScreening } from './run.mjs'

const pin = '0046R00029000000'
const polygon = { type: 'Polygon', coordinates: [[[-80.01, 40.46], [-80.009, 40.46], [-80.009, 40.461], [-80.01, 40.46]]] }
const input = { parcelId: pin, proposal: { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'yes' } }
const response = (body: unknown) => new Response(JSON.stringify(body))
const request = (body: unknown = input) => new Request('http://127.0.0.1:5175/api/screening/run', { method: 'POST', headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' }, body: JSON.stringify(body) })

function expectUnscored(body: { status: string; score: unknown; checks: Array<Record<string, unknown>> }) {
  expect(body.status).toBe('pending')
  expect(body.score).toBeNull()
  for (const check of body.checks) {
    expect(check).not.toHaveProperty('points')
    expect(check).not.toHaveProperty('maxPoints')
    expect(check.reason).not.toMatch(/\b\d+\s*(?:of|to)\s*\d+\s*points\b/i)
  }
}

function sources(options: { municipality?: string; zone?: string; zoneStatus?: string; slope?: boolean; slopeValue?: string; flood?: string; floodSfha?: string; floodId?: number | null; floodCovering?: boolean; fail?: string; parcelPin?: string; noParcel?: boolean; mappedLayers?: string[]; underminingFlag?: string; underminingFlags?: string[]; landslideFlag?: string; permitRows?: Array<Record<string, unknown>>; permitTotal?: number; overlayTransferLimit?: boolean } = {}) {
  const calls: URL[] = []
  const fetcher = vi.fn(async (value: string | URL | Request) => {
    const url = new URL(String(value))
    calls.push(url)
    if (options.fail && url.hostname.includes(options.fail)) throw new Error('offline')
    if (url.hostname === 'gisdata.alleghenycounty.us') return response({ type: 'FeatureCollection', features: options.noParcel ? [] : [{ properties: { PIN: options.parcelPin ?? pin }, geometry: polygon }] })
    if (url.pathname.includes('AlleghenyCountyMunicipalBoundaries')) return response({ features: [{ attributes: { OBJECTID: 1, NAME: options.municipality ?? 'PITTSBURGH', MUNICODE: options.municipality === 'SHARPSBURG' ? 852 : 100 } }] })
    if (url.pathname.includes('Zoning/MapServer')) return response({ features: [{ attributes: { OBJECTID: 2, zon_new: options.zone ?? 'R1D-L', full_zoning_type: 'R1D-L', status: options.zoneStatus ?? 'Approved' } }] })
    if (url.pathname.includes('PGHWebSlope25')) return response({ features: options.slope || options.slopeValue ? [{ attributes: { slope25: options.slopeValue ?? 'Yes' } }] : [] })
    if (url.hostname === 'hazards.fema.gov') return response({ features: options.floodCovering === false && url.searchParams.get('spatialRel') === 'esriSpatialRelWithin' ? [] : [{ attributes: { OBJECTID: options.floodId === null ? undefined : options.floodId ?? 3, FLD_ZONE: options.flood ?? 'X', ZONE_SUBTY: 'AREA OF MINIMAL FLOOD HAZARD', SFHA_TF: options.floodSfha } }] })
    if (url.pathname.includes('/api/3/action/datastore_search')) return response({ success: true, result: { total: options.permitTotal ?? options.permitRows?.length ?? 0, records: options.permitRows ?? [] } })
    if (url.pathname.includes('/PGHWebUndermined/') && url.searchParams.get('returnCountOnly') !== 'true') return response({ features: (options.underminingFlags ?? (options.underminingFlag || options.mappedLayers?.includes('PGHWebUndermined') ? [options.underminingFlag ?? 'Yes'] : [])).map((flag, index) => ({ attributes: { objectid: 11 + index, undermined: flag } })) })
    if (url.pathname.includes('/PGHWebLandslideProne/') && url.searchParams.get('returnCountOnly') !== 'true') return response({ features: options.landslideFlag || options.mappedLayers?.includes('PGHWebLandslideProne') ? [{ attributes: { objectid: 12, landslideprone: options.landslideFlag ?? 'Yes' } }] : [] })
    if (url.pathname.includes('/FeatureServer/0/query') && url.searchParams.get('returnCountOnly') === 'true') return response({ count: options.mappedLayers?.some(layer => url.pathname.includes(`/${layer}/`)) ? 1 : 0, exceededTransferLimit: options.overlayTransferLimit ?? false })
    throw new Error(`unexpected source ${url}`)
  })
  return { fetcher, calls }
}

describe('preliminary Pittsburgh screening', () => {
  it('returns evidence but no number while required rubric checks remain unknown', async () => {
    const { fetcher, calls } = sources()
    const body = await (await handleScreening(request(), { fetcher, now: () => '2026-09-26T20:00:00.000Z' })).json()
    expectUnscored(body)
    expect(body.parcelId).toBe(pin)
    expect(body.proposal).toEqual(input.proposal)
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-use').status).toBe('screened_low_friction')
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-use').metricScore).toMatchObject({ value: 2, max: 2, scope: expect.stringContaining('R1D'), rule: expect.stringContaining('use table') })
    expect(body.checks.find((check: { id: string }) => check.id === 'flood').metricScore).toMatchObject({ value: 2, max: 2, scope: expect.stringContaining('whole parcel'), rule: expect.stringContaining('minimal-hazard') })
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-other').status).toBe('unknown')
    expect(calls.some(url => url.searchParams.get('spatialRel') === 'esriSpatialRelWithin')).toBe(true)
    expect(body.nextActions.some((action: string) => action.includes('utility'))).toBe(true)
  })

  it('keeps a mapped slope flag and proposed disturbance as documented friction', async () => {
    const { fetcher } = sources({ slope: true })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').status).toBe('mapped_flag')
    expect(body.checks.find((check: { id: string }) => check.id === 'slope')).not.toHaveProperty('metricScore')
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').reason).toContain('ground disturbance is yes')
    expect(body.nextActions[0]).toContain('mapped slope')
  })

  it('explains why no-disturbance changes a mapped slope finding without showing points', async () => {
    const { fetcher } = sources({ slope: true })
    const modified = { ...input, proposal: { ...input.proposal, groundDisturbance: 'no' } }
    const body = await (await handleScreening(request(modified), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').reason).toContain('ground disturbance is no')
  })

  it('does not score outside verified Pittsburgh jurisdiction', async () => {
    const { fetcher } = sources({ municipality: 'SHARPSBURG' })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expect(body.status).toBe('pending')
    expect(body.score).toBeNull()
    expect(body.proposal).toEqual(input.proposal)
    expect(body.municipality).toBe('other')
  })

  it('keeps description-only proposals pending without fetching source data', async () => {
    const { fetcher } = sources()
    const body = await (await handleScreening(request({ ...input, proposal: { ...input.proposal, activities: [] } }), { fetcher })).json()
    expect(body.status).toBe('pending')
    expect(body.score).toBeNull()
    expect(body.nextActions).toContain('Select at least one work activity before screening a proposal.')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not score an unresolved or mismatched exact parcel', async () => {
    for (const options of [{ noParcel: true }, { parcelPin: '0046R00030000000' }]) {
      const { fetcher, calls } = sources(options)
      const body = await (await handleScreening(request(), { fetcher })).json()
      expect(body.status).toBe('pending')
      expect(body.score).toBeNull()
      expect(calls).toHaveLength(1)
    }
  })

  it('does not infer detached form from an assessment or unsupported proposal', async () => {
    const { fetcher } = sources()
    const body = await (await handleScreening(request({ ...input, proposal: { ...input.proposal, housingForm: 'unknown' } }), { fetcher })).json()
    expect(body.status).toBe('pending')
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-use').status).toBe('unknown')
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-use')).not.toHaveProperty('metricScore')
  })

  it('scores an intersecting FEMA A/V hazard flag but not incomplete coverage', async () => {
    const hazard = await (await handleScreening(request(), { fetcher: sources({ flood: 'AE' }).fetcher })).json()
    expectUnscored(hazard)
    expect(hazard.checks.find((check: { id: string }) => check.id === 'flood').metricScore).toMatchObject({ value: 0, max: 2, scope: expect.stringContaining('intersects'), rule: expect.stringContaining('A/V') })

    const sfhaOnly = await (await handleScreening(request(), { fetcher: sources({ flood: 'X', floodSfha: 'T' }).fetcher })).json()
    expect(sfhaOnly.checks.find((check: { id: string }) => check.id === 'flood').status).toBe('mapped_flag')
    expect(sfhaOnly.checks.find((check: { id: string }) => check.id === 'flood')).not.toHaveProperty('metricScore')

    const conflict = await (await handleScreening(request(), { fetcher: sources({ flood: 'AE', floodSfha: 'F' }).fetcher })).json()
    expect(conflict.checks.find((check: { id: string }) => check.id === 'flood').status).toBe('unknown')
    expect(conflict.checks.find((check: { id: string }) => check.id === 'flood').reason).toContain('conflict')
    expect(conflict.checks.find((check: { id: string }) => check.id === 'flood')).not.toHaveProperty('metricScore')

    const incomplete = await (await handleScreening(request(), { fetcher: sources({ floodCovering: false }).fetcher })).json()
    expectUnscored(incomplete)
    expect(incomplete.checks.find((check: { id: string }) => check.id === 'flood')).not.toHaveProperty('metricScore')
  })

  it('keeps failed hazard source independent without showing a partial interval', async () => {
    const { fetcher } = sources({ fail: 'hazards.fema.gov' })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'flood').status).toBe('error')
    expect(body.checks.find((check: { id: string }) => check.id === 'flood')).not.toHaveProperty('metricScore')
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').status).toBe('screened_low_friction')
  })

  it('returns exact-parcel permit history as a separate observation without changing score coverage', async () => {
    const { fetcher, calls } = sources({ permitRows: [{ parcel_num: pin, permit_id: 'P-1', permit_type: 'Building', work_type: 'Addition', issue_date: '2025-06-01', status: 'Issued' }] })
    const body = await (await handleScreening(request(), { fetcher, now: () => '2026-09-26T20:00:00.000Z' })).json()
    expectUnscored(body)
    expect(body.checks).toHaveLength(7)
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'pli-permits')).toMatchObject({ status: 'available', coverage: 'exact_parcel_record_search', count: 1, sourceDate: null, retrievedAt: '2026-09-26T20:00:00.000Z' })
    expect(body.checks.find((item: { id: string }) => item.id === 'zoning-other')).not.toHaveProperty('metricScore')
    const permitRequest = calls.find(url => url.searchParams.get('resource_id') === 'f4d1177a-f597-4c32-8cbf-7885f56253f6')
    expect(permitRequest?.searchParams.get('filters')).toBe(JSON.stringify({ parcel_num: pin }))
    expect(permitRequest?.searchParams.get('fields')).not.toMatch(/owner|contact|email/i)
  })

  it('keeps mismatched and incomplete permit records from claiming complete coverage', async () => {
    for (const options of [
      { permitRows: [{ parcel_num: 'OTHER', permit_id: 'P-1' }] },
      { permitRows: [{ parcel_num: pin, permit_id: 'P-1' }], permitTotal: 101 },
    ]) {
      const { fetcher } = sources(options)
      const body = await (await handleScreening(request(), { fetcher })).json()
      expectUnscored(body)
      expect(body.sourceObservations.find((item: { id: string }) => item.id === 'pli-permits').status).not.toBe('available')
    }
  })

  it('keeps mapped undermining and landslide intersections as evidence without awarding points', async () => {
    const { fetcher } = sources({ mappedLayers: ['PGHWebUndermined', 'PGHWebLandslideProne'] })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').status).toBe('mapped_flag')
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-landslide')).toMatchObject({ status: 'mapped_flag', coverage: 'mapped_intersection_only', count: 1 })
    expect(body.nextActions.some((action: string) => action.includes('undermining'))).toBe(true)
    expect(body.nextActions.some((action: string) => action.includes('landslide'))).toBe(true)
  })

  it('keeps all viewer overlays separate from the fixed rubric checks and rejects incomplete map counts', async () => {
    const { fetcher } = sources({ mappedLayers: ['InclusionaryHousingOverlayDistrict'], overlayTransferLimit: true })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks).toHaveLength(7)
    expect(body.sourceObservations).toHaveLength(14)
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'inclusionary-housing').status).toBe('error')
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-undermining').status).toBe('no_intersection')
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').reason).toMatch(/No City undermining feature was returned/)
  })

  it('reports one failed viewer layer independently of other mapped observations', async () => {
    const { fetcher } = sources({ fail: 'none' })
    const selective = vi.fn(async (value: string | URL | Request, init?: RequestInit) => {
      if (String(value).includes('/PGHWebUndermined/')) throw new Error('offline')
      return fetcher(value, init)
    })
    const body = await (await handleScreening(request(), { fetcher: selective })).json()
    expectUnscored(body)
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').status).toBe('error')
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-landslide').status).toBe('no_intersection')
  })

  it('does not turn intersecting no or unknown hazard flags into a positive mapped hazard', async () => {
    const { fetcher } = sources({ underminingFlag: 'No', landslideFlag: 'Unknown' })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-undermining').status).toBe('mapped_no_flag')
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-landslide').status).toBe('unknown')
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').status).toBe('unknown')
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').reason).toMatch(/returned feature flag is No/)
    expect(body.nextActions.some((action: string) => action.includes('mapped undermining'))).toBe(false)
  })

  it('describes an intersecting unknown undermining flag without claiming no feature', async () => {
    const { fetcher } = sources({ underminingFlag: 'Maybe' })
    const body = await (await handleScreening(request(input), { fetcher })).json()
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-undermining').status).toBe('unknown')
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining')).toMatchObject({ status: 'unknown' })
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').reason).toMatch(/intersects.*flag is unrecognized/)
  })

  it('preserves a known positive hazard alongside an unrecognized intersecting flag', async () => {
    const { fetcher } = sources({ underminingFlags: ['Yes', 'Unknown'] })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-undermining')).toMatchObject({ status: 'mapped_flag', count: 2 })
    expect(body.sourceObservations.find((item: { id: string }) => item.id === 'mapped-undermining').summary).toContain('unrecognized')
    expect(body.checks.find((item: { id: string }) => item.id === 'undermining').status).toBe('mapped_flag')
  })

  it('does not award flood points without a matched covering feature ID', async () => {
    const { fetcher } = sources({ floodId: null })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'flood').status).toBe('unknown')
  })

  it('does not clear an intersecting slope with unrecognized attributes', async () => {
    const { fetcher } = sources({ slopeValue: 'Unknown' })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').status).toBe('unknown')
  })

  it('does not award use-table points from a nonapproved district record', async () => {
    const { fetcher } = sources({ zoneStatus: 'Pending' })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expect(body.status).toBe('pending')
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-use').status).toBe('unknown')
  })

  it('rejects bad origin and unknown request fields without touching sources', async () => {
    const { fetcher } = sources()
    const foreign = new Request('http://127.0.0.1:5175/api/screening/run', { method: 'POST', headers: { origin: 'https://other.example', 'content-type': 'application/json' }, body: JSON.stringify(input) })
    expect((await handleScreening(foreign, { fetcher })).status).toBe(403)
    expect((await handleScreening(request({ ...input, extra: true }), { fetcher })).status).toBe(422)
    expect((await handleScreening(request({ ...input, proposal: { ...input.proposal, proposedHomes: 1.5 } }), { fetcher })).status).toBe(422)
    expect((await handleScreening(request({ ...input, proposal: { ...input.proposal, proposedHomes: -1 } }), { fetcher })).status).toBe(422)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
