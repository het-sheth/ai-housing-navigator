import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createComparison } from './comparison-model'
import type { ScreeningResult } from '../projects/screening-client'

vi.mock('../projects/SiteContextMap', () => ({ SiteContextMap: () => null }))
vi.stubGlobal('window', { location: { search: '' } })
const { ProposalCard } = await import('./ProposalComparison')
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
    expect(html).toContain('No combined score')
    expect(html).not.toContain('87')
    expect(html).not.toContain('Development Ease Score:')
  })
})
