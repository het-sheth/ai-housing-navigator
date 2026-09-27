import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createDraft, summarizeDraft } from './contracts'
import { ResultsStep } from './ResultsStep'
import type { ScreeningResult } from './screening-client'

const genericFinance = 'Establish project budget, rents or sales assumptions, and funding path; financial feasibility is unassessed.'
const zoningGap = 'Review zoning overlays, dimensions, lawful baseline and applicable City process for this proposal.'

describe('results next actions', () => {
  const draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' as const, financial: { budget: 'yes' as const, value: 'unknown' as const, funding: 'no' as const } }
  const summary = summarizeDraft(draft)
  const props = { draft, summary, historical: false, assessmentStatus: 'ready' as const, assessmentError: '', onRun: () => {}, onChangeParcel: () => {}, onEditProposal: () => {} }
  const assessment: ScreeningResult = { status: 'pending', score: null, parcelId: draft.parcelId, proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }, municipality: 'Pittsburgh', checks: [], nextActions: ['Review mapped slope with a surveyor.', zoningGap, 'Confirm utility capacity and access with the relevant providers before relying on development feasibility.', genericFinance], rubricVersion: 'test', retrievedAt: '2026-09-27T12:00:00Z', caveat: 'Incomplete.' }

  it('shows no next actions before property checks run', () => {
    const html = renderToStaticMarkup(<ResultsStep {...props} assessment={null} />)
    expect(html).not.toContain('next-action-list')
    expect(html).not.toContain('Gather financial assumptions')
  })

  it('calls out empty coverage without implying checks are complete', () => {
    const html = renderToStaticMarkup(<ResultsStep {...props} assessment={assessment} />)
    expect(html).toContain('No property checks returned')
    expect(html).not.toContain('0 need more evidence')
    expect(html).toContain('Review mapped slope with a surveyor.')
  })

  it('shows each check with its status, evidence and source date', () => {
    const withChecks: ScreeningResult = { ...assessment, checks: [{ id: 'flood', label: 'Flood hazard', status: 'mapped_flag', reason: 'Mapped overlap found.', sourceUrl: 'https://example.org/flood', sourceDate: '2026-09-01', retrievedAt: '2026-09-27T12:00:00Z' }, { id: 'slope', label: 'Slope', status: 'unknown', reason: 'Survey needed.', sourceUrl: null, sourceDate: null, retrievedAt: null }] }
    const html = renderToStaticMarkup(<ResultsStep {...props} assessment={withChecks} />)
    expect(html).toContain('Check-by-check results')
    expect(html).toContain('Mapped flag')
    expect(html).toContain('Mapped overlap found.')
    expect(html).toContain('September 1, 2026')
    expect(html).toContain('https://example.org/flood')
    expect(html).toContain('Verification needed')
    expect(html).toContain('Survey needed.')
    expect(html).toContain('Not scored')
    expect(html).not.toContain('Assessment incomplete</h2>')
  })

  it('puts mapped concerns and findings before unassessed gaps without mutating evidence', () => {
    const checks: ScreeningResult['checks'] = [
      { id: 'process', label: 'Permit path', status: 'unknown', reason: 'Not assessed', sourceUrl: null, sourceDate: null, retrievedAt: null },
      { id: 'flood', label: 'Flood finding', status: 'screened_low_friction', reason: 'Minimal mapped hazard', sourceUrl: null, sourceDate: null, retrievedAt: null },
      { id: 'slope', label: 'Slope finding', status: 'mapped_flag', reason: 'Mapped concern', sourceUrl: null, sourceDate: null, retrievedAt: null },
    ]
    const html = renderToStaticMarkup(<ResultsStep {...props} assessment={{ ...assessment, checks }} />)
    expect(html.indexOf('Slope finding')).toBeLessThan(html.indexOf('Flood finding'))
    expect(html.indexOf('Flood finding')).toBeLessThan(html.indexOf('Permit path'))
    expect(checks.map(check => check.id)).toEqual(['process', 'flood', 'slope'])
  })

  it('shows tailored financial diligence once, after a mapped flag and before generic gaps', () => {
    const html = renderToStaticMarkup(<ResultsStep {...props} assessment={assessment} />)
    expect(html).toContain('applicable revenue or value assumptions')
    expect(html).toContain('funding or subsidy path')
    expect(html).not.toContain(genericFinance)
    expect(html.match(/Establish the applicable revenue or value assumptions/g)).toHaveLength(1)
    expect(html.indexOf('Review mapped slope with a surveyor.')).toBeLessThan(html.indexOf('Establish the applicable revenue or value assumptions'))
    expect(html.indexOf('Establish the applicable revenue or value assumptions')).toBeLessThan(html.indexOf(zoningGap))
    expect(html).toContain('Unassessed')
    expect(html).toContain('No combined score')
  })

  it('requests professional review when all financial inputs are present', () => {
    const readyDraft = { ...draft, financial: { budget: 'yes' as const, value: 'yes' as const, funding: 'yes' as const } }
    const html = renderToStaticMarkup(<ResultsStep {...props} draft={readyDraft} summary={summarizeDraft(readyDraft)} assessment={assessment} />)
    expect(html).toContain('Have the financial assumptions reviewed')
    expect(html).not.toContain('Gather financial assumptions before further spending')
    expect(html).not.toContain(genericFinance)
    expect(html).toContain('Unassessed')
  })
})
