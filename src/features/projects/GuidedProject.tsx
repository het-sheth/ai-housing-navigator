import { useEffect, useRef, useState } from 'react'
import { parcel, sources } from '../../domain'
import { ACTIVITIES, ROLES, createDraft, summarizeDraft, type Draft } from './contracts'
import { clearDraft, loadDraft, saveDraft } from './draft-store'
import './guided-project.css'

const STEPS = ['Your purpose', 'Your property', 'Your proposal', 'Key questions', 'Review', 'Next actions']
const TITLES = ['What brings you here?', 'Start with a place.', 'What do you have in mind?', 'Before the next investment.', 'Your proposal, in focus.', 'A clearer next step.']
const INTRO = ['A little context helps shape your project brief. You can change these choices later.', 'Enter a site anywhere in Allegheny County, or explore our dated Lanark research example.', 'Keep it in your own words. Select the work you intend, and separate possibilities from decisions.', 'Have you started checking whether the project can pencil out? Unknown is a useful answer.', 'Check your intentions and the open questions before preparing your next-action brief.', 'Start with the evidence that matters before spending more on design or approvals.']
const DECISIONS = [{ id: 'pursue', label: 'Decide whether to pursue a site', note: 'Find the questions worth answering first.' }, { id: 'compare', label: 'Explore a different proposal', note: 'Understand what changes with the scope.' }, { id: 'prepare', label: 'Prepare for professional review', note: 'Make the next conversation more useful.' }]
const PILLARS = ['Property control and rights', 'Land use and design permission', 'Site and building condition', 'Environmental, health and climate hazards', 'Utilities and access', 'Market demand and affordability goals', 'Capital and operating viability', 'Approvals and delivery readiness']

function SiteContext({ selected }: { selected: boolean }) {
  const xs = parcel.ring.map(([x]) => x)
  const ys = parcel.ring.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxY = Math.max(...ys)
  const width = Math.max(...xs) - minX
  const height = maxY - Math.min(...ys)
  const points = parcel.ring.map(([x, y]) => `${x - minX},${maxY - y}`).join(' ')
  return <div className={`gp-site ${selected ? 'is-selected' : ''}`}>
    <div className="gp-site-top"><span>Site context</span><span>{selected ? '2D / research snapshot' : 'Awaiting identification'}</span></div>
    {selected ? <><svg viewBox={`-15 -25 ${width + 30} ${height + 50}`} role="img" aria-label="Actual Lanark parcel boundary, north up. This is not a survey or building footprint."><defs><pattern id="gp-parcel-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V3" stroke="currentColor" strokeWidth=".25" /></pattern></defs><polygon points={points} fill="url(#gp-parcel-hatch)" stroke="currentColor" strokeWidth=".6" /><text x={width / 2} y={height + 13} textAnchor="middle" fontSize="3.6">23-C-208</text><text x={width + 3} y="-12" fontSize="4">N ↑</text></svg><h3>1623 Lanark Street</h3><p>Fineview · City of Pittsburgh</p><div className="gp-site-facts"><span>Parcel ID<strong>{parcel.id}</strong></span><span>Recorded lot area<strong>1,657 sq ft</strong></span></div><small>County parcel research snapshot, retrieved September 26, 2026. Boundary only. Current condition and lawful use remain unresolved.</small></> : <><div className="gp-site-empty" aria-hidden="true"><span>+</span><span>412</span><span>+</span></div><h3>Your site belongs here.</h3><p>Property identification is not connected yet. Your address stays in the draft without an invented map or jurisdiction.</p></>}
  </div>
}

function markdownText(value: string) {
  return value.replace(/[\\`*_{}[\]<>#|]/g, character => `\\${character}`)
}

export default function GuidedProject() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [storage, setStorage] = useState('Opening your device draft…')
  const [storageError, setStorageError] = useState(false)
  const [notice, setNotice] = useState('')
  const [clearing, setClearing] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const skipSave = useRef(false)
  const previousStep = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    loadDraft().then(saved => {
      if (!active) return
      setDraft(saved ?? createDraft())
      setStorage(saved ? 'Recovered from this device' : 'Device only')
    }).catch(() => {
      if (!active) return
      setDraft(createDraft())
      setStorage('Device storage unavailable. Export your work before leaving.')
      setStorageError(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!draft || clearing) return
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

  if (!draft) return <main className="gp gp-loading"><span className="gp-mark">412</span><p role="status">Opening your workspace…</p></main>

  const selected = draft.parcelId === parcel.id && draft.propertyConfirmed
  const summary = summarizeDraft(draft)
  const update = (change: Partial<Draft>, editing = true) => {
    setNotice('')
    setStorage('Saving on this device…')
    setDraft(current => current ? { ...current, ...change, revision: current.revision + 1, updatedAt: new Date().toISOString(), ...(editing ? { confirmedAt: null } : {}) } : current)
  }
  const go = (step: number) => update({ step: step as Draft['step'] }, false)
  const toggleActivity = (id: Draft['activities'][number], tentative: boolean) => {
    const field = tentative ? 'tentativeActivities' : 'activities'
    const other = tentative ? 'activities' : 'tentativeActivities'
    update({ [field]: draft[field].includes(id) ? draft[field].filter(value => value !== id) : [...draft[field], id], [other]: draft[other].filter(value => value !== id) })
  }
  const countError = draft.homesRetained !== null && ((draft.existingHomes !== null && draft.homesRetained > draft.existingHomes) || (draft.proposedHomes !== null && draft.homesRetained > draft.proposedHomes))
  const next = () => {
    if (draft.step === 1 && !draft.propertyQuery.trim()) { setNotice('Enter an address or parcel ID, or choose the Lanark example.'); return }
    if (draft.step === 2 && !draft.description.trim() && draft.activities.length === 0 && draft.tentativeActivities.length === 0) { setNotice('Describe your idea or select a work activity. Other / uncertain work is welcome.'); return }
    if (draft.step === 3 && countError) { setNotice('Homes retained cannot exceed the existing or proposed total. Leave a count blank if unknown.'); return }
    if (draft.step === 4) update({ step: 5, confirmedAt: new Date().toISOString() }, false)
    else go(draft.step + 1)
  }
  const download = () => {
    const lines = ['# 412 Housing Navigator project brief', '', `Status: ${draft.confirmedAt ? 'Confirmed intentions; planning tasks only' : 'Draft, unassessed'}`, `Updated: ${draft.updatedAt}`, `Draft revision: ${draft.revision}`, `Property: ${markdownText(draft.propertyQuery || 'Not identified')}`, `Identification: ${selected ? `Lanark dated example, parcel ${parcel.id}` : 'Unresolved; address retained as user input'}`, '', '## Original description', ...draft.description.split('\n').map(line => `> ${markdownText(line)}`), '', '## Intended work', ...draft.activities.map(id => `- ${ACTIVITIES.find(activity => activity.id === id)?.label ?? id}`), '', '## Tentative work', ...draft.tentativeActivities.map(id => `- ${ACTIVITIES.find(activity => activity.id === id)?.label ?? id}`), '', `Existing homes: ${draft.existingHomes ?? 'Unknown'}`, `Proposed homes: ${draft.proposedHomes ?? 'Unknown'}`, `Homes retained: ${draft.homesRetained ?? 'Unknown'}`, `Net new homes: ${summary.netNew ?? 'Unknown'}`, `Affordability goal: ${markdownText(draft.affordabilityGoal || 'Unknown')}`, `Essential non-housing uses: ${markdownText(draft.essentialUses || 'Unknown')}`, '', '## Financial readiness', `Preliminary budget: ${draft.financial.budget}`, `Revenue or value assumptions: ${draft.financial.value}`, `Funding path: ${draft.financial.funding}`, 'Financial feasibility: Unassessed. These are user-reported readiness answers, not a viability evaluation.', '', '## Next diligence tasks', ...summary.tasks.flatMap((task, index) => [`${index + 1}. ${task.title}`, `   Responsible party: ${task.party}`, `   Requested evidence: ${task.request}`]), '', '## Coverage and limits', 'No runtime AI, live property resolution, permission determination or financial evaluation was performed. Task outcomes and immutable assessment history are not implemented in this local draft. Changes replace this draft; export before editing to retain a copy. All user inputs remain unverified.']
    if (selected) lines.push('', '## Dated Lanark evidence', 'County assessment dated 2026-09-01 classifies vacant land. City permit research retrieved 2026-09-26 references a dwelling. Neither establishes present condition or lawful use.', ...sources.filter(source => ['assessment', 'parcel', 'pli'].includes(source.id)).map(source => `- [${source.title}](${source.url}) | source date: ${source.asOf} | retrieved: ${source.retrievedAt}`))
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
    setClearing(true)
    await saveQueue.current.catch(() => {})
    try {
      await clearDraft()
      skipSave.current = true
      setDraft(createDraft())
      setStorage('Draft cleared. Device only.')
      setStorageError(false)
      setNotice('Your previous device draft was cleared.')
    } catch { setStorage('Could not clear device storage. Your draft is still open.'); setStorageError(true) }
    finally { setClearing(false) }
  }

  return <div className="gp">
    <header className="gp-header"><a className="gp-brand" href="/"><span className="gp-mark">412</span><span>Housing Navigator<small>Independent project workspace</small></span></a><div className="gp-header-actions"><span className="gp-local">Device only</span><button className="gp-text-button" onClick={download}>Export brief <span aria-hidden="true">↗</span></button></div></header>
    <nav className="gp-progress" aria-label="Project progress"><ol>{STEPS.map((name, index) => <li key={name} className={draft.step === index ? 'is-current' : draft.step > index ? 'is-past' : ''}><button disabled={index > draft.step} aria-current={draft.step === index ? 'step' : undefined} onClick={() => go(index)}><span>{String(index + 1).padStart(2, '0')}</span><span>{name}</span></button></li>)}</ol></nav>
    <main className="gp-layout"><section className="gp-workspace" aria-label="Project questions"><div className="gp-eyebrow">Your project / {String(draft.step + 1).padStart(2, '0')}</div><h1 ref={heading} tabIndex={-1}>{TITLES[draft.step]}</h1><p className="gp-intro">{INTRO[draft.step]}</p>
      <div className="gp-step" key={draft.step}>
        {draft.step === 0 && <><fieldset className="gp-fieldset"><legend>I am here as a</legend><div className="gp-role-grid">{ROLES.map(role => <button key={role.id} className={`gp-choice ${draft.role === role.id ? 'is-active' : ''}`} aria-pressed={draft.role === role.id} onClick={() => update({ role: role.id })}>{role.label}<span aria-hidden="true">{draft.role === role.id ? '✓' : '↗'}</span></button>)}</div></fieldset><fieldset className="gp-fieldset"><legend>Right now, I want to</legend><div className="gp-decisions">{DECISIONS.map(decision => <label key={decision.id} className={draft.decision === decision.id ? 'is-active' : ''}><input type="radio" name="decision" value={decision.id} checked={draft.decision === decision.id} onChange={() => update({ decision: decision.id as Draft['decision'] })} /><span><strong>{decision.label}</strong><small>{decision.note}</small></span></label>)}</div></fieldset></>}
        {draft.step === 1 && <><label className="gp-label" htmlFor="gp-property">Street address or parcel ID</label><input id="gp-property" className="gp-input gp-address" value={draft.propertyQuery} maxLength={300} placeholder="e.g. 1623 Lanark Street" onChange={event => update({ propertyQuery: event.target.value, parcelId: null, propertyConfirmed: false })} /><p className="gp-helper">Your entry is saved as written. Live property search is not connected yet.</p><div className="gp-example"><span className="gp-kicker">Explore a real research case</span><h2>1623 Lanark Street</h2><p>One property. Conflicting records. A useful place to see what remains unknown.</p><button className="gp-secondary" onClick={() => update({ propertyQuery: parcel.address, parcelId: parcel.id, propertyConfirmed: false })}>Use Lanark example <span aria-hidden="true">↗</span></button>{draft.parcelId === parcel.id && <label className="gp-check"><input type="checkbox" checked={draft.propertyConfirmed} onChange={event => update({ propertyConfirmed: event.target.checked })} /><span>I want to explore the dated Lanark example, parcel {parcel.id}.</span></label>}</div>{!selected && draft.propertyQuery && <p className="gp-note">Identification unresolved. You can continue planning, but no municipal rule result will be inferred from this address.</p>}</>}
        {draft.step === 2 && <><label className="gp-label" htmlFor="gp-description">Describe the work in your own words</label><textarea id="gp-description" className="gp-input" rows={4} maxLength={4000} placeholder="Repair the existing house. Maybe add a bedroom at the back, but not another dwelling…" value={draft.description} onChange={event => update({ description: event.target.value })} /><div className="gp-ai-note"><span aria-hidden="true">✳</span><span>AI assistance is not connected yet. Choose your activities below; your original wording stays intact.</span></div><fieldset className="gp-fieldset"><legend>Which work is part of your proposal?</legend><p className="gp-helper">Select all that apply. A bedroom does not imply another dwelling.</p><div className="gp-activities">{ACTIVITIES.map(activity => <div className="gp-activity" key={activity.id}><label><input type="checkbox" checked={draft.activities.includes(activity.id)} onChange={() => toggleActivity(activity.id, false)} /><span>{activity.label}</span></label><button className={draft.tentativeActivities.includes(activity.id) ? 'is-tentative' : ''} aria-pressed={draft.tentativeActivities.includes(activity.id)} aria-label={`Mark ${activity.label} as tentative`} onClick={() => toggleActivity(activity.id, true)}>{draft.tentativeActivities.includes(activity.id) ? 'Tentative ✓' : 'Maybe'}</button></div>)}</div></fieldset></>}
        {draft.step === 3 && <><div className="gp-financial"><span className="gp-kicker">Financial readiness</span><p>These answers identify missing preparation. They do not establish financial viability.</p>{([{ id: 'budget', label: 'A preliminary project budget' }, { id: 'value', label: 'Expected rents, sales or completed value' }, { id: 'funding', label: 'A potential funding or subsidy path' }] as const).map(question => <fieldset key={question.id}><legend>{question.label}</legend><div className="gp-segments">{(['yes', 'no', 'unknown'] as const).map(answer => <label key={answer} className={draft.financial[question.id] === answer ? 'is-active' : ''}><input type="radio" name={question.id} checked={draft.financial[question.id] === answer} onChange={() => update({ financial: { ...draft.financial, [question.id]: answer } })} />{answer === 'yes' ? 'Yes' : answer === 'no' ? 'Not yet' : 'Unknown'}</label>)}</div></fieldset>)}</div><details className="gp-details"><summary>Homes and community outcomes <span>Optional / unknown is okay</span></summary><div className="gp-counts">{([{ id: 'existingHomes', label: 'Existing homes' }, { id: 'proposedHomes', label: 'Proposed total homes' }, { id: 'homesRetained', label: 'Homes retained' }] as const).map(item => <label key={item.id}>{item.label}<input className="gp-input" type="number" min="0" max="100000" step="1" placeholder="Unknown" value={draft[item.id] ?? ''} onChange={event => { const value = event.target.value; const number = Number(value); if (value === '' || (Number.isSafeInteger(number) && number >= 0 && number <= 100000)) update({ [item.id]: value === '' ? null : number }) }} /></label>)}</div>{countError && <p className="gp-error" role="alert">Homes retained cannot exceed existing or proposed homes.</p>}<label className="gp-label" htmlFor="gp-affordability">Affordability goal</label><input id="gp-affordability" className="gp-input" value={draft.affordabilityGoal} maxLength={1000} placeholder="Unknown, or describe your goal" onChange={event => update({ affordabilityGoal: event.target.value })} /><label className="gp-label" htmlFor="gp-uses">Essential non-housing uses</label><input id="gp-uses" className="gp-input" value={draft.essentialUses} maxLength={1000} placeholder="e.g. neighborhood grocery, or unknown" onChange={event => update({ essentialUses: event.target.value })} /></details></>}
        {draft.step === 4 && <><div className="gp-review-row"><div><span className="gp-kicker">Property</span><h2>{draft.propertyQuery || 'Not identified'}</h2><p>{selected ? 'Dated Lanark research example selected' : 'Identity and municipality unresolved'}</p></div><button className="gp-text-button" onClick={() => go(1)}>Edit property</button></div><div className="gp-review-row"><div><span className="gp-kicker">Your words</span><p className="gp-original">{draft.description || 'No written description supplied.'}</p><div className="gp-tags">{draft.activities.map(id => <span key={id}>{ACTIVITIES.find(activity => activity.id === id)?.label}</span>)}{draft.tentativeActivities.map(id => <span key={id} className="is-tentative">Maybe: {ACTIVITIES.find(activity => activity.id === id)?.label}</span>)}</div></div><button className="gp-text-button" onClick={() => go(2)}>Edit work</button></div><div className="gp-review-row"><div><span className="gp-kicker">Intended outcomes</span><div className="gp-outcomes"><span><strong>{draft.homesRetained ?? '?'}</strong>homes retained</span><span><strong>{summary.netNew ?? '?'}</strong>net new homes</span></div><p>{draft.affordabilityGoal || 'Affordability goal unknown'} · {draft.essentialUses || 'Essential non-housing uses unknown'}</p><p>Financial feasibility: Unassessed</p></div><button className="gp-text-button" onClick={() => go(3)}>Edit answers</button></div><p className="gp-note">Confirmation records your intentions, including unknowns. This local slice prepares diligence tasks; it does not run a regulatory or financial assessment.</p></>}
        {draft.step === 5 && <><div className="gp-result-label"><span>Planning brief</span><span>Human verification required</span></div><div className="gp-action-list">{summary.tasks.map((task, index) => <article className="gp-task" key={task.id}><span className="gp-task-number">{String(index + 1).padStart(2, '0')}</span><div><span className="gp-kicker">{task.party}</span><h2>{task.title}</h2><p>{task.request}</p></div></article>)}</div><div className="gp-result-outcomes"><span><strong>{draft.homesRetained ?? 'Unknown'}</strong>Homes retained</span><span><strong>{summary.netNew ?? 'Unknown'}</strong>Net new homes</span><span><strong>Unassessed</strong>Financial feasibility</span></div>{selected && <details className="gp-details"><summary>Why Lanark needs verification <span>Dated public evidence</span></summary><p>The county assessment dated September 1, 2026 classifies vacant land. City permit records retrieved September 26, 2026 describe work on a dwelling. These records do not establish present condition or lawful use.</p>{sources.filter(source => ['assessment', 'pli'].includes(source.id)).map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}</details>}<details className="gp-details"><summary>What has and has not been checked <span>Eight diligence areas</span></summary><p>User answers and housing arithmetic inform this brief. No regulatory evaluation, live source refresh or AI operation ran.</p><ul className="gp-coverage">{PILLARS.map(pillar => <li key={pillar}><span>{pillar}</span><strong>{pillar.startsWith('Capital') ? 'Unassessed' : 'Human verification required'}</strong></li>)}</ul></details><p className="gp-note">Device-only draft. Accounts, task outcomes and assessment history are not connected yet. Export before editing if you want to preserve this version.</p></>}
      </div>
      {notice && <p className="gp-feedback" role="status">{notice}</p>}
      <div className="gp-navigation">{draft.step > 0 ? <button className="gp-text-button" onClick={() => go(draft.step - 1)}>← Back</button> : <a className="gp-text-button" href="/">← Home</a>}<span>{draft.step < 5 ? `${draft.step + 1} of 6` : 'Your next move'}</span>{draft.step < 5 ? <button className="gp-primary" onClick={next}>{draft.step === 4 ? 'Confirm & prepare brief' : 'Continue'} <span aria-hidden="true">↗</span></button> : <button className="gp-primary" onClick={download}>Export project brief <span aria-hidden="true">↗</span></button>}</div>
    </section><aside className="gp-aside"><SiteContext selected={selected} /><div className="gp-aside-note"><span className="gp-kicker">A useful next question</span><p>{draft.step < 3 ? 'What needs to be true before this project deserves the next investment?' : 'Which missing evidence would change what you do next?'}</p><div className="gp-small-rule"/><small>Planning support for Allegheny County. Independent of municipal government. Evidence is not permission.</small></div></aside></main>
    <footer className="gp-footer"><p className={storageError ? 'gp-error' : ''} role="status"><span className="gp-storage-dot" aria-hidden="true" />{storage}</p><button className="gp-text-button" disabled={clearing} onClick={() => void reset()}>{clearing ? 'Clearing…' : 'Clear draft'}</button><a href="/prototype">Original comparison prototype ↗</a></footer>
  </div>
}
