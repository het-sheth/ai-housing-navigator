import { ACTIVITIES, type Draft, type DraftSummary } from './contracts'

type Props = {
  draft: Draft
  summary: DraftSummary
  historical: boolean
  assessmentStatus: 'idle' | 'loading' | 'ready' | 'error'
  assessmentError: string
  onChangeParcel: () => void
  onEditProposal: () => void
  onEditAnswers: () => void
  onRun: () => void
}

const labelFor = (id: Draft['activities'][number]) => ACTIVITIES.find(activity => activity.id === id)?.label ?? id

export function ReviewStep({ draft, summary, historical, assessmentStatus, assessmentError, onChangeParcel, onEditProposal, onEditAnswers, onRun }: Props) {
  const canRun = Boolean(draft.parcelId && draft.propertyConfirmed && draft.propertyEvidence === 'live')
  const work = draft.activities.map(labelFor)
  const tentative = draft.tentativeActivities.map(labelFor)

  return <div className="gp-review">
    <section className="gp-review-card gp-review-primary">
      <div className="gp-review-card-top"><span className="gp-kicker">Property</span><button className="gp-text-button" type="button" onClick={onChangeParcel}>Change parcel</button></div>
      <h2>{draft.propertyQuery || 'Property not identified'}</h2>
      <p>{draft.parcelId && draft.propertyConfirmed ? `Parcel ${draft.parcelId}` : 'Confirm a parcel before running checks'}{historical && ' · Historical example'}</p>
    </section>
    <section className="gp-review-card gp-review-primary">
      <div className="gp-review-card-top"><span className="gp-kicker">Proposed work</span><button className="gp-text-button" type="button" onClick={onEditProposal}>Edit work</button></div>
      {work.length ? <ul className="gp-review-work">{work.map(item => <li key={item}>{item}</li>)}</ul> : <p>Work activities not selected</p>}
      {tentative.length > 0 && <p className="gp-review-tentative">Tentative: {tentative.join(', ')}. Confirm this scope before relying on property checks.</p>}
      {draft.description.trim() && <p className="gp-review-description">{draft.description}</p>}
    </section>
    <details className="gp-details gp-review-optional">
      <summary>Other project details <span>Optional answers</span></summary>
      <dl>
        <div><dt>Housing form</dt><dd>{draft.housingForm === 'unknown' ? 'Not provided' : draft.housingForm === 'attached' ? 'Attached' : 'Detached'}</dd></div>
        <div><dt>Ground disturbance</dt><dd>{draft.groundDisturbance === 'unknown' ? 'Not provided' : draft.groundDisturbance === 'yes' ? 'Yes' : 'No'}</dd></div>
        <div><dt>Proposed total homes</dt><dd>{draft.proposedHomes ?? 'Not provided'}</dd></div>
        <div><dt>Homes retained</dt><dd>{draft.homesRetained ?? 'Not provided'}</dd></div>
        <div><dt>Net new homes</dt><dd>{summary.netNew ?? 'Not provided'}</dd></div>
        <div><dt>Affordability goal</dt><dd>{draft.affordabilityGoal.trim() || 'Not provided'}</dd></div>
        <div><dt>Essential non-housing uses</dt><dd>{draft.essentialUses.trim() || 'Not provided'}</dd></div>
      </dl>
      <div className="gp-review-edit-actions"><button className="gp-text-button" type="button" onClick={onEditProposal}>Edit housing form or ground work</button><button className="gp-text-button" type="button" onClick={onEditAnswers}>Edit homes or financial answers</button></div>
    </details>
    <div className="gp-review-run">
      <p>Checks use available public records for this parcel and proposal. They do not determine permission or financial feasibility.</p>
      <button className="gp-primary" type="button" data-testid="run-assessment-button" disabled={assessmentStatus === 'loading'} onClick={canRun ? onRun : onChangeParcel}>{assessmentStatus === 'loading' ? 'Checking sources…' : canRun ? 'Run property checks' : 'Choose a property'}</button>
      {assessmentError && <p className="gp-error-message" role="alert">{assessmentError}</p>}
    </div>
  </div>
}
