import { describe, expect, it, vi } from 'vitest'
import { assessOneHome } from './one-home.mjs'

const pin = '0042J00243000000'
const at = '2026-09-27T12:00:00.000Z'
const proposal = { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'yes' }

function assessment(area: unknown, options: { fail?: boolean; total?: number; parcelId?: string; date?: string } = {}) {
  const fetcher = vi.fn(async (value: string) => {
    const url = new URL(value)
    expect(url.hostname).toBe('data.wprdc.org')
    expect(url.searchParams.get('resource_id')).toBe('property_assessments_table')
    expect(url.searchParams.get('fields')).toBe('PARID,LOTAREA,ASOFDATE')
    expect(JSON.parse(url.searchParams.get('filters') ?? '{}')).toEqual({ PARID: pin })
    if (options.fail) throw Error('offline')
    return new Response(JSON.stringify({ success: true, result: { total: options.total ?? 1, records: [{ PARID: options.parcelId ?? pin, LOTAREA: area, ASOFDATE: options.date ?? '2026-09-01' }] } }))
  })
  return fetcher
}

describe('one new detached home evidence', () => {
  it('uses the reviewed R1D-H row and compares an equal recorded square-foot area', async () => {
    const fetcher = assessment(1200)
    const result = await assessOneHome(pin, proposal, 'R1D-H', fetcher, at)
    expect(result.applicability).toBe('applicable')
    expect(result.rule).toMatchObject({ status: 'reviewed_baseline', sourceDate: null, sectionAmendmentEffectiveDate: '2025-05-07' })
    expect(result.rule.exceptionsSourceUrl).toBe('https://ecode360.com/45479734')
    expect(result.rule.requirements.find((item: { id: string }) => item.id === 'minimum_lot_area')).toMatchObject({ value: 1200, unit: 'sq_ft' })
    expect(result.rule.requirements.find((item: { id: string }) => item.id === 'minimum_front_setback')).toMatchObject({ value: 15, unit: 'ft' })
    expect(result.recordedLotArea).toMatchObject({ status: 'available', sqFt: 1200, sourceDate: '2026-09-01', retrievedAt: at })
    expect(result.lotAreaComparison).toMatchObject({ status: 'recorded_meets_base_minimum', baseMinimumSqFt: 1200 })
    expect(result.lotAreaComparison.explanation).toContain('zoning compliance are unverified')
    expect(result.processGuidance.summary).toContain('separate ZDR')
    expect(result.waterGuidance.summary).toContain('provider')
    expect(result).not.toHaveProperty('metricScore')
    expect(result).not.toHaveProperty('score')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('uses the distinct R1D-L baseline and reports a recorded shortfall without a verdict', async () => {
    const result = await assessOneHome(pin, proposal, 'R1D-L', assessment(2999), at)
    expect(result.rule.requirements.find((item: { id: string }) => item.id === 'minimum_lot_area').value).toBe(3000)
    expect(result.lotAreaComparison.status).toBe('recorded_below_base_minimum')
    expect(result.lotAreaComparison.explanation).toContain('exceptions and zoning compliance are unverified')
  })

  it('includes site work within the same new-home proposal scope', async () => {
    const result = await assessOneHome(pin, { ...proposal, activities: ['new_construction', 'site_work'] }, 'R1D-H', assessment(3000), at)
    expect(result.applicability).toBe('applicable')
    expect(result.recordedLotArea.status).toBe('available')
  })

  it('does not fetch lot data or compare unsupported work or districts', async () => {
    for (const changed of [
      { ...proposal, activities: ['addition'] },
      { ...proposal, activities: ['new_construction', 'demolition'] },
      { ...proposal, proposedHomes: 2 },
      { ...proposal, housingForm: 'attached' },
    ]) {
      const fetcher = assessment(1200)
      const result = await assessOneHome(pin, changed, 'R1D-H', fetcher, at)
      expect(result.applicability).toBe('unsupported')
      expect(result.lotAreaComparison.status).toBe('out_of_scope')
      expect(fetcher).not.toHaveBeenCalled()
    }
    const fetcher = assessment(1200)
    const wrongDistrict = await assessOneHome(pin, proposal, 'R2-H', fetcher, at)
    expect(wrongDistrict.applicability).toBe('unsupported')
    expect(wrongDistrict.rule.status).toBe('out_of_scope')
    expect(wrongDistrict.rule.requirements).toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('treats unresolved district and missing lot area as unknown without comparing', async () => {
    const noDistrict = await assessOneHome(pin, proposal, null, assessment(1200), at)
    expect(noDistrict.applicability).toBe('unknown')
    expect(noDistrict.rule.status).toBe('unavailable')
    expect(noDistrict.districtRetrievedAt).toBeNull()
    const missing = await assessOneHome(pin, proposal, 'R1D-H', assessment(null), at)
    expect(missing.recordedLotArea.status).toBe('missing')
    expect(missing.lotAreaComparison.status).toBe('unknown')
    expect(missing.lotAreaComparison.baseMinimumSqFt).toBe(1200)
  })

  it('isolates source failure, duplicate rows, mismatched parcel and invalid date', async () => {
    for (const fetcher of [assessment(1200, { fail: true }), assessment(1200, { total: 2 }), assessment(1200, { parcelId: 'OTHER' })]) {
      const result = await assessOneHome(pin, proposal, 'R1D-H', fetcher, at)
      expect(result.recordedLotArea.status).toBe('error')
      expect(result.lotAreaComparison.status).toBe('unknown')
    }
    const invalidDate = await assessOneHome(pin, proposal, 'R1D-H', assessment(1200, { date: '2026-02-30' }), at)
    expect(invalidDate.recordedLotArea.sourceDate).toBeNull()
  })
})
