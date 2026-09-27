import { displayPropertyAddress } from '../property/address-label'
import { sources } from '../../domain'
import { ACTIVITIES, type Draft, type DraftSummary } from './contracts'
import { type ScreeningCheck, type ScreeningResult } from './screening-client'
import { resultActions } from './result-actions'
import { SourceObservations } from './SourceObservations'
import type { OneHomeAssessment } from './one-home-assessment'

type Props = {
  draft: Draft
  summary: DraftSummary
  historical: boolean
  assessment: ScreeningResult | null
  assessmentStatus: 'idle' | 'loading' | 'ready' | 'error'
  assessmentError: string
  onRun: () => void
  onChangeParcel: () => void
  onEditProposal: () => void
}

function sourceDate(value: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
}

const statusLabel: Record<ScreeningCheck['status'], string> = { mapped_flag: 'Mapped flag', screened_low_friction: 'Screened finding', unknown: 'Verification needed', unsupported: 'Not yet supported', error: 'Source unavailable' }
const nextStep: Record<ScreeningCheck['status'], string> = { mapped_flag: 'Review this mapped finding with the relevant professional.', screened_low_friction: 'Confirm the source and applicable requirements.', unknown: 'Gather the missing evidence.', unsupported: 'Ask the responsible reviewer how this applies.', error: 'Retry this source check or verify the record directly.' }
const sourceLabel: Record<string, string> = { 'zoning-use': 'Pittsburgh zoning', 'zoning-other': 'Pittsburgh zoning', flood: 'FEMA flood map', slope: 'City slope map', undermining: 'City undermining map', process: 'City review guidance', infrastructure: 'Provider source' }

function CheckCard({ check, districtSource }: { check: ScreeningCheck; districtSource?: string | null }) {
  const metric = check.metricScore
  return <article className={`gp-check-card gp-check-${check.status}`}>
    <div className="gp-check-card-top"><h3>{check.label}</h3><span className="gp-check-status">{statusLabel[check.status]}</span></div>
    <p>{check.reason}</p>
    {metric ? <div className="gp-check-metric"><strong>Screen score {metric.value}/{metric.max}</strong><span>{metric.scope}. {metric.rule}</span></div> : <p className="gp-check-unscored">Not scored</p>}
    <p className="gp-check-next"><strong>Next:</strong> {nextStep[check.status]}</p>
    <p className="gp-check-source">Source date: {sourceDate(check.sourceDate)}. Retrieved: {check.retrievedAt ? new Date(check.retrievedAt).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : 'Not checked'}. {check.sourceUrl && <a href={check.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel[check.id] ?? 'Source record'} ↗</a>}{check.id === 'zoning-use' && districtSource && <> · <a href={districtSource} target="_blank" rel="noreferrer">Zoning map ↗</a></>}</p>
  </article>
}

function OneHomeEvidence({ value }: { value: OneHomeAssessment }) {
  if (value.applicability !== 'applicable') return <section className="gp-one-home" aria-label="Development requirements"><h3>Development requirements</h3><p>{value.mappedDistrict ? `This proposal or mapped district ${value.mappedDistrict} is outside this focused review.` : 'The mapped district could not be confirmed for this focused review.'} The general property checks and next actions remain available.</p><a href={value.districtSourceUrl} target="_blank" rel="noreferrer">City zoning map ↗</a></section>
  const area = value.recordedLotArea
  const comparison = value.lotAreaComparison
  const lotText = area.status === 'available'
    ? `County recorded lot area ${Number(area.sqFt).toLocaleString('en-US')} sq ft; published base minimum ${Number(comparison.baseMinimumSqFt).toLocaleString('en-US')} sq ft. ${comparison.status === 'recorded_meets_base_minimum' ? 'Recorded area meets the base number only.' : 'Recorded area is below the base number.'}`
    : `County recorded lot area ${area.status === 'error' ? 'could not be retrieved' : 'is missing'}. The base number cannot be compared.`
  return <section className="gp-one-home" aria-label="Development requirements"><h3>Development requirements</h3><p>One new detached home on this mapped {value.mappedDistrict} parcel. This compares recorded area with published base dimensions; a survey, site plan, exceptions and reviewer determination are still needed.</p><p><strong>{lotText}</strong> {comparison.explanation}</p><p className="gp-one-home-sources">County <a href={area.sourceUrl} target="_blank" rel="noreferrer">recorded area ↗</a> (source date {sourceDate(area.sourceDate)}, retrieved {area.retrievedAt ? new Date(area.retrievedAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'not checked'}); City <a href={value.districtSourceUrl} target="_blank" rel="noreferrer">zoning map ↗</a> (retrieved {value.districtRetrievedAt ? new Date(value.districtRetrievedAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'not checked'}).</p>
    <details className="gp-details"><summary>Published base dimensions and needed evidence</summary><p>City <a href={value.rule.sourceUrl} target="_blank" rel="noreferrer">R1D table ↗</a>; section amendment effective {sourceDate(value.rule.sectionAmendmentEffectiveDate)}, reviewed {sourceDate(value.rule.reviewedAt)}. <a href={value.rule.exceptionsSourceUrl} target="_blank" rel="noreferrer">Lot exceptions ↗</a> require parcel-specific review, including plat or recording history.</p><table><caption>Base standards, not proposed design measurements</caption><tbody>{value.rule.requirements.map(item => <tr key={item.id}><th scope="row">{item.label}</th><td>{item.value.toLocaleString('en-US')} {item.unit === 'sq_ft' ? 'sq ft' : item.unit}</td><td>{item.qualification}</td></tr>)}</tbody></table><p><strong>Evidence to gather:</strong> {value.missingEvidence.join('; ')}.</p></details>
    <p className="gp-one-home-sources"><strong>City application:</strong> The newer City <a href={value.processGuidance.sourceUrl} target="_blank" rel="noreferrer">Building &amp; Development Application ↗</a> guidance says this is typically the initial application for a new structure, replacing separate ZDR and building permit applications (source date {sourceDate(value.processGuidance.sourceDate)}, reviewed {sourceDate(value.processGuidance.reviewedAt)}). <a href={value.processGuidance.conflictingSourceUrl} target="_blank" rel="noreferrer">Planning guidance ↗</a> still describes a separate ZDR. Ask PLI to confirm the current path and required reviews.</p>
    <p className="gp-one-home-sources"><strong>Water service:</strong> Ask the provider to confirm service area and give written availability or capacity evidence for the proposed service. <a href={value.waterGuidance.sourceUrl} target="_blank" rel="noreferrer">Tap review ↗</a> and <a href={value.waterGuidance.serviceAreaUrl} target="_blank" rel="noreferrer">service area ↗</a> guidance (source date {sourceDate(value.waterGuidance.sourceDate)}, reviewed {sourceDate(value.waterGuidance.reviewedAt)}).</p>
  </section>
}

export function ResultsStep({ draft, summary, historical, assessment, assessmentStatus, assessmentError, onRun, onChangeParcel, onEditProposal }: Props) {
  const activityDescription = draft.activities.map(id => ACTIVITIES.find(activity => activity.id === id)?.label).filter(Boolean).join(', ')
  const proposal = activityDescription || 'Work activities not selected'
  const canRun = Boolean(draft.parcelId && draft.propertyConfirmed && draft.propertyEvidence === 'live')
  const resolved = assessment?.checks.filter(check => ['mapped_flag', 'screened_low_friction'].includes(check.status)).length ?? 0
  const unfinished = assessment?.checks.filter(check => !['mapped_flag', 'screened_low_friction'].includes(check.status)).length ?? 0
  const actions = resultActions(assessment, summary)
  const priority = (check: ScreeningCheck) => check.status === 'mapped_flag' ? 0 : check.status === 'screened_low_friction' ? 1 : 2
  const orderedChecks = [...(assessment?.checks ?? [])].sort((a, b) => priority(a) - priority(b))

  return <>
    <section className="gp-result-proposal">
      <div><span className="gp-kicker">Project checked</span><h2>{draft.parcelId ? displayPropertyAddress(draft.propertyQuery, draft.parcelId) : draft.propertyQuery || 'Site unresolved'}</h2><p>{draft.parcelId && draft.propertyConfirmed ? `Parcel ${draft.parcelId}` : 'Parcel not confirmed'} · {proposal}</p>{draft.description.trim() && <p>{draft.description}</p>}</div>
      <div className="gp-property-summary-actions"><button className="gp-text-button" type="button" onClick={onEditProposal}>Edit proposal</button><button className="gp-text-button" type="button" onClick={onChangeParcel}>Change parcel</button></div>
    </section>
    <section className="gp-assessment" data-testid="assessment-panel">
      <div className="gp-assessment-heading"><div><span className="gp-kicker">Property evidence</span><h2>Check-by-check results</h2></div>{canRun && <button className="gp-secondary" type="button" data-testid="run-assessment-button" disabled={assessmentStatus === 'loading'} onClick={onRun}>{assessmentStatus === 'loading' ? 'Checking sources…' : assessment ? 'Run checks again' : assessmentStatus === 'error' ? 'Try checks again' : 'Run property checks'}</button>}</div>
      <p className="gp-coverage-note">{assessment ? assessment.checks.length ? `${resolved} checks returned findings · ${unfinished} need more evidence. No combined score or approval prediction.` : 'No property checks returned for this jurisdiction or parcel. Follow the next action to verify coverage. No combined score or approval prediction.' : assessmentStatus === 'loading' ? 'Checking public parcel, zoning and hazard sources.' : assessmentStatus === 'error' ? 'The source check did not finish. Your proposal and parcel selection remain saved.' : canRun ? 'Run public property checks for this confirmed parcel and proposal.' : 'Choose and confirm a parcel from live search to check this proposal.'}</p>
      {!canRun && <button className="gp-text-button" type="button" onClick={onChangeParcel}>Choose parcel</button>}
      {draft.tentativeActivities.length > 0 && <p>Tentative activities are not part of these property checks. Confirm the intended scope and run them again.</p>}
      {assessmentError && <p className="gp-error-message" role="alert">{assessmentError}</p>}
      {assessment && <>
        <p className="gp-result-run-note" role="status">{assessmentStatus === 'loading' ? 'Previous findings shown while checks rerun.' : assessmentStatus === 'error' ? 'Latest rerun failed. Previous findings and next actions remain available.' : 'Findings and next actions from the last successful run.'} Retrieved <time dateTime={assessment.retrievedAt}>{new Date(assessment.retrievedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</time>.</p>
        {assessment.oneHomeAssessment && <OneHomeEvidence value={assessment.oneHomeAssessment} />}
        <div className="gp-check-grid">{orderedChecks.map(check => <CheckCard key={check.id} check={check} districtSource={assessment.checks.find(item => item.id === 'zoning-other')?.sourceUrl} />)}</div>
        <details className="gp-details"><summary>Coverage and limits <span>{unfinished} unfinished</span></summary><p>Rubric: {assessment.rubricVersion}. {assessment.caveat}</p><p>A 2 means the named screen found a favorable condition; 0 means it found a mapped constraint. Missing evidence is unscored. These narrow scores are not confidence, permission or feasibility.</p></details>
        <SourceObservations observations={assessment.sourceObservations} />
      </>}
    </section>
    {assessment && <>
      {actions.length > 0 && <div className="gp-action-list" data-testid="next-action-list"><span className="gp-kicker">First action from these checks</span><article className="gp-task"><span className="gp-task-number">01</span><div><h2>{actions[0]}</h2></div></article>{actions.length > 1 && <details className="gp-details gp-more-actions"><summary>Other actions <span>{actions.length - 1}</span></summary>{actions.slice(1).map((action, index) => <article className="gp-task" key={action}><span className="gp-task-number">{String(index + 2).padStart(2, '0')}</span><div><h2>{action}</h2></div></article>)}</details>}</div>}
      <details className="gp-details gp-result-details"><summary>Proposal numbers and financial readiness</summary><div className="gp-result-outcomes"><span><strong>{draft.homesRetained ?? 'Not provided'}</strong>Homes retained</span><span><strong>{summary.netNew ?? 'Not provided'}</strong>Net new homes</span><span><strong>Unassessed</strong>Financial feasibility</span></div><p>These numbers come from your answers. The property checks above do not determine permission or financial feasibility.</p></details>
    </>}
    {historical && <details className="gp-details"><summary>Historical Lanark evidence</summary><p>The County assessment dated September 1, 2026 classifies vacant land. City permit research retrieved September 26, 2026 describes dwelling work. Present condition and lawful use remain unresolved.</p>{sources.filter(source => ['assessment', 'pli'].includes(source.id)).map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}</details>}
  </>
}
