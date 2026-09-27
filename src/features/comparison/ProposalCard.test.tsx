import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createComparison } from './comparison-model'
import type { ScreeningResult } from '../projects/screening-client'

vi.mock('../projects/SiteContextMap', () => ({ SiteContextMap: () => null }))
vi.stubGlobal('window', { location: { search: '' } })
const { ProposalCard, ComparisonSummary } = await import('./ProposalComparison')
afterAll(() => vi.unstubAllGlobals())

describe('comparison result presentation', () => {
  it('does not display a combined score from a legacy complete snapshot', () => {
    const parcelId = '0046R00029000000'
    const input = createComparison(parcelId).proposals.A.input
    const result: ScreeningResult = {
      status: 'scored', score: { lower: 87, upper: 87 }, rubricVersion: 'legacy', parcelId,
      proposal: input, municipality: 'Pittsburgh', nextActions: [], retrievedAt: '2026-09-27T12:00:00Z', caveat: 'Legacy result',
      checks: ['zoning-use', 'zoning-other', 'flood', 'slope', 'undermining', 'process', 'infrastructure'].map(id => ({ id, label: id, status: 'screened_low_friction', reason: 'Legacy evidence', sourceUrl: null, sourceDate: null, retrievedAt: null })),
    }
    const html = renderToStaticMarkup(<ProposalCard side="A" input={input} result={result} state="idle" error="" canRun onInput={() => {}} onRun={() => {}} />)
    expect(html).toContain('7 named checks returned')
    expect(html).not.toContain('87')
    expect(html).not.toContain('Development Ease Score:')
  })

  it('shows shared findings once with both run dates and deduplicated actions', () => {
    const comparison = createComparison('0046R00029000000')
    const flood = { id: 'flood', label: 'FEMA mapped flood zone', status: 'screened_low_friction' as const, reason: 'Whole parcel X', sourceUrl: 'https://example.org/fema', sourceDate: '2026-09-01', retrievedAt: '2026-09-27T12:00:00Z', metricScore: { value: 2 as const, max: 2 as const, scope: 'Whole parcel X', rule: 'FEMA minimal-hazard map' } }
    const base: ScreeningResult = { status: 'pending', score: null, rubricVersion: 'test', parcelId: comparison.parcelId, proposal: comparison.proposals.A.input, municipality: 'Pittsburgh', checks: [flood], nextActions: ['Confirm panel'], retrievedAt: '2026-09-27T12:00:00Z', caveat: 'Incomplete' }
    comparison.proposals.A.result = base
    comparison.proposals.B.result = { ...base, retrievedAt: '2026-09-28T12:00:00Z', checks: [{ ...flood, retrievedAt: '2026-09-28T12:00:00Z' }] }
    const html = renderToStaticMarkup(<ComparisonSummary comparison={comparison} />)
    expect(html.match(/Whole parcel X/g)?.length).toBeGreaterThan(0)
    expect(html.match(/FEMA mapped flood zone/g)).toHaveLength(1)
    expect(html).toContain('2/2 for this rule')
    expect(html).toContain('Scope: Whole parcel X')
    expect(html).toContain('9/27/2026')
    expect(html).toContain('9/28/2026')
    expect(html.match(/Confirm panel/g)).toHaveLength(1)
    expect(html).not.toContain('Development Ease Score:')
  })
})
