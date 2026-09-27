import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createDraft, summarizeDraft } from './contracts'
import { ReviewStep } from './ReviewStep'

describe('project review', () => {
  it('puts the property and selected work before optional details', () => {
    const draft = { ...createDraft(), propertyQuery: '2003 Mountford Avenue', parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' as const, activities: ['repair_remodel' as const, 'interior_conversion' as const], housingForm: 'attached' as const }
    const html = renderToStaticMarkup(<ReviewStep draft={draft} summary={summarizeDraft(draft)} historical={false} assessmentStatus="idle" assessmentError="" onChangeParcel={() => {}} onEditProposal={() => {}} onEditAnswers={() => {}} onRun={() => {}} />)
    expect(html.indexOf('2003 Mountford Avenue')).toBeLessThan(html.indexOf('Repair/remodel'))
    expect(html).toContain('Interior conversion')
    expect(html).toContain('Run property checks')
    expect(html).toContain('Not provided: Ground disturbance, Proposed total homes')
    expect(html).toContain('Attached / shares a wall (such as a rowhouse)')
    expect(html).toContain('Additional details not provided')
    expect(html).not.toContain('<dd>Not provided</dd>')
    expect(html).not.toContain('No written description supplied')
    expect(html).not.toContain('>?</strong>')
  })
})
