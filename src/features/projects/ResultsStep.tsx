import { sources } from '../../domain'
import { ACTIVITIES, type Draft, type DraftSummary } from './contracts'
import { hasCompleteScreen, type ScreeningCheck, type ScreeningResult } from './screening-client'
import { resultActions } from './result-actions'
import { SourceObservations } from './SourceObservations'

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

function CheckSource({ check }: { check: ScreeningCheck }) {
  return <p>Source date: {sourceDate(check.sourceDate)}. Retrieved: {check.retrievedAt ? new Date(check.retrievedAt).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : 'Not checked'}. {check.sourceUrl && <a href={check.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a>}</p>
}

export function ResultsStep({ draft, summary, historical, assessment, assessmentStatus, assessmentError, onRun, onChangeParcel, onEditProposal }: Props) {
  const activityDescription = draft.activities.map(id => ACTIVITIES.find(activity => activity.id === id)?.label).filter(Boolean).join(', ')
  const proposal = draft.description.trim() || activityDescription || 'Proposal details have not been described yet.'
  const canRun = Boolean(draft.parcelId && draft.propertyConfirmed && draft.propertyEvidence === 'live')
  const incomplete = !assessment || !hasCompleteScreen(assessment) || draft.tentativeActivities.length > 0
  const findings = assessment?.checks.filter(check => ['mapped_flag', 'screened_low_friction'].includes(check.status)).sort((a, b) => (a.status === 'mapped_flag' ? 0 : 1) - (b.status === 'mapped_flag' ? 0 : 1)) ?? []
  const unfinished = assessment?.checks.filter(check => !['mapped_flag', 'screened_low_friction'].includes(check.status)) ?? []
  const actions = resultActions(assessment, summary)
  const title = assessment ? incomplete ? 'Assessment incomplete' : `${assessment.score?.lower}–${assessment.score?.upper} / 100` : assessmentStatus === 'loading' ? 'Checking property' : assessmentStatus === 'error' ? 'Checks unavailable' : canRun ? 'Ready to check' : 'Confirm a property'

  return <>
    <section className="gp-result-proposal">
      <span className="gp-kicker">Your proposal</span>
      <h2>{proposal}</h2>
      <p>{draft.propertyQuery || 'Site unresolved'}{draft.parcelId && draft.propertyConfirmed ? ` · Parcel ${draft.parcelId}` : ''}</p>
      <div className="gp-property-summary-actions"><button className="gp-text-button" type="button" onClick={onEditProposal}>Edit proposal</button><button className="gp-text-button" type="button" onClick={onChangeParcel}>Change parcel</button></div>
    </section>
    <section className="gp-assessment" data-testid="assessment-panel">
      <div className="gp-assessment-heading"><div><span className="gp-kicker">Development ease</span><h2>{title}</h2></div>{canRun && <button className="gp-secondary" type="button" data-testid="run-assessment-button" disabled={assessmentStatus === 'loading'} onClick={onRun}>{assessmentStatus === 'loading' ? 'Checking sources…' : assessment ? 'Run checks again' : assessmentStatus === 'error' ? 'Try checks again' : 'Run property checks'}</button>}</div>
      <p>{assessment ? incomplete ? 'No Development Ease Score yet. Some required checks are unknown, unsupported or unavailable.' : 'Preliminary mapped screen only. Review each source and unresolved requirement before using it.' : assessmentStatus === 'loading' ? 'Checking public parcel, zoning and hazard sources.' : assessmentStatus === 'error' ? 'The source check did not finish. Your proposal and parcel selection remain saved.' : canRun ? 'Run public property checks for this confirmed parcel and proposal.' : 'Choose and confirm a parcel from live search to check this proposal.'}</p>
      {!canRun && <button className="gp-text-button" type="button" onClick={onChangeParcel}>Choose parcel</button>}
      {draft.tentativeActivities.length > 0 && <p>Tentative activities are not part of these property checks. Confirm the intended scope and run them again.</p>}
      {assessmentError && <p className="gp-error-message" role="alert">{assessmentError}</p>}
      {assessment && <>
        <p role="status">{assessmentStatus === 'loading' ? 'Previous assessment shown while checks rerun.' : assessmentStatus === 'error' ? 'Latest rerun failed. Previous assessment and next actions remain available.' : 'Assessment and next actions from the last successful run.'} Retrieved <time dateTime={assessment.retrievedAt}>{new Date(assessment.retrievedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</time>.</p>
        <div className="gp-assessment-findings">{findings.map(check => <article key={check.id}><span className="gp-kicker">{check.status === 'mapped_flag' ? 'Mapped flag' : 'Mapped screen'}</span><h3>{check.label}</h3><p>{check.reason}</p></article>)}</div>
        <details className="gp-details"><summary>Unknown and unfinished checks <span>{unfinished.length}</span></summary>{unfinished.map(check => <article key={check.id} className="gp-check-detail"><strong>{check.label}</strong><p>{check.reason}</p></article>)}</details>
        <details className="gp-details"><summary>Screening source details</summary><p>Checked {new Date(assessment.retrievedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC. Rubric: {assessment.rubricVersion}. Source dates are unknown where a check does not name one.</p>{assessment.checks.map(check => <article key={check.id} className="gp-check-detail"><strong>{check.label}</strong><CheckSource check={check} /></article>)}<p>{assessment.caveat}</p></details>
        <SourceObservations observations={assessment.sourceObservations} />
      </>}
    </section>
    {assessment && <>
      {actions.length > 0 && <div className="gp-action-list" data-testid="next-action-list"><span className="gp-kicker">First action from these checks</span><article className="gp-task"><span className="gp-task-number">01</span><div><h2>{actions[0]}</h2></div></article>{actions.length > 1 && <details className="gp-details gp-more-actions"><summary>Other actions <span>{actions.length - 1}</span></summary>{actions.slice(1).map((action, index) => <article className="gp-task" key={action}><span className="gp-task-number">{String(index + 2).padStart(2, '0')}</span><div><h2>{action}</h2></div></article>)}</details>}</div>}
      <details className="gp-details gp-result-details"><summary>Proposal numbers and check coverage</summary><div className="gp-result-outcomes"><span><strong>{draft.homesRetained ?? 'Unknown'}</strong>Homes retained</span><span><strong>{summary.netNew ?? 'Unknown'}</strong>Net new homes</span><span><strong>Unassessed</strong>Financial feasibility</span></div><p>These numbers come from your answers. The property checks above do not determine permission or financial feasibility.</p></details>
    </>}
    {historical && <details className="gp-details"><summary>Historical Lanark evidence</summary><p>The County assessment dated September 1, 2026 classifies vacant land. City permit research retrieved September 26, 2026 describes dwelling work. Present condition and lawful use remain unresolved.</p>{sources.filter(source => ['assessment', 'pli'].includes(source.id)).map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}</details>}
  </>
}
