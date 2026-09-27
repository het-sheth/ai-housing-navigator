import { displayPropertyAddress } from '../property/address-label'
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

  const checkInputs = [
    ['Building type', draft.housingForm === 'unknown' ? null : draft.housingForm === 'attached' ? 'Attached / shares a wall (such as a rowhouse)' : 'Detached / standalone building'],
    ['Ground disturbance', draft.groundDisturbance === 'unknown' ? null : draft.groundDisturbance === 'yes' ? 'Yes' : 'No'],
    ['Proposed total homes', draft.proposedHomes === null ? null : String(draft.proposedHomes)],
  ]
  const missingInputs = checkInputs.filter(([, value]) => value === null).map(([label]) => label)
  const goals = [
    ['Homes retained', draft.homesRetained === null ? null : String(draft.homesRetained)],
    ['Net new homes', summary.netNew === null ? null : String(summary.netNew)],
    ['Affordability goal', draft.affordabilityGoal.trim() || null],
    ['Essential non-housing uses', draft.essentialUses.trim() || null],
  ].filter(([, value]) => value !== null)

  return <div className="gp-review">
    <section className="gp-review-card gp-review-primary">
      <div className="gp-review-card-top"><span className="gp-kicker">Property</span><button className="gp-text-button" type="button" onClick={onChangeParcel}>Change parcel</button></div>
      <h2>{draft.parcelId ? displayPropertyAddress(draft.propertyQuery, draft.parcelId) : draft.propertyQuery || 'Property not identified'}</h2>
      <p>{draft.parcelId && draft.propertyConfirmed ? `Parcel ${draft.parcelId}` : 'Confirm a parcel before running checks'}{historical && ' · Historical example'}</p>
    </section>
    <section className="gp-review-card gp-review-primary">
      <div className="gp-review-card-top"><span className="gp-kicker">Proposed work</span><button className="gp-text-button" type="button" onClick={onEditProposal}>Edit work</button></div>
      {work.length ? <ul className="gp-review-work">{work.map(item => <li key={item}>{item}</li>)}</ul> : <p>Work activities not selected</p>}
      {tentative.length > 0 && <p className="gp-review-tentative">Tentative: {tentative.join(', ')}. Confirm this scope before relying on property checks.</p>}
      {draft.description.trim() && <p className="gp-review-description">{draft.description}</p>}
    </section>
    <section className="gp-review-card">
      <div className="gp-review-card-top"><h2>Inputs used by property checks</h2><button className="gp-text-button" type="button" onClick={onEditProposal}>Edit check inputs</button></div>
      <dl>{checkInputs.filter(([, value]) => value !== null).map(([label, value]) => <div key={label!}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {missingInputs.length > 0 && <p>Not provided: {missingInputs.join(', ')}. You can continue; checks needing these answers will remain unassessed.</p>}
      <p className="gp-helper">Building type and home count inform the supported zoning-use check. Ground disturbance informs the slope follow-up.</p>
    </section>
    <details className="gp-details gp-review-optional">
      <summary>Project goals <span>{goals.length ? `${goals.length} provided` : 'Additional details not provided'}</span></summary>
      {goals.length > 0 && <dl>{goals.map(([label, value]) => <div key={label!}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <p>These optional goals are saved with your proposal. They do not change property screening or establish financial feasibility.</p>
      <button className="gp-text-button" type="button" onClick={onEditAnswers}>Edit goals and financial answers</button>
    </details>
    <div className="gp-review-run">
      <p>Checks use available public records for this parcel and proposal. They do not determine permission or financial feasibility.</p>
      <button className="gp-primary" type="button" data-testid="run-assessment-button" disabled={assessmentStatus === 'loading'} onClick={canRun ? onRun : onChangeParcel}>{assessmentStatus === 'loading' ? 'Checking sources…' : canRun ? 'Run property checks' : 'Choose a property'}</button>
      {assessmentError && <p className="gp-error-message" role="alert">{assessmentError}</p>}
    </div>
  </div>
}
