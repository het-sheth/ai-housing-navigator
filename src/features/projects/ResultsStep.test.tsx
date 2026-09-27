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

  it('shows tailored financial diligence once, after a mapped flag and before generic gaps', () => {
    const html = renderToStaticMarkup(<ResultsStep {...props} assessment={assessment} />)
    expect(html).toContain('applicable revenue or value assumptions')
    expect(html).toContain('funding or subsidy path')
    expect(html).not.toContain(genericFinance)
    expect(html.match(/Establish the applicable revenue or value assumptions/g)).toHaveLength(1)
    expect(html.indexOf('Review mapped slope with a surveyor.')).toBeLessThan(html.indexOf('Establish the applicable revenue or value assumptions'))
    expect(html.indexOf('Establish the applicable revenue or value assumptions')).toBeLessThan(html.indexOf(zoningGap))
    expect(html).toContain('Unassessed')
    expect(html).toContain('No Development Ease Score yet')
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
