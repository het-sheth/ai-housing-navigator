import { useEffect, useRef, useState } from 'react'
import { ACTIVITIES, createDraft } from '../projects/contracts'
import { hasConfirmedParcel, loadProperty, type PropertyDetail } from '../projects/property-client'
import { requestScreening, type ScreeningCheck, type ScreeningResult } from '../projects/screening-client'
import { SiteContextMap } from '../projects/SiteContextMap'
import { compareActions, compareChecks, compareInputs, compareObservations, createComparison, updateProposal, validParcelId, type Comparison, type ProposalInput } from './comparison-model'
import { loadComparison, saveComparison } from './comparison-store'
import '../projects/guided-project.css'
import './proposal-comparison.css'
import { AppHeader } from '../../components/AppHeader'
import { SourceObservations } from '../projects/SourceObservations'
import { CloudSaveButton } from '../account/CloudSaveButton'
import { displayPropertyAddress } from '../property/address-label'

type Side = 'A' | 'B'
type RunState = 'idle' | 'loading' | 'error'
const initialParcelId = new URLSearchParams(window.location.search).get('parcelId')?.trim() ?? ''

const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : 'Unknown'
const sourceHref = (value: string | null) => value && /^https?:\/\//i.test(value) ? value : null

function CheckSource({ check, side }: { check: ScreeningCheck; side: Side }) {
  const url = sourceHref(check.sourceUrl)
  return <p className="pc-check-source"><strong>{side} source:</strong> Source date {check.sourceDate || 'unknown'}, retrieved {dateLabel(check.retrievedAt)}. {url && <a href={url} target="_blank" rel="noreferrer">View source ↗</a>}</p>
}

function MetricScore({ check }: { check: ScreeningCheck }) {
  return check.metricScore ? <p className="pc-metric"><strong>{check.metricScore.value}/{check.metricScore.max} for this rule</strong>. Scope: {check.metricScore.scope}. Rule: {check.metricScore.rule}.</p> : <p className="pc-unscored">Unscored for this proposal and evidence.</p>
}

function CheckLine({ item }: { item: ReturnType<typeof compareChecks>[number] }) {
  const shared = item.kind === 'shared' || item.kind === 'source_changed'
  return <li className="pc-check" data-testid={`check-${item.id}`}><div className="pc-check-heading"><strong>{item.label}</strong><span>{item.kind === 'coverage_changed' ? 'Coverage or input differs' : item.kind === 'finding_changed' ? 'Returned finding differs' : item.kind === 'source_changed' ? 'Source reference differs' : 'Same returned finding'}</span></div>
    {shared && item.a && item.b ? <>
      <p><strong>{item.a.status.replaceAll('_', ' ')}</strong>. {item.a.reason}</p>
      <MetricScore check={item.a} />
      <CheckSource check={item.a} side="A" /><CheckSource check={item.b} side="B" />
    </> : <div className="pc-check-sides">{(['A', 'B'] as const).map(side => {
      const check = side === 'A' ? item.a : item.b
      return <div key={side}><strong>{side}</strong>{check ? <><p>{check.status.replaceAll('_', ' ')}. {check.reason}</p><MetricScore check={check} /><CheckSource check={check} side={side} /></> : <p>No returned check for {side}.</p>}</div>
    })}</div>}
  </li>
}

export function ProposalCard({ side, input, result, state, error, canRun, onInput, onRun }: { side: Side; input: ProposalInput; result: ScreeningResult | null; state: RunState; error: string; canRun: boolean; onInput: (input: ProposalInput) => void; onRun: () => void }) {
  const set = (change: Partial<ProposalInput>) => onInput({ ...input, ...change })
  return <section className="pc-proposal" aria-labelledby={`proposal-${side}`} data-testid={`proposal-${side}`}>
    <div className="pc-proposal-head"><span className="gp-kicker">Your plan</span><h2 id={`proposal-${side}`}>Proposal {side}</h2></div>
    <label className="gp-label" htmlFor={`description-${side}`}>What would you do here?</label>
    <textarea className="gp-input" id={`description-${side}`} value={input.description} maxLength={4000} placeholder="Describe the work in your own words" onChange={event => set({ description: event.target.value })} />
    <fieldset className="gp-fieldset"><legend>Work activities</legend><div className="pc-activities">{ACTIVITIES.map(activity => <label className="gp-check" key={activity.id}><input type="checkbox" checked={input.activities.includes(activity.id)} onChange={event => set({ activities: event.target.checked ? [...input.activities, activity.id] : input.activities.filter(id => id !== activity.id) })} />{activity.label}</label>)}</div></fieldset>
    <div className="pc-fields"><label>Number of homes proposed<input className="gp-input" type="number" min="0" step="1" value={input.proposedHomes ?? ''} placeholder="Unknown" onChange={event => { const value = event.target.value; if (value === '' || /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) set({ proposedHomes: value === '' ? null : Number(value) }) }} /></label><label>Building type<select className="gp-input" value={input.housingForm} onChange={event => set({ housingForm: event.target.value as ProposalInput['housingForm'] })}><option value="unknown">Unknown</option><option value="detached">Detached / standalone</option><option value="attached">Attached / shares a wall (rowhouse)</option></select></label><label>Ground disturbance<select className="gp-input" value={input.groundDisturbance} onChange={event => set({ groundDisturbance: event.target.value as ProposalInput['groundDisturbance'] })}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label></div>
    <p className="gp-helper">These are your inputs. The public sources do not verify the proposed work or home count.</p>
    <button className="gp-secondary" type="button" data-testid={`run-${side}`} disabled={!canRun || state === 'loading' || input.activities.length === 0} onClick={onRun}>{state === 'loading' ? 'Checking sources…' : result ? `Run ${side} again` : `Run checks for ${side}`}</button>
    {input.activities.length === 0 && <p className="gp-helper">Select at least one work activity to run checks.</p>}
    {!canRun && <p className="gp-helper">Confirm current County parcel records to run new checks.</p>}
    {error && <p className="gp-error-message" role="alert">{error} {result && 'The dated prior result remains in the comparison below.'}</p>}
    {result ? <div className="pc-result" data-testid={`result-${side}`}><strong>{error ? 'Prior run' : 'Last run'}</strong> {dateLabel(result.retrievedAt)}. {result.checks.length} named checks returned. Findings, dates and next actions appear once below.</div> : <p className="pc-unrun">Checks have not run for proposal {side}. No source finding or next action is available yet.</p>}
  </section>
}

export function ComparisonSummary({ comparison }: { comparison: Comparison }) {
  const inputChanges = compareInputs(comparison.proposals.A.input, comparison.proposals.B.input)
  const a = comparison.proposals.A.result
  const b = comparison.proposals.B.result
  const differences = compareChecks(a, b)
  const changed = differences.filter(item => item.kind !== 'shared')
  const shared = differences.filter(item => item.kind === 'shared')
  const actions = compareActions(a, b)
  const observationChanges = compareObservations(a, b).filter(item => item.changed)
  return <section className="pc-differences" data-testid="comparison-differences">
    <span className="gp-kicker">One site, two plans</span><h2>What differs, and what stays the same</h2>
    <p>These are separate dated runs. A difference in coverage or your inputs is not a changed public source fact. No combined score or approval probability is calculated, and no comparison declares a winning proposal.</p>
    <h3>Your inputs</h3>
    <p>These are your plans and assumptions, not County findings.</p>
    {inputChanges.length ? <ul className="pc-input-differences">{inputChanges.map(change => <li key={change.label}><strong>{change.label}</strong><span>A: {change.a}</span><span>B: {change.b}</span></li>)}</ul> : <p>A and B have the same entered inputs.</p>}
    {(a || b) ? <>
      <h3>Changed findings and coverage</h3>
      {(!a || !b) && <p>Only {a ? 'A' : 'B'} has a dated run. Its findings remain available while the other proposal is unrun.</p>}
      {changed.length ? <ul className="pc-checks">{changed.map(item => <CheckLine item={item} key={item.id} />)}</ul> : <p>No returned finding or coverage differences.</p>}
      <h3>Shared findings</h3>
      {shared.length ? <ul className="pc-checks">{shared.map(item => <CheckLine item={item} key={item.id} />)}</ul> : <p>No identical findings returned by both runs.</p>}
      {observationChanges.length > 0 && <><h3>Supplementary source differences</h3><p>These mapped or record observations do not complete a rubric check. Compare the sources before treating a difference as a change on site.</p><ul className="pc-checks">{observationChanges.map(item => <li className="pc-check" key={item.id}><strong>{item.id.replaceAll('-', ' ')}</strong>{(['A', 'B'] as const).map(side => {
        const observation = side === 'A' ? item.a : item.b
        return <p key={side}>{side}: {observation ? <>{observation.status.replaceAll('_', ' ')}. {observation.summary} Source date {observation.sourceDate || 'unknown'}, retrieved {dateLabel(observation.retrievedAt)}. {sourceHref(observation.sourceUrl) && <a href={observation.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a>}</> : 'No observation returned.'}</p>
      })}</li>)}</ul></>}
    </> : <p>Run checks for both proposals to compare source findings.</p>}
    <h3>Next actions</h3>
    {actions.length ? <ol className="pc-actions">{actions.map(action => <li key={action.text}><span>{action.sides.length === 2 ? 'Both' : action.sides[0]}</span>{action.text}</li>)}</ol> : <p>No source actions returned yet.</p>}
    {(a || b) && <details className="gp-details pc-run-details"><summary>Run limits and supplementary observations <span>A {a?.sourceObservations?.length ?? 0} · B {b?.sourceObservations?.length ?? 0}</span></summary>
      {(['A', 'B'] as const).map(side => {
        const result = side === 'A' ? a : b
        return <div key={side}><h4>Proposal {side}</h4>{result ? <><p>Checked {dateLabel(result.retrievedAt)}. Jurisdiction: {result.municipality}. Rubric: {result.rubricVersion}. {result.caveat}</p><SourceObservations observations={result.sourceObservations} /></> : <p>No run yet.</p>}</div>
      })}
    </details>}
  </section>
}

export default function ProposalComparison() {
  const [parcelInput, setParcelInput] = useState(initialParcelId)
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [detail, setDetail] = useState<PropertyDetail | null>(null)
  const [parcelLoading, setParcelLoading] = useState(false)
  const [parcelError, setParcelError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [runState, setRunState] = useState<Record<Side, RunState>>({ A: 'idle', B: 'idle' })
  const [runError, setRunError] = useState<Record<Side, string>>({ A: '', B: '' })
  const propertyRequest = useRef<AbortController | null>(null)
  const runRequests = useRef<Record<Side, AbortController | null>>({ A: null, B: null })
  const runEpoch = useRef<Record<Side, number>>({ A: 0, B: 0 })
  const comparisonCache = useRef(new Map<string, Comparison>())

  function remember(next: Comparison): Comparison {
    comparisonCache.current.set(next.parcelId, next)
    return next
  }

  function editParcel(value: string) {
    propertyRequest.current?.abort()
    setParcelLoading(false)
    setParcelInput(value)
    setParcelError('')
    if (value.trim() !== detail?.parcelId) {
      setDetail(null)
      runRequests.current.A?.abort(); runRequests.current.B?.abort()
      runEpoch.current.A += 1; runEpoch.current.B += 1
      setRunState({ A: 'idle', B: 'idle' })
    }
  }

  useEffect(() => {
    if (!validParcelId(initialParcelId)) return
    try {
      const saved = loadComparison(initialParcelId)
      setComparison(saved ? remember(saved) : null)
    } catch (error) { setStorageError(error instanceof Error ? error.message : 'Saved comparison could not be read.') }
  }, [])

  useEffect(() => {
    if (!comparison) return
    remember(comparison)
    try { saveComparison(comparison); setStorageError('') } catch { setStorageError('Device storage is unavailable. Keep this page open to preserve the comparison.') }
  }, [comparison])

  useEffect(() => () => { propertyRequest.current?.abort(); runRequests.current.A?.abort(); runRequests.current.B?.abort() }, [])

  async function confirmParcel() {
    const parcelId = parcelInput.trim()
    if (!validParcelId(parcelId)) { setParcelError('Enter an exact County parcel ID using letters, numbers, spaces or hyphens.'); return }
    if (comparison) remember(comparison)
    propertyRequest.current?.abort()
    const controller = new AbortController()
    propertyRequest.current = controller
    setParcelLoading(true)
    setParcelError('')
    try {
      const loaded = await loadProperty(parcelId, controller.signal)
      if (controller.signal.aborted) return
      if (!hasConfirmedParcel(loaded, parcelId)) throw new Error('County sources did not confirm this exact parcel. Check the ID and try again.')
      runRequests.current.A?.abort(); runRequests.current.B?.abort()
      runEpoch.current.A += 1; runEpoch.current.B += 1
      let saved: Comparison | null = null
      if (!comparisonCache.current.has(parcelId)) {
        try { saved = loadComparison(parcelId) } catch (error) { setStorageError(error instanceof Error ? error.message : 'Saved comparison could not be read.'); return }
      }
      setComparison(current => remember(current?.parcelId === parcelId ? current : comparisonCache.current.get(parcelId) ?? saved ?? createComparison(parcelId)))
      setDetail(loaded)
      setRunState({ A: 'idle', B: 'idle' })
      setRunError({ A: '', B: '' })
      window.history.replaceState(null, '', `/compare?parcelId=${encodeURIComponent(parcelId)}`)
    } catch (error) {
      if (!controller.signal.aborted) setParcelError(error instanceof Error && error.message !== 'source_unavailable' ? error.message : 'County parcel records could not load. Try again. Your saved comparison remains available.')
    } finally { if (!controller.signal.aborted) setParcelLoading(false) }
  }

  function changeInput(side: Side, input: ProposalInput) {
    runRequests.current[side]?.abort()
    runEpoch.current[side] += 1
    setComparison(current => current ? remember(updateProposal(current, side, input)) : null)
    setRunState(current => ({ ...current, [side]: 'idle' }))
    setRunError(current => ({ ...current, [side]: '' }))
  }

  async function run(side: Side) {
    if (!comparison || !detail || detail.parcelId !== comparison.parcelId || parcelInput.trim() !== comparison.parcelId || parcelLoading) { setRunError(current => ({ ...current, [side]: 'Load current parcel records before running checks.' })); return }
    const input = comparison.proposals[side].input
    if (!input.activities.length) return
    runRequests.current[side]?.abort()
    const controller = new AbortController()
    runRequests.current[side] = controller
    const epoch = ++runEpoch.current[side]
    setRunState(current => ({ ...current, [side]: 'loading' }))
    setRunError(current => ({ ...current, [side]: '' }))
    try {
      const draft = { ...createDraft(), parcelId: comparison.parcelId, propertyConfirmed: true, propertyEvidence: 'live' as const, activities: input.activities, proposedHomes: input.proposedHomes, housingForm: input.housingForm, groundDisturbance: input.groundDisturbance }
      const result = await requestScreening(draft, fetch, controller.signal)
      if (controller.signal.aborted || runEpoch.current[side] !== epoch) return
      setComparison(current => current && current.parcelId === result.parcelId && JSON.stringify(current.proposals[side].input) === JSON.stringify(input) ? remember({ ...current, proposals: { ...current.proposals, [side]: { input, result } } }) : current)
      setRunState(current => ({ ...current, [side]: 'idle' }))
    } catch {
      if (!controller.signal.aborted && runEpoch.current[side] === epoch) { setRunError(current => ({ ...current, [side]: 'Property checks could not finish. Retry when the source is available.' })); setRunState(current => ({ ...current, [side]: 'error' })) }
    }
  }

  return <div className="gp-app pc-app">
    <AppHeader current="/compare" />
    <main className="gp-layout pc-layout"><section className="gp-workspace pc-workspace">{comparison && <div className="gp-project-actions"><CloudSaveButton kind="comparison" title={`Proposal comparison: ${comparison.parcelId}`} data={comparison} /></div>}<span className="gp-eyebrow">One confirmed parcel · two independent proposals</span><h1>Compare what the evidence says.</h1><p className="gp-intro">Keep the same parcel while you test two ideas. The screens show checked source findings, unfinished factors and the next evidence to gather.</p>
      <section className="pc-parcel" aria-labelledby="pc-parcel-title"><span className="gp-kicker">Shared site</span><h2 id="pc-parcel-title">{detail?.assessment.record?.address ? displayPropertyAddress(detail.assessment.record.address, detail.parcelId) : 'Confirm the parcel'}</h2><p>Enter the exact Allegheny County parcel ID. A candidate from Explore is only a suggestion until County records confirm it here.</p><div className="pc-parcel-entry"><label className="gp-label" htmlFor="pc-parcel-id">Parcel ID</label><input className="gp-input" id="pc-parcel-id" value={parcelInput} maxLength={64} onChange={event => editParcel(event.target.value)} /><button className="gp-secondary" type="button" disabled={parcelLoading} onClick={() => void confirmParcel()}>{parcelLoading ? 'Checking County records…' : comparison?.parcelId === parcelInput.trim() ? 'Load current parcel records' : 'Confirm parcel'}</button></div>{parcelError && <p className="gp-error-message" role="alert">{parcelError}</p>}{storageError && <p className="gp-error-message" role="alert">{storageError}</p>}{comparison && <p className="pc-confirmed">Saved parcel {comparison.parcelId}. {detail?.parcelId === comparison.parcelId ? 'County observations loaded for this visit.' : 'Load current parcel records to see the map boundary and run new checks.'} Earlier results retain their own dates.</p>}{detail && <details className="gp-details"><summary>Parcel source and record dates</summary><p>County parcel {detail.parcelId}. Assessment: {detail.assessment.status}, source date {detail.assessment.sourceDate || 'unknown'}, retrieved {dateLabel(detail.assessment.retrievedAt)}. <a href={detail.assessment.sourceUrl} target="_blank" rel="noreferrer">Assessment source ↗</a></p><p>Boundary: {detail.boundary.status}, effective date {detail.boundary.sourceDate || 'unknown'}, retrieved {dateLabel(detail.boundary.retrievedAt)}. <a href={detail.boundary.sourceUrl} target="_blank" rel="noreferrer">Boundary source ↗</a></p></details>}</section>
      {comparison ? <><div className="pc-proposals">{(['A', 'B'] as const).map(side => <ProposalCard key={side} side={side} input={comparison.proposals[side].input} result={comparison.proposals[side].result} state={runState[side]} error={runError[side]} canRun={detail?.parcelId === comparison.parcelId && parcelInput.trim() === comparison.parcelId && !parcelLoading} onInput={input => changeInput(side, input)} onRun={() => void run(side)} />)}</div><ComparisonSummary comparison={comparison} /></> : <p className="pc-unrun">Confirm a parcel to open proposals A and B. Your comparison stays on this device.</p>}
      <p className="gp-note">This is a bounded public-record screen. It does not establish parcel control, availability, legal permission, approval probability or financial feasibility. The comparison is saved on this device while browser storage is available. If account saving is available, use Save to account above for an optional cloud copy.</p>
    </section><aside className="gp-aside"><SiteContextMap historical={false} detail={detail?.parcelId === comparison?.parcelId && parcelInput.trim() === comparison?.parcelId ? detail : null} savedParcelId={comparison?.parcelId === parcelInput.trim() ? comparison.parcelId : null} loading={parcelLoading} loadError={parcelError} onLoadCurrentRecords={() => void confirmParcel()} /></aside></main>
  </div>
}
