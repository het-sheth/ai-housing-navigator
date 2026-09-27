import { useEffect, useRef, useState } from 'react'
import { ACTIVITIES, type ActivityId } from '../projects/contracts'
import { requestSuggestions, type IntakeSuggestion } from '../projects/ai-client'
import { SiteContextMap } from '../projects/SiteContextMap'
import { loadProperty, type PropertyDetail } from '../projects/property-client'
import { searchCandidates, type CandidateSearch, type ExplorerCandidate, type RecordedUse } from './explorer-client'
import { reconcileCandidate } from './reconcile-candidate'
import '../projects/guided-project.css'
import './explorer.css'
import { AppHeader } from '../../components/AppHeader'
import { useAiAvailability } from '../projects/useAiAvailability'
import { AiAvailabilityNote } from '../projects/AiAvailabilityNote'
import { displayPropertyAddress } from '../property/address-label'

const useChoices: { value: RecordedUse; label: string; note: string }[] = [
  { value: 'vacant_land', label: 'Recorded vacant land', note: 'An assessment label, not proof that a site is empty or available.' },
  { value: 'single_family', label: 'Recorded single-family use', note: 'An assessment label, not verified current or lawful use.' },
  { value: 'any', label: 'Any recorded use', note: 'The housing idea will not narrow records by use.' },
]

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined, timeZone: 'UTC' }).format(date) : 'Unknown'
}

export default function PropertyExplorer() {
  const aiAvailability = useAiAvailability()
  const [idea, setIdea] = useState('')
  const [activities, setActivities] = useState<ActivityId[]>([])
  const [recordedUse, setRecordedUse] = useState<RecordedUse>('vacant_land')
  const [zip, setZip] = useState('')
  const [otherCriteria, setOtherCriteria] = useState('')
  const [suggestions, setSuggestions] = useState<IntakeSuggestion[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<ActivityId[]>([])
  const [question, setQuestion] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [search, setSearch] = useState<CandidateSearch | null>(null)
  const [candidate, setCandidate] = useState<ExplorerCandidate | null>(null)
  const [detail, setDetail] = useState<PropertyDetail | null>(null)
  const [phase, setPhase] = useState<'idle' | 'interpreting' | 'searching' | 'loading'>('idle')
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const aiRequest = useRef<AbortController | null>(null)
  const revision = useRef(0)
  const draftId = useRef(`explorer_${crypto.randomUUID()}`)

  useEffect(() => () => { request.current?.abort(); aiRequest.current?.abort() }, [])

  const cancel = () => { request.current?.abort(); request.current = null; setPhase('idle') }
  const resetResults = () => { cancel(); setSearch(null); setCandidate(null); setDetail(null); setError('') }
  const changeCriteria = () => { resetResults(); setConfirmed(false) }
  const toggleActivity = (id: ActivityId) => {
    aiRequest.current?.abort()
    if (phase === 'interpreting') { setPhase('idle'); setAiStatus('AI interpretation cancelled after your edit. You can retry it.') }
    setActivities(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }
  const changeIdea = (value: string) => {
    revision.current += 1
    aiRequest.current?.abort()
    setIdea(value)
    setSuggestions([])
    setSelectedSuggestions([])
    setQuestion(null)
    setAiStatus('')
    if (phase === 'interpreting') setPhase('idle')
  }
  const interpret = async () => {
    aiRequest.current?.abort()
    const controller = new AbortController()
    aiRequest.current = controller
    const currentRevision = revision.current
    setPhase('interpreting')
    setAiStatus('')
    try {
      const result = await requestSuggestions(idea.trim(), draftId.current, currentRevision, fetch, controller.signal)
      if (controller.signal.aborted || currentRevision !== revision.current) return
      setSuggestions(result.suggestions)
      setSelectedSuggestions(result.suggestions.filter(item => item.intent === 'confirmed_candidate').map(item => item.activityId))
      setQuestion(result.question)
      setAiStatus(result.suggestions.length ? 'AI proposed work activities below. Review and apply or discard them before searching. Site preferences and proposal fit remain unassessed.' : 'AI found no work activities to suggest. Your description and manual choices remain available.')
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : ''
      if (!controller.signal.aborted) setAiStatus(code === 'authentication_required' ? 'Sign in again to use AI. Your idea and manual choices are preserved.' : code === 'ai_limit_reached' ? 'The AI usage limit has been reached. Your idea is preserved and manual search remains available.' : 'AI interpretation is unavailable. Your idea is preserved. Select activities and search criteria manually, or retry AI.')
    } finally { if (!controller.signal.aborted) setPhase('idle') }
  }
  const runSearch = async () => {
    resetResults()
    const controller = new AbortController()
    request.current = controller
    setPhase('searching')
    try {
      const result = await searchCandidates({ recordedUse, zip: zip.trim() }, controller.signal)
      if (!controller.signal.aborted) setSearch(result)
    } catch {
      if (!controller.signal.aborted) setError('Assessment candidate search is unavailable. Your confirmed criteria are preserved; retry later.')
    } finally { if (!controller.signal.aborted) setPhase('idle') }
  }
  const inspect = async () => {
    if (!candidate) return
    cancel()
    setDetail(null)
    setError('')
    const controller = new AbortController()
    request.current = controller
    setPhase('loading')
    try {
      const result = await loadProperty(candidate.parcelId, controller.signal)
      if (!controller.signal.aborted && result.parcelId === candidate.parcelId) setDetail(result)
      else if (!controller.signal.aborted) setError('The parcel response did not match the selected ID. Please try again.')
    } catch {
      if (!controller.signal.aborted) setError('Parcel records could not be loaded. Please try again.')
    } finally { if (!controller.signal.aborted) setPhase('idle') }
  }
  const selectedUse = useChoices.find(choice => choice.value === recordedUse)!
  const applySuggestedWork = () => {
    setActivities(current => [...new Set([...current, ...selectedSuggestions])])
    setSuggestions([])
    setSelectedSuggestions([])
    setQuestion(null)
    setAiStatus('Selected AI suggestions added to your work activities. Review them before searching.')
  }
  const discardSuggestions = () => {
    setSuggestions([])
    setSelectedSuggestions([])
    setQuestion(null)
    setAiStatus('AI suggestions discarded. Your description and manual work choices remain.')
  }
  const zipValid = zip.trim() === '' || /^\d{5}$/.test(zip.trim())
  const reconciliation = detail && candidate ? reconcileCandidate(candidate, detail.assessment) : null
  const refreshedAddress = detail ? displayPropertyAddress(detail.assessment.record?.address, detail.parcelId) : null

  return <div className="ex-page">
    <AppHeader current="/explore" />
    <main className="ex-layout">
      <section className="ex-panel" aria-labelledby="ex-title">
        <div className="ex-intro"><span className="ex-eyebrow">01 / Explore a site</span><h1 id="ex-title">Find a parcel to study.</h1><p>Choose the work you have in mind, set the two available record filters, then inspect a candidate on the map.</p></div>
        {!confirmed ? <section className="ex-block" aria-label="Confirm search criteria">
          <h2>Work you want to explore</h2><p className="ex-note">Select every activity you are considering. These choices are project notes, not record filters or evidence that a parcel fits.</p>
          <fieldset><legend>Proposed work activities</legend><div className="ex-activity-grid">{ACTIVITIES.map(activity => <label key={activity.id}><input type="checkbox" checked={activities.includes(activity.id)} onChange={() => toggleActivity(activity.id)} />{activity.label}</label>)}</div></fieldset>
          <label htmlFor="ex-idea">Describe your idea in your own words (optional)</label><p className="ex-note">Keep the full description for review. This search does not evaluate the proposal or use its wording to filter records.</p><textarea id="ex-idea" value={idea} maxLength={4000} rows={5} placeholder="For example, convert an existing building into several homes" onChange={event => changeIdea(event.target.value)} />
          <details className="ex-ai-optional"><summary>Optional: ask AI to suggest work activities</summary><p className="ex-note">AI suggestions do not search property records or check whether a site fits. Review each suggestion before adding it.</p><button className="ex-secondary" type="button" aria-describedby="ex-ai-availability" disabled={aiAvailability !== 'ready' || !idea.trim() || phase === 'interpreting'} onClick={() => void interpret()}>{phase === 'interpreting' ? 'Interpreting…' : 'Suggest activities with AI'}</button><AiAvailabilityNote state={aiAvailability} id="ex-ai-availability" hasDescription={Boolean(idea.trim())} />{aiStatus && <p className="ex-note" role="status">{aiStatus}</p>}{suggestions.length > 0 && <div className="ex-suggestions"><strong>AI suggestions for review</strong>{suggestions.map(item => <div key={item.activityId} className="ex-suggestion">{item.intent === 'negated' ? <p>Excluded: {ACTIVITIES.find(activity => activity.id === item.activityId)?.label}. Your wording: “{item.quote}”</p> : <label><input type="checkbox" checked={selectedSuggestions.includes(item.activityId)} onChange={() => setSelectedSuggestions(current => current.includes(item.activityId) ? current.filter(id => id !== item.activityId) : [...current, item.activityId])} /><span><strong>Use AI suggestion: {ACTIVITIES.find(activity => activity.id === item.activityId)?.label}</strong><small>{item.intent === 'tentative' ? 'Tentative idea' : 'Suggested work'} · “{item.quote}” · {item.reason}</small></span></label>}</div>)}<div className="ex-suggestion-actions"><button className="ex-primary" type="button" disabled={selectedSuggestions.length === 0} onClick={applySuggestedWork}>Apply selected suggestions</button><button className="ex-secondary" type="button" onClick={discardSuggestions}>Discard suggestions</button></div></div>}{question && <p className="ex-question">Question to resolve: {question}</p>}</details>
          <div className="ex-search-filters"><h2>Filters sent to County record search</h2><p className="ex-note">Only recorded use and postal ZIP narrow the assessment records. The work, description and other needs above are not checked for fit.</p><label htmlFor="ex-recorded-use">Recorded use to search</label><select id="ex-recorded-use" value={recordedUse} onChange={event => setRecordedUse(event.target.value as RecordedUse)}>{useChoices.map(choice => <option value={choice.value} key={choice.value}>{choice.label}</option>)}</select><p className="ex-note">{selectedUse.note}</p><label htmlFor="ex-zip">Preferred postal ZIP (optional)</label><input id="ex-zip" inputMode="numeric" value={zip} maxLength={5} placeholder="15217" onChange={event => setZip(event.target.value)} />{!zipValid && <p className="ex-error">Enter five digits or leave ZIP blank.</p>}</div>
          <div className="ex-project-notes"><h2>Other project needs (not searched)</h2><label htmlFor="ex-other-criteria">Other needs or assumptions (optional)</label><textarea id="ex-other-criteria" value={otherCriteria} maxLength={500} rows={2} placeholder="For example, minimum lot area, transit access or price" onChange={event => setOtherCriteria(event.target.value)} /><p className="ex-note">Keep these notes for later review. Lot area, transit and price are not filters in this search.</p></div>
          {!activities.length && <p className="ex-note">Select at least one work activity to search. Multiple activities are allowed.</p>}
          {suggestions.length > 0 && <p className="ex-note" role="status">Apply or discard the AI suggestions before searching. Your manual choices remain available.</p>}
          <button className="ex-primary" type="button" disabled={!activities.length || !zipValid || phase === 'interpreting' || suggestions.length > 0} onClick={() => { setConfirmed(true); void runSearch() }}>Confirm criteria and find records</button>
        </section> : <>
          <section className="ex-confirmed ex-block"><div><span className="ex-eyebrow">Confirmed by you</span><h2>Search filters</h2><p><strong>Recorded use:</strong> {selectedUse.label}. <strong>Postal ZIP:</strong> {zip || 'Any'}.</p><div className="ex-confirmed-notes"><strong>Project notes, not searched</strong><p>Activities: {activities.map(id => ACTIVITIES.find(item => item.id === id)?.label).join(', ')}</p>{idea.trim() && <p className="ex-idea-full">{idea}</p>}{otherCriteria && <p>Other needs: {otherCriteria}</p>}</div></div><button type="button" onClick={changeCriteria}>Edit criteria</button></section>
          <section className="ex-block"><h2>Find candidate records</h2><p className="ex-note">Search the first 20 returned County assessment records with a Pittsburgh-labeled municipality and your confirmed recorded-use and ZIP filters. Record order is set by the source. City jurisdiction and proposal suitability need separate checks.</p><button className="ex-primary" disabled={phase !== 'idle'} type="button" onClick={() => void runSearch()}>{phase === 'searching' ? 'Finding records…' : search ? 'Refresh candidate records' : 'Find candidate records'}</button></section>
          {error && <p className="ex-error" role="alert">{error}</p>}
          {search && <section className="ex-results" aria-live="polite"><div className="ex-results-head"><h2>{search.status === 'no_match' ? 'No matching assessment records' : 'Candidate records'}</h2><span>{search.candidates.length} shown</span></div><div className="ex-search-evidence"><p><a href={search.sourceUrl} target="_blank" rel="noreferrer">Allegheny County assessments via WPRDC</a> · File date {formatDate(search.sourceDate)} · Retrieved {formatDate(search.retrievedAt)}</p><p>{search.coverage}</p><p>Not checked here: {search.unknowns.join(', ')}. Proposal fit, availability and lawful use remain unassessed.</p></div>{search.truncated && <p className="ex-warning">More records match these filters. Only the first 20 returned by the source are shown. {zip.trim() ? 'Your ZIP filter is applied; these are not ranked recommendations.' : 'Add a ZIP to narrow the search.'}</p>}{search.status === 'no_match' && <p>Try another recorded-use category or remove the ZIP. A missing record does not rule out a site.</p>}{search.candidates.map(item => <label key={item.parcelId} className={`ex-candidate ${candidate?.parcelId === item.parcelId ? 'is-active' : ''}`}><input type="radio" name="ex-candidate" checked={candidate?.parcelId === item.parcelId} disabled={phase === 'loading'} onChange={() => { cancel(); setCandidate(item); setDetail(null); setError('') }} /><span><strong>{displayPropertyAddress(item.address, item.parcelId)}</strong><small>Parcel {item.parcelId} · {item.municipality} · {item.zip || 'ZIP unknown'}</small><small>Recorded use: {item.recordedUse || 'unknown'}</small></span></label>)}{candidate && <button className="ex-primary ex-inspect" type="button" disabled={phase === 'loading'} onClick={() => void inspect()}>{phase === 'loading' ? 'Loading parcel…' : `Inspect parcel ${candidate.parcelId}`}</button>}</section>}
          {detail && candidate && <section className="ex-detail">
            <span className="ex-eyebrow">Selected parcel / {detail.parcelId}</span>
            <h2>{refreshedAddress}</h2>
            <div className="ex-facts">
              <div><span>Assessment</span><strong>{detail.assessment.status}</strong><small>File date {formatDate(detail.assessment.sourceDate)}</small></div>
              <div><span>Boundary</span><strong>{detail.boundary.status}</strong><small>Dataset effective date unknown</small></div>
            </div>
            <div className="ex-observations">
              <p><strong>Search snapshot (raw source address):</strong> {candidate.address || 'Address unknown'}; recorded use {candidate.recordedUse || 'unknown'}. Match basis: {candidate.matched}. File date {formatDate(candidate.sourceDate)}; retrieved {formatDate(search?.retrievedAt ?? null)}.</p>
              <p><strong>Refreshed assessment:</strong> {detail.assessment.record?.address || 'Address unknown'}; recorded use {detail.assessment.record?.useDescription || 'unknown'}. File date {formatDate(detail.assessment.sourceDate)}; retrieved {formatDate(detail.assessment.retrievedAt)}.</p>
            </div>
            {reconciliation?.status === 'changed' && <div className="ex-reconciliation" role="alert">
              <strong>Search and refreshed records differ.</strong>
              <ul>{reconciliation.changes.map(change => <li key={change.field}>{change.field}: Search: {change.field === 'Assessment file date' ? formatDate(change.search) : change.search}; Refreshed: {change.field === 'Assessment file date' ? formatDate(change.refreshed) : change.refreshed}.</li>)}</ul>
              {reconciliation.missing.length > 0 && <p>Still unknown: {reconciliation.missing.join(', ')}.</p>}
              <p>Confirm the changed observations with the County before relying on this search match. Neither record establishes current condition or lawful use.</p>
            </div>}
            {reconciliation?.status === 'unconfirmed' && <div className="ex-reconciliation" role="alert"><strong>The search match has not been reconfirmed.</strong><p>Refreshed evidence is missing for: {reconciliation.missing.join(', ')}. Verify the assessment directly with the County before relying on this candidate.</p></div>}
            {reconciliation?.status === 'confirmed' && <p className="ex-note">The compared assessment fields agree across these two retrievals. Current condition, lawful use and proposal fit remain unassessed.</p>}
            <details className="ex-source"><summary>Parcel evidence and gaps</summary><p><a href={detail.assessment.sourceUrl} target="_blank" rel="noreferrer">Assessment source</a> · retrieved {formatDate(detail.assessment.retrievedAt)}</p><p><a href={detail.boundary.sourceUrl} target="_blank" rel="noreferrer">County parcel boundary</a> · retrieved {formatDate(detail.boundary.retrievedAt)}</p><p>Zoning, hazards, utilities, ownership, availability and proposal feasibility have not been assessed in this explorer. The parcel outline is not a survey.</p></details>
            {reconciliation?.status !== 'confirmed' && <p className="ex-note">Comparison will use this parcel ID. Resolve the record differences or missing evidence independently.</p>}
            <p className="ex-handoff-note">Compare receives this parcel ID only. Your Explorer description, work selections and notes are not transferred to the comparison form.</p>
            <a className="ex-primary ex-compare" href={`/compare?parcelId=${encodeURIComponent(detail.parcelId)}`}>Compare proposals on this parcel <span aria-hidden="true">↗</span></a>
          </section>}
        </>}
      </section>
      <aside className="ex-map-panel" aria-label="Site context"><div className="ex-map-heading"><span className="ex-eyebrow">Live map / 2D site context</span><h2>{detail?.boundary.status === 'available' ? refreshedAddress : 'Allegheny County'}</h2><p>{detail ? 'Selected County parcel boundary when available' : 'Choose and inspect a candidate to view its mapped outline'}</p></div><div className="ex-map"><SiteContextMap historical={false} detail={detail} savedParcelId={null} selectedParcelId={candidate?.parcelId ?? null} loading={phase === 'loading'} loadError={error} onLoadCurrentRecords={() => void inspect()} /></div><p className="ex-map-footer">OpenStreetMap streets and County parcel geometry. Map tiles and parcel sources have separate coverage and dates.</p></aside>
    </main>
  </div>
}
