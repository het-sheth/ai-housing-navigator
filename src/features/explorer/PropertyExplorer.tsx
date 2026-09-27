import { useEffect, useRef, useState } from 'react'
import { ACTIVITIES, type ActivityId } from '../projects/contracts'
import { requestSuggestions, type IntakeSuggestion } from '../projects/ai-client'
import { SiteContextMap } from '../projects/SiteContextMap'
import { loadProperty, type PropertyDetail } from '../projects/property-client'
import { searchCandidates, type CandidateSearch, type ExplorerCandidate, type RecordedUse } from './explorer-client'
import '../projects/guided-project.css'
import './explorer.css'

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
  const [idea, setIdea] = useState('')
  const [activities, setActivities] = useState<ActivityId[]>([])
  const [recordedUse, setRecordedUse] = useState<RecordedUse>('vacant_land')
  const [zip, setZip] = useState('')
  const [otherCriteria, setOtherCriteria] = useState('')
  const [suggestions, setSuggestions] = useState<IntakeSuggestion[]>([])
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
      setQuestion(result.question)
      setActivities(current => [...new Set([...current, ...result.suggestions.filter(item => item.intent === 'confirmed_candidate').map(item => item.activityId)])])
      setAiStatus('AI proposed work activities below. Review and edit them before confirming. Site preferences and proposal fit remain unassessed.')
    } catch {
      if (!controller.signal.aborted) setAiStatus('AI interpretation is unavailable. Your idea is preserved. Select activities and search criteria manually, or retry AI.')
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
  const zipValid = zip.trim() === '' || /^\d{5}$/.test(zip.trim())

  return <div className="ex-page">
    <header className="ex-header"><a className="ex-brand" href="/welcome"><span>412</span><strong>Housing Navigator</strong></a><nav aria-label="Main navigation"><a href="/projects/new">Project walkthrough</a><span aria-current="page">Property explorer</span></nav></header>
    <main className="ex-layout">
      <section className="ex-panel" aria-labelledby="ex-title">
        <div className="ex-intro"><span className="ex-eyebrow">01 / Explore a site</span><h1 id="ex-title">Find a parcel to study.</h1><p>Describe your housing idea, review the search criteria, then inspect matching assessment records on the map.</p></div>
        {!confirmed ? <section className="ex-block" aria-label="Confirm search criteria">
          <h2>Your housing idea</h2><label htmlFor="ex-idea">What would you like to do?</label><textarea id="ex-idea" value={idea} maxLength={2000} rows={4} placeholder="For example, convert an existing building into several homes" onChange={event => changeIdea(event.target.value)} />
          <button className="ex-secondary" type="button" disabled={!idea.trim() || phase === 'interpreting'} onClick={() => void interpret()}>{phase === 'interpreting' ? 'Interpreting…' : 'Suggest activities with AI'}</button>
          {aiStatus && <p className="ex-note" role="status">{aiStatus}</p>}
          {suggestions.length > 0 && <div className="ex-suggestions"><strong>AI suggestions for review</strong>{suggestions.map(item => <p key={item.activityId}>{ACTIVITIES.find(activity => activity.id === item.activityId)?.label}: {item.intent.replaceAll('_', ' ')}. “{item.quote}” {item.reason}</p>)}</div>}
          {question && <p className="ex-question">Question to resolve: {question}</p>}
          <fieldset><legend>Work activities you intend to explore</legend><div className="ex-activity-grid">{ACTIVITIES.map(activity => <label key={activity.id}><input type="checkbox" checked={activities.includes(activity.id)} onChange={() => toggleActivity(activity.id)} />{activity.label}</label>)}</div></fieldset>
          <label htmlFor="ex-recorded-use">Recorded use to search</label><select id="ex-recorded-use" value={recordedUse} onChange={event => setRecordedUse(event.target.value as RecordedUse)}>{useChoices.map(choice => <option value={choice.value} key={choice.value}>{choice.label}</option>)}</select><p className="ex-note">{selectedUse.note} Only this assessment field narrows results by use. Activities do not establish fit.</p>
          <label htmlFor="ex-zip">Preferred postal ZIP (optional)</label><input id="ex-zip" inputMode="numeric" value={zip} maxLength={5} placeholder="15217" onChange={event => setZip(event.target.value)} />{!zipValid && <p className="ex-error">Enter five digits or leave ZIP blank.</p>}
          <label htmlFor="ex-other-criteria">Other needs or assumptions (optional)</label><textarea id="ex-other-criteria" value={otherCriteria} maxLength={500} rows={2} placeholder="For example, minimum lot area, transit access or price" onChange={event => setOtherCriteria(event.target.value)} /><p className="ex-note">Other needs, including lot-area thresholds, are recorded here for review but are not evaluated by this search.</p>
          <button className="ex-primary" type="button" disabled={!idea.trim() || !activities.length || !zipValid || phase === 'interpreting'} onClick={() => setConfirmed(true)}>Confirm criteria and find records</button>
        </section> : <>
          <section className="ex-confirmed ex-block"><div><span className="ex-eyebrow">Confirmed by you</span><h2>{idea}</h2><p>Activities: {activities.map(id => ACTIVITIES.find(item => item.id === id)?.label).join(', ')}</p><p>Assessment search: {selectedUse.label}{zip ? `, ZIP ${zip}` : ''}</p>{otherCriteria && <p>Not evaluated: {otherCriteria}</p>}</div><button type="button" onClick={changeCriteria}>Edit criteria</button></section>
          <section className="ex-block"><h2>Find candidate records</h2><p className="ex-note">Search the first 20 returned County assessment records with a Pittsburgh-labeled municipality and your confirmed recorded-use and ZIP filters. Record order is set by the source. City jurisdiction and proposal suitability need separate checks.</p><button className="ex-primary" disabled={phase !== 'idle'} type="button" onClick={() => void runSearch()}>{phase === 'searching' ? 'Finding records…' : search ? 'Refresh candidate records' : 'Find candidate records'}</button></section>
          {error && <p className="ex-error" role="alert">{error}</p>}
          {search && <section className="ex-results" aria-live="polite"><div className="ex-results-head"><h2>{search.status === 'no_match' ? 'No matching assessment records' : 'Candidate records'}</h2><span>{search.candidates.length} shown</span></div>{search.truncated && <p className="ex-warning">More records match these filters. Only the first 20 returned by the source are shown. Add a ZIP to narrow the search.</p>}{search.status === 'no_match' && <p>Try another recorded-use category or remove the ZIP. A missing record does not rule out a site.</p>}{search.candidates.map(item => <label key={item.parcelId} className={`ex-candidate ${candidate?.parcelId === item.parcelId ? 'is-active' : ''}`}><input type="radio" name="ex-candidate" checked={candidate?.parcelId === item.parcelId} disabled={phase === 'loading'} onChange={() => { cancel(); setCandidate(item); setDetail(null); setError('') }} /><span><strong>{item.address || 'Address unavailable'}</strong><small>{item.municipality} · {item.zip || 'ZIP unknown'}</small><small>Parcel {item.parcelId} · recorded use {item.recordedUse || 'unknown'}</small><small>Match: {item.matched}. File date: {formatDate(item.sourceDate)}.</small><small>Proposal fit, availability and lawful use: unassessed.</small></span></label>)}{candidate && <button className="ex-primary ex-inspect" type="button" disabled={phase === 'loading'} onClick={() => void inspect()}>{phase === 'loading' ? 'Loading parcel…' : `Inspect parcel ${candidate.parcelId}`}</button>}<details className="ex-source"><summary>Search source, coverage and gaps</summary><p><a href={search.sourceUrl} target="_blank" rel="noreferrer">Allegheny County assessments via WPRDC</a>. File date: {formatDate(search.sourceDate)}. Retrieved: {formatDate(search.retrievedAt)}.</p><p>{search.coverage}</p><p>Not evaluated: {search.unknowns.join(', ')}{otherCriteria ? `, ${otherCriteria}` : ''}.</p></details></section>}
          {detail && candidate && <section className="ex-detail"><span className="ex-eyebrow">Selected parcel / {detail.parcelId}</span><h2>{candidate.address || 'Address unavailable'}</h2><div className="ex-facts"><div><span>Assessment</span><strong>{detail.assessment.status}</strong><small>File date {formatDate(detail.assessment.sourceDate)}</small></div><div><span>Boundary</span><strong>{detail.boundary.status}</strong><small>Dataset effective date unknown</small></div></div><p>Recorded use: {detail.assessment.record?.useDescription || 'Unknown'}. This record may differ from current condition or lawful use.</p><details className="ex-source"><summary>Parcel evidence and gaps</summary><p><a href={detail.assessment.sourceUrl} target="_blank" rel="noreferrer">Assessment source</a> · retrieved {formatDate(detail.assessment.retrievedAt)}</p><p><a href={detail.boundary.sourceUrl} target="_blank" rel="noreferrer">County parcel boundary</a> · retrieved {formatDate(detail.boundary.retrievedAt)}</p><p>Zoning, hazards, utilities, ownership, availability and proposal feasibility have not been assessed in this explorer. The parcel outline is not a survey.</p></details><a className="ex-primary ex-compare" href={`/compare?parcelId=${encodeURIComponent(detail.parcelId)}`}>Compare proposals on this parcel <span aria-hidden="true">↗</span></a></section>}
        </>}
      </section>
      <aside className="ex-map-panel" aria-label="Site context"><div className="ex-map-heading"><span className="ex-eyebrow">Live map / 2D site context</span><h2>{detail?.boundary.status === 'available' ? candidate?.address || `Parcel ${detail.parcelId}` : 'Allegheny County'}</h2><p>{detail ? 'Selected County parcel boundary when available' : 'Choose and inspect a candidate to view its mapped outline'}</p></div><div className="ex-map"><SiteContextMap historical={false} detail={detail} /></div><p className="ex-map-footer">OpenStreetMap streets and County parcel geometry. Map tiles and parcel sources have separate coverage and dates.</p></aside>
    </main>
  </div>
}
