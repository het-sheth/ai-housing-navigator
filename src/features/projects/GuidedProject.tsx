import { useEffect, useRef, useState } from 'react'
import { parcel, sources } from '../../domain'
import { Button } from '../../design-system/components'
import { ACTIVITIES, ROLES, createDraft, summarizeDraft, type ActivityId, type Draft } from './contracts'
import { clearDraft, listArchivedDrafts, loadDraft, restoreArchivedDraft, saveDraft, startNewDraft } from './draft-store'
import { applySuggestions, requestSuggestions, type IntakeResponse } from './ai-client'
import { CloudSaveButton } from '../account/CloudSaveButton'
import { useAiAvailability } from './useAiAvailability'
import { AiAvailabilityNote } from './AiAvailabilityNote'
import { IntakeReview } from './IntakeReview'
import { SiteContextMap } from './SiteContextMap'
import { PropertyStep } from './PropertyStep'
import { ResultsStep } from './ResultsStep'
import { hasConfirmedParcel, loadProperty, searchProperty, type PropertyCandidate, type PropertyDetail, type PropertySearch } from './property-client'
import { hasCompleteScreen, requestScreening, type ScreeningResult } from './screening-client'
import { resultActions } from './result-actions'
import './guided-project.css'
import { AppHeader } from '../../components/AppHeader'

const STEPS = ['Your purpose', 'Your property', 'Your proposal', 'Key questions', 'Review', 'Next actions']
const TITLES = ['What brings you here?', 'Start with a place.', 'What do you have in mind?', 'Before the next investment.', 'Your proposal, in focus.', 'Your next action.']
const INTRO = ['A little context helps shape your project brief. You can change these choices later.', 'Search an Allegheny County address or parcel ID, then confirm the matching parcel.', 'Keep it in your own words. Select the work you intend, and separate possibilities from decisions.', 'Have you started checking whether the project can pencil out? Unknown is a useful answer.', 'Check your intentions and the open questions before preparing your next-action brief.', 'Review your proposal and the next step it calls for.']
const DECISIONS = [{ id: 'pursue', label: 'Decide whether to pursue a site', note: 'Find the questions worth answering first.' }, { id: 'compare', label: 'Explore a different proposal', note: 'Understand what changes with the scope.' }, { id: 'prepare', label: 'Prepare for professional review', note: 'Make the next conversation more useful.' }]

function markdownText(value: string) {
  return value.replace(/[\\`*_{}[\]<>#|]/g, character => `\\${character}`)
}

export default function GuidedProject() {
  const aiAvailability = useAiAvailability()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [storage, setStorage] = useState('Opening your device draft…')
  const [storageError, setStorageError] = useState(false)
  const [notice, setNotice] = useState('')
  const [countInputError, setCountInputError] = useState<{ id: 'existingHomes' | 'proposedHomes' | 'homesRetained'; value: string; message: string } | null>(null)
  const [clearing, setClearing] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'review' | 'error'>('idle')
  const [aiResult, setAiResult] = useState<IntakeResponse | null>(null)
  const [aiSelected, setAiSelected] = useState<ActivityId[]>([])
  const [aiError, setAiError] = useState('')
  const [propertySearch, setPropertySearch] = useState<PropertySearch | null>(null)
  const [propertyStatus, setPropertyStatus] = useState<'idle' | 'searching' | 'loading' | 'error'>('idle')
  const [propertyError, setPropertyError] = useState('')
  const [candidate, setCandidate] = useState<PropertyCandidate | null>(null)
  const [propertyDetail, setPropertyDetail] = useState<PropertyDetail | null>(null)
  const [screeningStatus, setScreeningStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null)
  const [screeningError, setScreeningError] = useState('')
  const [archives, setArchives] = useState<Draft[]>([])
  const [invalidArchives, setInvalidArchives] = useState(0)
  const [resumed, setResumed] = useState(false)
  const [savedResumeStep, setSavedResumeStep] = useState<Draft['step'] | null>(null)
  const propertyAbort = useRef<AbortController | null>(null)
  const propertyEpoch = useRef(0)
  const screeningEpoch = useRef(0)
  const screeningAbort = useRef<AbortController | null>(null)
  const aiAbort = useRef<AbortController | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const progress = useRef<HTMLElement>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const skipSave = useRef(false)
  const writeBlocked = useRef(false)
  const clearInProgress = useRef(false)
  const previousStep = useRef<number | null>(null)
  const focusPropertyAfterChange = useRef(false)

  useEffect(() => {
    let active = true
    loadDraft().then(saved => {
      if (!active) return
      if (saved?.step === 5) skipSave.current = true
      setDraft(saved?.step === 5 ? { ...saved, step: 0 } : saved ?? createDraft())
      setSavedResumeStep(saved?.step === 5 ? saved.step : null)
      setResumed(Boolean(saved))
      setStorage(saved ? 'Recovered from this device' : 'Device only')
      void listArchivedDrafts().then(result => { if (active) { setArchives(result.drafts); setInvalidArchives(result.invalidCount) } }).catch(() => { if (active) setStorageError(true) })
    }).catch(error => {
      if (!active) return
      writeBlocked.current = true
      setDraft(createDraft())
      setStorage(error instanceof Error ? `Saved draft could not be opened: ${error.message}` : 'Saved draft could not be opened.')
      setStorageError(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => () => { aiAbort.current?.abort(); propertyAbort.current?.abort(); screeningAbort.current?.abort() }, [])

  useEffect(() => {
    if (!draft || clearing || writeBlocked.current) return
    if (skipSave.current) { skipSave.current = false; return }
    let active = true
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveDraft(draft))
    saveQueue.current.then(() => {
      if (active) { setStorage('Saved on this device'); setStorageError(false) }
    }).catch(() => {
      if (active) { setStorage('Not saved. Export your work before leaving.'); setStorageError(true) }
    })
    return () => { active = false }
  }, [draft, clearing])

  useEffect(() => {
    if (draft && previousStep.current !== draft.step) {
      previousStep.current = draft.step
      heading.current?.focus()
    }
  }, [draft])

  useEffect(() => {
    if (draft?.step === 1 && draft.parcelId === null && focusPropertyAfterChange.current) {
      focusPropertyAfterChange.current = false
      document.getElementById('gp-property')?.focus()
    }
  }, [draft?.step, draft?.parcelId])

  useEffect(() => {
    if (!draft) return
    const alignCurrentStep = () => {
      const current = progress.current?.querySelector<HTMLButtonElement>('[aria-current="step"]')
      if (current && progress.current) progress.current.scrollTo({ left: current.offsetLeft - (progress.current.clientWidth - current.offsetWidth) / 2, behavior: 'instant' })
    }
    alignCurrentStep()
    window.addEventListener('resize', alignCurrentStep)
    return () => window.removeEventListener('resize', alignCurrentStep)
  }, [draft?.step])

  if (!draft) return <main className="gp gp-loading"><span className="gp-mark">412</span><p role="status">Opening your workspace…</p></main>
  draftRef.current = draft

  const historical = draft.parcelId === parcel.id && draft.propertyConfirmed && draft.propertyEvidence === 'historical'
  const selected = historical
  const summary = summarizeDraft(draft)
  const update = (change: Partial<Draft>, editing = true) => {
    if (clearInProgress.current) return
    setSavedResumeStep(null)
    if (editing) { screeningEpoch.current += 1; screeningAbort.current?.abort(); setScreeningResult(null); setScreeningStatus('idle'); setScreeningError('') }
    aiAbort.current?.abort()
    aiAbort.current = null
    setAiStatus('idle')
    setAiResult(null)
    setAiSelected([])
    setAiError('')
    setNotice('')
    if (Object.hasOwn(change, 'propertyQuery') || Object.hasOwn(change, 'parcelId')) { propertyEpoch.current += 1; propertyAbort.current?.abort(); setPropertySearch(null); setCandidate(null); setPropertyDetail(null); setPropertyStatus('idle'); setPropertyError('') }
    if (!writeBlocked.current) setStorage('Saving on this device…')
    setDraft(current => current ? { ...current, ...change, revision: current.revision + 1, updatedAt: new Date().toISOString(), ...(editing ? { confirmedAt: null } : {}) } : current)
  }
  const go = (step: number) => update({ step: step as Draft['step'] }, false)
  const changeParcel = () => {
    focusPropertyAfterChange.current = true
    update({ step: 1, parcelId: null, propertyConfirmed: false, propertyEvidence: null })
  }
  const toggleActivity = (id: Draft['activities'][number], tentative: boolean) => {
    const field = tentative ? 'tentativeActivities' : 'activities'
    const other = tentative ? 'activities' : 'tentativeActivities'
    update({ [field]: draft[field].includes(id) ? draft[field].filter(value => value !== id) : [...draft[field], id], [other]: draft[other].filter(value => value !== id) })
  }
  const updateHomeCount = (id: 'existingHomes' | 'proposedHomes' | 'homesRetained', value: string) => {
    const number = Number(value)
    const label = id === 'existingHomes' ? 'Existing homes' : id === 'proposedHomes' ? 'Proposed total homes' : 'Homes retained'
    const saved = `Saved value: ${draft[id] ?? 'Unknown'}.`
    if (value !== '' && (!Number.isSafeInteger(number) || number < 0 || number > 100000)) {
      setCountInputError({ id, value, message: `${label} must be a whole number from 0 to 100,000. ${saved} The entered value has not been saved.` })
      return
    }
    const candidate = { ...draft, [id]: value === '' ? null : number }
    if (candidate.homesRetained !== null && (candidate.existingHomes !== null && candidate.homesRetained > candidate.existingHomes || candidate.proposedHomes !== null && candidate.homesRetained > candidate.proposedHomes)) {
      setCountInputError({ id, value, message: `${label} conflicts with the other home counts. Homes retained cannot exceed existing or proposed homes. ${saved} Correct this value or leave it blank if unknown; the entered value has not been saved.` })
      return
    }
    setCountInputError(null)
    update({ [id]: candidate[id] })
  }
  const countError = draft.homesRetained !== null && ((draft.existingHomes !== null && draft.homesRetained > draft.existingHomes) || (draft.proposedHomes !== null && draft.homesRetained > draft.proposedHomes))
  const suggestWork = async () => {
    if (!draft.description.trim() || aiStatus === 'loading') return
    const controller = new AbortController()
    aiAbort.current = controller
    setAiStatus('loading')
    setAiError('')
    setAiResult(null)
    try {
      const result = await requestSuggestions(draft.description, draft.id, draft.revision, fetch, controller.signal)
      if (controller.signal.aborted || draftRef.current?.id !== result.draftId || draftRef.current.revision !== result.draftRevision) return
      setAiResult(result)
      setAiSelected([])
      setAiStatus('review')
    } catch (error) {
      if (controller.signal.aborted) return
      const code = error instanceof Error ? error.message : 'ai_unavailable'
      setAiError(code === 'authentication_required' ? 'Sign in again to use AI. Your description and manual choices are preserved.' : code === 'ai_limit_reached' ? 'The AI usage limit has been reached. You can continue with manual activity choices.' : code === 'ai_not_configured' ? 'AI suggestions are not available on this hosted site. Your description and manual activity choices remain available.' : code === 'budget_unverified' ? 'AI is unavailable because its spending limit could not be verified. Your description and manual choices are still here.' : code === 'local_rate_limit' ? 'Please wait a minute before trying AI again. Your manual choices are available.' : 'AI could not suggest work right now. Your description and manual choices are still here; you can try again.')
      setAiStatus('error')
    } finally {
      if (aiAbort.current === controller) aiAbort.current = null
    }
  }
  const applyWork = () => {
    if (!aiResult || aiResult.draftId !== draft.id || aiResult.draftRevision !== draft.revision) return
    update(applySuggestions(draft, aiResult.suggestions, aiSelected))
    setNotice('Selected work added. Review the activities below before continuing.')
  }
  const search = async () => {
    if (!draft.propertyQuery.trim()) return
    screeningEpoch.current += 1
    screeningAbort.current?.abort()
    setScreeningResult(null)
    setScreeningStatus('idle')
    setScreeningError('')
    propertyAbort.current?.abort()
    const controller = new AbortController()
    const draftId = draft.id
    const query = draft.propertyQuery
    const epoch = propertyEpoch.current
    propertyAbort.current = controller
    setPropertyStatus('searching')
    setPropertyError('')
    setPropertySearch(null)
    setCandidate(null)
    setPropertyDetail(null)
    try {
      const result = await searchProperty(draft.propertyQuery, controller.signal)
      if (controller.signal.aborted || propertyEpoch.current !== epoch || draftRef.current?.id !== draftId || draftRef.current.propertyQuery !== query) return
      setPropertySearch(result)
      setPropertyStatus('idle')
    } catch {
      if (controller.signal.aborted) return
      setPropertyStatus('error')
      setPropertyError('Property search could not load. Check the local API and retry.')
    }
  }
  const confirmProperty = async () => {
    if (!candidate) return
    propertyAbort.current?.abort()
    const controller = new AbortController()
    const draftId = draft.id
    const parcelId = candidate.parcelId
    const epoch = propertyEpoch.current
    propertyAbort.current = controller
    setPropertyStatus('loading')
    setPropertyError('')
    try {
      const result = await loadProperty(candidate.parcelId, controller.signal)
      if (controller.signal.aborted || propertyEpoch.current !== epoch || draftRef.current?.id !== draftId || draftRef.current.propertyQuery !== draft.propertyQuery) return
      if (!hasConfirmedParcel(result, parcelId)) throw new Error('parcel_unconfirmed')
      setPropertyDetail(result)
      setPropertyStatus('idle')
      update({ parcelId: candidate.parcelId, propertyConfirmed: true, propertyEvidence: 'live' })
      setPropertyDetail(result)
      setNotice(`Parcel ${candidate.parcelId} confirmed for this draft. Review the separate source results below.`)
    } catch {
      if (controller.signal.aborted) return
      setPropertyStatus('error')
      setPropertyError('Parcel details could not load. Your search remains available; retry confirmation.')
    }
  }
  const refreshProperty = async () => {
    if (!draft.parcelId) return
    const controller = new AbortController()
    const draftId = draft.id
    const parcelId = draft.parcelId
    const epoch = propertyEpoch.current
    propertyAbort.current?.abort()
    propertyAbort.current = controller
    setPropertyStatus('loading')
    setPropertyError('')
    try { const result = await loadProperty(parcelId, controller.signal); if (controller.signal.aborted || propertyEpoch.current !== epoch || draftRef.current?.id !== draftId || draftRef.current.parcelId !== parcelId) return; if (result.parcelId !== parcelId) throw new Error('parcel_mismatch'); setPropertyDetail(result); setPropertyStatus('idle') }
    catch { if (!controller.signal.aborted) { setPropertyStatus('error'); setPropertyError('Parcel refresh failed. Previously saved identity remains; no new observation was substituted.') } }
  }
  const runAssessment = async () => {
    if (screeningStatus === 'loading') return
    screeningAbort.current?.abort()
    const controller = new AbortController()
    const draftId = draft.id
    const epoch = screeningEpoch.current
    screeningAbort.current = controller
    setScreeningStatus('loading')
    setScreeningError('')
    try {
      const result = await requestScreening(draft, fetch, controller.signal)
      if (controller.signal.aborted || screeningEpoch.current !== epoch || draftRef.current?.id !== draftId) return
      setScreeningResult(result)
      setScreeningStatus('ready')
    } catch {
      if (controller.signal.aborted || screeningEpoch.current !== epoch || draftRef.current?.id !== draftId) return
      setScreeningStatus('error')
      setScreeningError('Property checks could not run. Your proposal is still saved; try again.')
    }
  }
  const startNew = async () => {
    if (clearInProgress.current) return
    clearInProgress.current = true
    propertyEpoch.current += 1
    screeningEpoch.current += 1
    propertyAbort.current?.abort()
    screeningAbort.current?.abort()
    aiAbort.current?.abort()
    await saveQueue.current.catch(() => {})
    try {
      const fresh = createDraft()
      await startNewDraft(draft, fresh)
      skipSave.current = true
      setDraft(fresh)
      setResumed(false)
      setSavedResumeStep(null)
      setPropertyDetail(null)
      setPropertySearch(null)
      setCandidate(null)
      setPropertyStatus('idle')
      setPropertyError('')
      setAiStatus('idle')
      setAiResult(null)
      setScreeningResult(null)
      setScreeningStatus('idle')
      setScreeningError('')
      const saved = await listArchivedDrafts().catch(() => null)
      if (saved) { setArchives(saved.drafts); setInvalidArchives(saved.invalidCount) }
      else { setStorageError(true); setStorage('New project opened; saved project list could not load.') }
      setNotice('Started a blank project. Your previous project remains saved on this device.')
    } catch { setStorageError(true); setStorage('Could not preserve the current project. It is still open.') }
    finally { clearInProgress.current = false }
  }
  const restore = async (saved: Draft) => {
    if (clearInProgress.current) return
    clearInProgress.current = true
    propertyEpoch.current += 1
    screeningEpoch.current += 1
    propertyAbort.current?.abort()
    screeningAbort.current?.abort()
    aiAbort.current?.abort()
    await saveQueue.current.catch(() => {})
    try {
      await restoreArchivedDraft(draft, saved)
      skipSave.current = true
      setDraft(saved.step === 5 ? { ...saved, step: 0 } : saved)
      setResumed(true)
      setSavedResumeStep(saved.step === 5 ? saved.step : null)
      setPropertyDetail(null)
      setPropertySearch(null)
      setCandidate(null)
      setPropertyStatus('idle')
      setPropertyError('')
      setAiStatus('idle')
      setAiResult(null)
      setScreeningResult(null)
      setScreeningStatus('idle')
      setScreeningError('')
      const projects = await listArchivedDrafts().catch(() => null)
      if (projects) { setArchives(projects.drafts); setInvalidArchives(projects.invalidCount) }
      else { setStorageError(true); setStorage('Project restored; saved project list could not load.') }
      setNotice('Saved project restored. Refresh its live property data before relying on it.')
    } catch { setStorageError(true); setStorage('Could not restore the saved project. Your current project is still open.') }
    finally { clearInProgress.current = false }
  }
  const next = () => {
    if (draft.step === 1 && !draft.propertyQuery.trim()) { setNotice('Enter an address or parcel ID.'); return }
    if (draft.step === 2 && !draft.description.trim() && draft.activities.length === 0 && draft.tentativeActivities.length === 0) { setNotice('Describe your idea or select a work activity. Other / uncertain work is welcome.'); return }
    if (draft.step === 3 && (countError || countInputError)) { setNotice('Correct the home count marked below before continuing.'); return }
    if (draft.step === 4) update({ step: 5, confirmedAt: new Date().toISOString() }, false)
    else go(draft.step + 1)
  }
  const download = () => {
    const diligenceLines = screeningResult
      ? resultActions(screeningResult, summary).map((action, index) => `${index + 1}. ${action}`)
      : summary.tasks.flatMap((task, index) => [`${index + 1}. ${task.title}`, `   Responsible party: ${task.party}`, `   Requested evidence: ${task.request}`])
    const lines = ['# 412 Housing Navigator project brief', '', `Status: ${draft.confirmedAt ? 'Confirmed intentions; planning tasks only' : 'Draft, unassessed'}`, `Updated: ${draft.updatedAt}`, `Draft revision: ${draft.revision}`, `Property: ${markdownText(draft.propertyQuery || 'Not identified')}`, `Identification: ${selected ? `Lanark historical example, parcel ${parcel.id}` : draft.propertyConfirmed && draft.propertyEvidence === 'live' ? `User-confirmed live lookup, parcel ${draft.parcelId}` : 'Unresolved; address retained as user input'}`, '', '## Original description', ...draft.description.split('\n').map(line => `> ${markdownText(line)}`), '', '## Intended work', ...draft.activities.map(id => `- ${ACTIVITIES.find(activity => activity.id === id)?.label ?? id}`), '', '## Tentative work', ...draft.tentativeActivities.map(id => `- ${ACTIVITIES.find(activity => activity.id === id)?.label ?? id}`), '', `Existing homes: ${draft.existingHomes ?? 'Unknown'}`, `Proposed homes: ${draft.proposedHomes ?? 'Unknown'}`, `Homes retained: ${draft.homesRetained ?? 'Unknown'}`, `Net new homes: ${summary.netNew ?? 'Unknown'}`, `Affordability goal: ${markdownText(draft.affordabilityGoal || 'Unknown')}`, `Essential non-housing uses: ${markdownText(draft.essentialUses || 'Unknown')}`, '', '## Financial readiness', `Preliminary budget: ${draft.financial.budget}`, `Revenue or value assumptions: ${draft.financial.value}`, `Funding path: ${draft.financial.funding}`, 'Financial feasibility: Unassessed. These are user-reported readiness answers, not a viability evaluation.', '', '## Next diligence tasks', ...diligenceLines, '', '## Coverage and limits', 'AI may have helped structure selected work from the original description. This export does not retain an AI operation history. Permission determination and financial evaluation were not performed. Task outcomes and immutable assessment history are not implemented in this local draft. All user inputs remain unverified.']
    if (propertyDetail && draft.propertyEvidence === 'live') lines.push('', '## Retrieved property observations', `Assessment status: ${propertyDetail.assessment.status}`, `Assessment classification: ${propertyDetail.assessment.record?.classification || 'unavailable'}`, `Assessment use description: ${propertyDetail.assessment.record?.useDescription || 'unavailable'}`, `Assessment lot area: ${propertyDetail.assessment.record?.lotAreaSqFt ?? 'unavailable'} sq ft`, `Assessment file date: ${propertyDetail.assessment.sourceDate || 'unavailable'}`, `Assessment retrieved: ${propertyDetail.assessment.retrievedAt}`, `Assessment source: ${propertyDetail.assessment.sourceUrl}`, `Boundary status: ${propertyDetail.boundary.status}`, 'Boundary dataset effective date: unavailable', `Boundary retrieved: ${propertyDetail.boundary.retrievedAt}`, `Boundary source: ${propertyDetail.boundary.sourceUrl}`, 'Mapped boundary is not a survey.')
    else if (draft.propertyEvidence === 'live') lines.push('', '## Property observations', 'Saved parcel identity only. Refresh live source observations in the workspace; no current observation is retained in this draft.')
    if (selected) lines.push('', '## Dated Lanark evidence', 'County assessment dated 2026-09-01 classifies vacant land. City permit research retrieved 2026-09-26 references a dwelling. Neither establishes present condition or lawful use.', ...sources.filter(source => ['assessment', 'parcel', 'pli'].includes(source.id)).map(source => `- [${source.title}](${source.url}) | source date: ${source.asOf} | retrieved: ${source.retrievedAt}`))
    lines.push('', '## Proposal screening inputs', `Housing form: ${draft.housingForm}`, `Ground disturbance: ${draft.groundDisturbance}`)
    if (screeningResult) {
      const complete = hasCompleteScreen(screeningResult) && draft.tentativeActivities.length === 0
      if (screeningStatus === 'error') lines.push('', 'Latest rerun failed. This brief retains the dated assessment and actions from the previous successful run.')
      if (screeningStatus === 'loading') lines.push('', 'A rerun is in progress. This brief retains the dated assessment and actions from the previous successful run.')
      lines.push('', '## Property screening', `Status: ${complete ? 'Preliminary mapped screen' : 'Incomplete, no Development Ease Score'}`, `Run: ${screeningResult.retrievedAt}`, `Rubric: ${screeningResult.rubricVersion}`, `Tentative activities: ${draft.tentativeActivities.length ? 'Not evaluated in this screen' : 'None'}`, ...screeningResult.checks.flatMap(check => [`- ${check.label}: ${check.status}. ${check.reason}`, `  Source: ${check.sourceUrl || 'Unavailable'} | source date: ${check.sourceDate || 'Unknown'} | retrieved: ${check.retrievedAt || 'Not checked'}`]), screeningResult.caveat)
      if (complete) lines.push(`Preliminary mapped interval: ${screeningResult.score?.lower} to ${screeningResult.score?.upper} of 100`)
    }
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '412-project-brief.md'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Brief downloaded with your inputs, unknowns and dated evidence where available.')
  }
  const reset = async () => {
    if (!window.confirm('Clear this device draft and its current inputs? Download a brief first if you want to keep a copy.')) return
    if (clearInProgress.current) return
    clearInProgress.current = true
    propertyEpoch.current += 1
    screeningEpoch.current += 1
    propertyAbort.current?.abort()
    screeningAbort.current?.abort()
    aiAbort.current?.abort()
    setAiResult(null)
    setAiStatus('idle')
    const wasBlocked = writeBlocked.current
    writeBlocked.current = true
    setClearing(true)
    await saveQueue.current.catch(() => {})
    try {
      await clearDraft()
      skipSave.current = true
      writeBlocked.current = false
      setDraft(createDraft())
      setSavedResumeStep(null)
      setPropertyDetail(null)
      setPropertySearch(null)
      setCandidate(null)
      setScreeningResult(null)
      setScreeningStatus('idle')
      setScreeningError('')
      setResumed(false)
      setCountInputError(null)
      setStorage('Draft cleared. Device only.')
      setStorageError(false)
      setNotice('Your previous device draft was cleared.')
    } catch {
      writeBlocked.current = wasBlocked
      setStorage('Could not clear device storage. Your draft is still open.')
      setStorageError(true)
    } finally {
      clearInProgress.current = false
      setClearing(false)
    }
  }

  return <div className="gp" data-testid="guided-workspace">
    <AppHeader current="/projects/new" />
    <nav className="gp-progress" ref={progress} aria-label="Project progress"><ol>{STEPS.map((name, index) => <li key={name} className={draft.step === index ? 'is-current' : draft.step > index ? 'is-past' : ''}><button disabled={index > draft.step} aria-current={draft.step === index ? 'step' : undefined} onClick={() => go(index)}><span>{String(index + 1).padStart(2, '0')}</span><span>{name}</span></button></li>)}</ol></nav>
    <main className="gp-layout"><section className="gp-workspace" aria-label="Project questions"><div className="gp-project-actions"><CloudSaveButton kind="walkthrough" title={draft.propertyQuery || 'Property assessment'} data={draft} /><button className="gp-text-button" onClick={download}>Export brief <span aria-hidden="true">↗</span></button></div><details className="gp-project-menu" data-testid="projects-control"><summary>Projects {resumed && <span>Resumed on this device</span>}</summary><div className="gp-project-menu-content"><button className="gp-text-button" type="button" disabled={clearing || writeBlocked.current} onClick={() => void startNew()}>Start new project</button>{archives.length > 0 && <div><strong>Saved on this device</strong>{archives.map(saved => <button className="gp-text-button" type="button" key={saved.id} onClick={() => void restore(saved)}>Restore {saved.propertyQuery || 'Untitled project'} · {saved.updatedAt.slice(0, 10)}</button>)}</div>}{invalidArchives > 0 && <p role="alert">{invalidArchives} saved project record{invalidArchives === 1 ? '' : 's'} could not be opened. The device data was preserved.</p>}</div></details>{savedResumeStep !== null && <div className="gp-recovery" role="status"><strong>Saved project ready</strong><p>Your project was at {STEPS[savedResumeStep]}. Review from Your purpose or return to the saved stage.</p><button className="gp-secondary" type="button" onClick={() => go(savedResumeStep)}>Resume saved stage</button></div>}<div className="gp-eyebrow">Your project / {String(draft.step + 1).padStart(2, '0')}</div><h1 ref={heading} tabIndex={-1}>{TITLES[draft.step]}</h1><p className="gp-intro">{INTRO[draft.step]}</p>
      {writeBlocked.current && <div className="gp-recovery" role="alert"><strong>Device draft needs attention</strong><p>The saved data may still be on this device. Changes made here cannot be saved until you explicitly clear it. Export any work you enter before leaving.</p><button className="gp-secondary" disabled={clearing} onClick={() => void reset()}>Clear saved draft and start fresh</button></div>}
      <div className="gp-step" key={draft.step}>
        {draft.step === 0 && <><fieldset className="gp-fieldset"><legend>I am here as a</legend><div className="gp-role-grid">{ROLES.map(role => <button key={role.id} className={`gp-choice ${draft.role === role.id ? 'is-active' : ''}`} aria-pressed={draft.role === role.id} onClick={() => update({ role: role.id })}>{role.label}<span aria-hidden="true">{draft.role === role.id ? '✓' : '↗'}</span></button>)}</div></fieldset><fieldset className="gp-fieldset"><legend>Right now, I want to</legend><div className="gp-decisions">{DECISIONS.map(decision => <label key={decision.id} className={draft.decision === decision.id ? 'is-active' : ''}><input type="radio" name="decision" value={decision.id} checked={draft.decision === decision.id} onChange={() => update({ decision: decision.id as Draft['decision'] })} /><span><strong>{decision.label}</strong><small>{decision.note}</small></span></label>)}</div></fieldset></>}
        {draft.step === 1 && <PropertyStep query={draft.propertyQuery} parcelId={draft.parcelId} historical={historical} confirmedLive={draft.propertyConfirmed && draft.propertyEvidence === 'live'} searchResult={propertySearch} candidate={candidate} detail={propertyDetail} status={propertyStatus} error={propertyError} onQuery={value => update({ propertyQuery: value, parcelId: null, propertyConfirmed: false, propertyEvidence: null })} onSearch={() => void search()} onCandidate={setCandidate} onConfirm={() => void confirmProperty()} onRefresh={() => void refreshProperty()} onChangeParcel={changeParcel} />}
        {draft.step === 2 && <><label className="gp-label" htmlFor="gp-description">Describe the work in your own words</label><textarea id="gp-description" className="gp-input" rows={4} maxLength={4000} placeholder="Repair the existing house. Maybe add a bedroom at the back, but not another dwelling…" value={draft.description} onChange={event => update({ description: event.target.value })} /><div className="gp-ai-entry"><p>Use AI to suggest work activities from your words. You review them before anything is added.</p><Button variant="secondary" disabled={aiAvailability !== 'ready' || !draft.description.trim() || aiStatus === 'loading'} onClick={() => void suggestWork()} data-testid="suggest-work-button">{aiStatus === 'loading' ? 'Finding suggestions…' : 'Suggest work from my description'}</Button><AiAvailabilityNote state={aiAvailability} /></div>{aiStatus === 'error' && <p className="gp-ai-error" role="alert">{aiError}</p>}{aiStatus === 'review' && aiResult && <IntakeReview result={aiResult} selected={aiSelected} onToggle={id => setAiSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])} onApply={applyWork} onDiscard={() => { setAiStatus('idle'); setAiResult(null); setAiSelected([]) }} />}<fieldset className="gp-fieldset"><legend>Which work is part of your proposal?</legend><p className="gp-helper">Select all that apply. A bedroom does not imply another dwelling.</p><div className="gp-activities">{ACTIVITIES.map(activity => <div className="gp-activity" key={activity.id}><label><input type="checkbox" checked={draft.activities.includes(activity.id)} onChange={() => toggleActivity(activity.id, false)} /><span>{activity.label}</span></label><button className={draft.tentativeActivities.includes(activity.id) ? 'is-tentative' : ''} aria-pressed={draft.tentativeActivities.includes(activity.id)} aria-label={`Mark ${activity.label} as tentative`} onClick={() => toggleActivity(activity.id, true)}>{draft.tentativeActivities.includes(activity.id) ? 'Tentative ✓' : 'Maybe'}</button></div>)}</div></fieldset></>}
        {draft.step === 2 && <div className="gp-screening-inputs"><p className="gp-helper">These answers are your proposal assumptions. County records do not supply them.</p><fieldset className="gp-fieldset"><legend>Proposed housing form</legend><div className="gp-segments">{([{ id: 'detached', label: 'Detached' }, { id: 'attached', label: 'Attached' }, { id: 'unknown', label: 'Unknown' }] as const).map(choice => <label key={choice.id} className={draft.housingForm === choice.id ? 'is-active' : ''}><input type="radio" name="housing-form" checked={draft.housingForm === choice.id} onChange={() => update({ housingForm: choice.id })} />{choice.label}</label>)}</div></fieldset><fieldset className="gp-fieldset"><legend>Will the work disturb the ground?</legend><div className="gp-segments">{([{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'unknown', label: 'Unknown' }] as const).map(choice => <label key={choice.id} className={draft.groundDisturbance === choice.id ? 'is-active' : ''}><input type="radio" name="ground-disturbance" checked={draft.groundDisturbance === choice.id} onChange={() => update({ groundDisturbance: choice.id })} />{choice.label}</label>)}</div></fieldset></div>}
        {draft.step === 3 && <><div className="gp-financial"><span className="gp-kicker">Financial readiness</span><p>These answers identify missing preparation. They do not establish financial viability.</p>{([{ id: 'budget', label: 'A preliminary project budget' }, { id: 'value', label: 'Expected rents, sales or completed value' }, { id: 'funding', label: 'A potential funding or subsidy path' }] as const).map(question => <fieldset key={question.id}><legend>{question.label}</legend><div className="gp-segments">{(['yes', 'no', 'unknown'] as const).map(answer => <label key={answer} className={draft.financial[question.id] === answer ? 'is-active' : ''}><input type="radio" name={question.id} checked={draft.financial[question.id] === answer} onChange={() => update({ financial: { ...draft.financial, [question.id]: answer } })} />{answer === 'yes' ? 'Yes' : answer === 'no' ? 'Not yet' : 'Unknown'}</label>)}</div></fieldset>)}</div><details className="gp-details"><summary>Homes and community outcomes <span>Optional / unknown is okay</span></summary><div className="gp-counts">{([{ id: 'existingHomes', label: 'Existing homes' }, { id: 'proposedHomes', label: 'Proposed total homes' }, { id: 'homesRetained', label: 'Homes retained' }] as const).map(item => <label key={item.id}>{item.label}<input className="gp-input" type="number" min="0" max="100000" step="1" placeholder="Unknown" value={countInputError?.id === item.id ? countInputError.value : draft[item.id] ?? ''} aria-invalid={countInputError?.id === item.id} aria-describedby={countInputError?.id === item.id ? 'gp-count-error' : undefined} onChange={event => updateHomeCount(item.id, event.target.value)} /></label>)}</div>{countInputError && <p id="gp-count-error" className="gp-count-error" role="alert">{countInputError.message}</p>}{countError && <p className="gp-count-error" role="alert">Homes retained cannot exceed existing or proposed homes.</p>}<label className="gp-label" htmlFor="gp-affordability">Affordability goal</label><input id="gp-affordability" className="gp-input" value={draft.affordabilityGoal} maxLength={1000} placeholder="Unknown, or describe your goal" onChange={event => update({ affordabilityGoal: event.target.value })} /><label className="gp-label" htmlFor="gp-uses">Essential non-housing uses</label><input id="gp-uses" className="gp-input" value={draft.essentialUses} maxLength={1000} placeholder="e.g. neighborhood grocery, or unknown" onChange={event => update({ essentialUses: event.target.value })} /></details></>}
        {draft.step === 4 && <><div className="gp-review-row"><div><span className="gp-kicker">Property</span><h2>{draft.propertyQuery || 'Not identified'}</h2><p>{selected ? 'Historical Lanark research example selected' : draft.propertyConfirmed && draft.propertyEvidence === 'live' ? `Parcel ${draft.parcelId} selected from live lookup; municipality needs verification` : 'Identity and municipality unresolved'}</p></div><button className="gp-text-button" onClick={changeParcel}>Change parcel</button></div><div className="gp-review-row"><div><span className="gp-kicker">Your words</span><p className="gp-original">{draft.description || 'No written description supplied.'}</p><div className="gp-tags">{draft.activities.map(id => <span key={id}>{ACTIVITIES.find(activity => activity.id === id)?.label}</span>)}{draft.tentativeActivities.map(id => <span key={id} className="is-tentative">Maybe: {ACTIVITIES.find(activity => activity.id === id)?.label}</span>)}</div><p>Proposed housing form: {draft.housingForm}. Ground disturbance: {draft.groundDisturbance}.</p></div><button className="gp-text-button" onClick={() => go(2)}>Edit work</button></div><div className="gp-review-row"><div><span className="gp-kicker">Intended outcomes</span><div className="gp-outcomes"><span><strong>{draft.homesRetained ?? '?'}</strong>homes retained</span><span><strong>{summary.netNew ?? '?'}</strong>net new homes</span></div><p>{draft.affordabilityGoal || 'Affordability goal unknown'} · {draft.essentialUses || 'Essential non-housing uses unknown'}</p><p>Financial feasibility: Unassessed</p></div><button className="gp-text-button" onClick={() => go(3)}>Edit answers</button></div><p className="gp-note">Confirmation saves your intentions. Run the available property checks on the next screen; they do not determine permission or financial feasibility.</p></>}
        {draft.step === 5 && <ResultsStep draft={draft} summary={summary} historical={historical} assessment={screeningResult} assessmentStatus={screeningStatus} assessmentError={screeningError} onRun={() => void runAssessment()} onChangeParcel={changeParcel} onEditProposal={() => go(2)} />}
      </div>
      {notice && <p className="gp-feedback" role="status">{notice}</p>}
      <div className="gp-navigation">{draft.step > 0 ? <button className="gp-text-button" onClick={() => go(draft.step - 1)}>← Back</button> : <a className="gp-text-button" href="/">← Home</a>}<span>{draft.step < 5 ? `${draft.step + 1} of 6` : 'Your next move'}</span>{draft.step < 5 ? <button className="gp-primary" onClick={next}>{draft.step === 4 ? 'Confirm & prepare brief' : 'Continue'} <span aria-hidden="true">↗</span></button> : <button className="gp-primary" onClick={download}>Export project brief <span aria-hidden="true">↗</span></button>}</div>
    </section><aside className="gp-aside"><SiteContextMap historical={historical} detail={draft.propertyConfirmed && draft.propertyEvidence === 'live' ? propertyDetail : null} savedParcelId={draft.propertyConfirmed && draft.propertyEvidence === 'live' ? draft.parcelId : null} loading={propertyStatus === 'loading'} loadError={propertyError} onLoadCurrentRecords={() => void refreshProperty()} /></aside></main>
    <footer className="gp-footer"><p className={storageError ? 'gp-error' : ''} role="status" data-testid="draft-save-status"><span className="gp-storage-dot" aria-hidden="true" />{storage}</p><button className="gp-text-button" disabled={clearing} onClick={() => void reset()}>{clearing ? 'Clearing…' : 'Clear draft'}</button><a href="/prototype">Historical Lanark comparison ↗</a></footer>
  </div>
}
