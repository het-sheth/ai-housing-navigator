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

function sources(options: { municipality?: string; zone?: string; zoneStatus?: string; slope?: boolean; slopeValue?: string; flood?: string; floodId?: number | null; fail?: string; parcelPin?: string; noParcel?: boolean } = {}) {
  const calls: URL[] = []
  const fetcher = vi.fn(async (value: string | URL | Request) => {
    const url = new URL(String(value))
    calls.push(url)
    if (options.fail && url.hostname.includes(options.fail)) throw new Error('offline')
    if (url.hostname === 'gisdata.alleghenycounty.us') return response({ type: 'FeatureCollection', features: options.noParcel ? [] : [{ properties: { PIN: options.parcelPin ?? pin }, geometry: polygon }] })
    if (url.pathname.includes('AlleghenyCountyMunicipalBoundaries')) return response({ features: [{ attributes: { OBJECTID: 1, NAME: options.municipality ?? 'PITTSBURGH', MUNICODE: options.municipality === 'SHARPSBURG' ? 852 : 100 } }] })
    if (url.pathname.includes('Zoning/MapServer')) return response({ features: [{ attributes: { OBJECTID: 2, zon_new: options.zone ?? 'R1D-L', full_zoning_type: 'R1D-L', status: options.zoneStatus ?? 'Approved' } }] })
    if (url.pathname.includes('PGHWebSlope25')) return response({ features: options.slope || options.slopeValue ? [{ attributes: { slope25: options.slopeValue ?? 'Yes' } }] : [] })
    if (url.hostname === 'hazards.fema.gov') return response({ features: [{ attributes: { OBJECTID: options.floodId === null ? undefined : options.floodId ?? 3, FLD_ZONE: options.flood ?? 'X', ZONE_SUBTY: 'AREA OF MINIMAL FLOOD HAZARD' } }] })
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
    expect(body.checks.find((check: { id: string }) => check.id === 'zoning-other').status).toBe('unknown')
    expect(calls.some(url => url.searchParams.get('spatialRel') === 'esriSpatialRelWithin')).toBe(true)
    expect(body.nextActions.some((action: string) => action.includes('utility'))).toBe(true)
  })

  it('keeps a mapped slope flag and proposed disturbance as documented friction', async () => {
    const { fetcher } = sources({ slope: true })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').status).toBe('mapped_flag')
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
  })

  it('keeps failed hazard source independent without showing a partial interval', async () => {
    const { fetcher } = sources({ fail: 'hazards.fema.gov' })
    const body = await (await handleScreening(request(), { fetcher })).json()
    expectUnscored(body)
    expect(body.checks.find((check: { id: string }) => check.id === 'flood').status).toBe('error')
    expect(body.checks.find((check: { id: string }) => check.id === 'slope').status).toBe('screened_low_friction')
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
