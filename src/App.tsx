import { useState } from 'react'
import { defaultProposals, evaluate, compareFindings, exportBrief, parcel, sources, type Proposal, type Finding } from './domain'
import { refreshAssessment } from './assessment'
import { Button } from './design-system/components'

const choices = {
  lawfulUse: [['unknown', 'Unknown'], ['yes', 'Assume lawful'], ['no', 'Not established']],
  disturbance: [['unknown', 'Unknown'], ['yes', 'Yes'], ['no', 'No']],
  form: [['unknown', 'Unknown'], ['attached', 'Attached'], ['detached', 'Detached']],
  nonconformity: [['unknown', 'Unknown'], ['same', 'Assume no increase'], ['increased', 'Increase proposed']],
}

type View = 'proposals' | 'comparison' | 'evidence'

function PittsburghMark() {
  const star = 'M0 -9 C1 -2 2 -1 9 0 C2 1 1 2 0 9 C-1 2 -2 1 -9 0 C-2 -1 -1 -2 0 -9Z'
  return <svg viewBox="0 0 66 54" className="pittsburgh-mark" role="img" aria-label="Pittsburgh 412, Steelers-inspired steelmark colors"><circle cx="32" cy="27" r="24" fill="white" stroke="#b9bec1" strokeWidth="2"/><text x="12" y="31" fill="black" fontSize="13" fontWeight="700">412</text><path d={star} transform="translate(41 16) scale(.7)" fill="#ffb612"/><path d={star} transform="translate(49 28) scale(.7)" fill="#c83832"/><path d={star} transform="translate(40 39) scale(.7)" fill="#3264a0"/></svg>
}

function ParcelView() {
  const xs = parcel.ring.map(p => p[0]), ys = parcel.ring.map(p => p[1])
  const minX = Math.min(...xs), maxY = Math.max(...ys)
  const width = Math.max(...xs) - minX, height = maxY - Math.min(...ys)
  const points = parcel.ring.map(([x, y]) => `${x - minX},${maxY - y}`).join(' ')
  return <section className="site-view" aria-label="Lanark parcel drawing">
    <div className="drawing-toolbar"><span className="drawing-mode"><i/>Parcel plan</span><span className="drawing-date">Sep 26, 2026 snapshot</span></div>
    <div className="drawing-address"><span>Fineview, Pittsburgh</span><h1>1623 Lanark St</h1><p>23-C-208 <span>/</span> {parcel.id}</p></div>
    <div className="north-arrow" aria-label="North up"><span>N</span><svg width="20" height="37" viewBox="0 0 20 37" aria-hidden="true"><path d="M10 1L18 24L10 19L2 24Z" fill="currentColor"/><path d="M10 19V37" stroke="currentColor"/></svg></div>
    <svg className="parcel-drawing" viewBox={`-25 -35 ${width + 50} ${height + 85}`} role="img" aria-label="Actual parcel boundary in EPSG:2272, north up, equal scale on both axes">
      <defs><pattern id="parcel-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V3" stroke="#c28a00" strokeWidth=".14"/></pattern></defs>
      <polygon points={points} fill="#ffb612" fillOpacity=".22" stroke="#b78308" strokeWidth=".7"/>
      <polygon points={points} fill="url(#parcel-hatch)"/>
      {parcel.ring.slice(0,-1).map(([x,y],i)=><rect key={i} x={x-minX-1} y={maxY-y-1} width="2" height="2" fill="white" stroke="#a07408" strokeWidth=".45"/>)}
      <text x={width/2} y={height/2-2} fontSize="4.5" textAnchor="middle" fill="#4b431e" fontWeight="600">23-C-208</text>
      <text x={width/2} y={height/2+4} fontSize="2.6" textAnchor="middle" fill="#695e3a">Parcel boundary</text>
      <g transform={`translate(0 ${height+26})`}><path d="M0 -1V1H20V-1M10 0V1" fill="none" stroke="#667279" strokeWidth=".35"/><text x="0" y="5" fontSize="2.6" fill="#667279">0</text><text x="20" y="5" fontSize="2.6" textAnchor="end" fill="#667279">20 US survey ft</text></g>
    </svg>
    <div className="drawing-note"><span className="boundary-key"/>Verified parcel geometry<span className="drawing-note-secondary">Not a survey or building footprint</span></div>
    <div className="site-facts"><div><span>Base zoning</span><strong>R1D-H</strong><small>High-density detached residential</small></div><div><span>Assessment lot area</span><strong>1,657 <small>sq ft</small></strong><small>As of September 1, 2026</small></div></div>
    <div className="map-caption">Allegheny County parcel data · EPSG:2272 · One supported demo property</div>
  </section>
}

function ProposalEditor({value,onChange,index}:{value:Proposal;onChange:(p:Proposal)=>void;index:number}) {
  const select = (key:keyof typeof choices, label:string) => <label>{label}<select value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}>{choices[key].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
  return <fieldset className="proposal"><legend><span className={`proposal-letter letter-${index}`}>{index===0?'A':'B'}</span>Proposal {index===0?'A':'B'}</legend>
    <label>Proposal name<input maxLength={80} value={value.name} onChange={e=>onChange({...value,name:e.target.value})}/></label>
    <p className="input-label" id={`scope-${index}`}>Type of work</p>
    <div className="scope-options" role="group" aria-labelledby={`scope-${index}`}>
      {([['repair','Repair'],['expansion','Expand'],['reconstruction','Rebuild']] as const).map(([scope,title])=><button key={scope} type="button" aria-pressed={value.scope===scope} className={value.scope===scope?'scope-option active':'scope-option'} onClick={()=>onChange({...value,scope})}>{title}</button>)}
    </div>
    <p className="scope-hint">{value.scope==='repair'?'Remodel within the existing footprint.':value.scope==='expansion'?'Enlarge the existing structure.':'Reconstruction or partial demolition.'}</p>
    <div className="fields units">{(['existingUnits','proposedUnits'] as const).map(key=><label key={key}>{key==='existingUnits'?'Existing homes (assumed)':'Proposed homes'}<input type="number" min="0" max="100" step="1" placeholder="Unknown" value={value[key]??''} onChange={e=>onChange({...value,[key]:e.target.value===''?null:Number(e.target.value)})}/></label>)}</div>
    <div className="assumption-title">What else is known?</div>
    {select('lawfulUse','Lawful existing use')}{select('form','Building form')}{select('disturbance','Land disturbance')}{select('nonconformity','Change in nonconformity')}
  </fieldset>
}

function FindingDetail({finding,onSource}:{finding:Finding;onSource:(id:string)=>void}) {
  return <div className="finding-detail"><span className="state">{finding.state}</span><p>{finding.reason}</p><p><strong>Still needed:</strong> {finding.missing}</p><p><strong>Next action:</strong> {finding.action}</p><div className="citations">{finding.sourceIds.map(id=><button className="source-reference" key={id} onClick={()=>onSource(id)}>{id}</button>)}</div></div>
}

export default function App() {
  const [view,setView] = useState<View>('proposals')
  const [proposals,setProposals] = useState<[Proposal,Proposal]>(defaultProposals)
  const [refreshNote,setRefreshNote] = useState('No live refresh requested. Comparison uses the September 26, 2026 verified-date research snapshot.')
  const [loading,setLoading] = useState(false)
  const [exported,setExported] = useState(false)
  const [showAll,setShowAll] = useState(false)
  const results = proposals.map(evaluate)
  const comparisons = compareFindings(proposals)
  const explanationChanges = comparisons.filter(item=>item.explanationChanged).length
  const statusChanges = comparisons.filter(item=>item.reviewStatusChanged).length
  const actionChanges = comparisons.filter(item=>item.nextActionChanged).length
  const changed = comparisons.filter(item=>item.explanationChanged||item.reviewStatusChanged||item.nextActionChanged).length
  const inputLabels:Record<Exclude<keyof Proposal,'name'>,string> = {scope:'Type of work',existingUnits:'Existing homes',proposedUnits:'Proposed homes',lawfulUse:'Lawful-use assumption',form:'Building form',disturbance:'Ground disturbance',nonconformity:'Nonconformity assumption'}
  const changedInputs = (Object.keys(inputLabels) as (keyof typeof inputLabels)[]).filter(key=>proposals[0][key]!==proposals[1][key]).map(key=>inputLabels[key])
  const loadDisturbancePair = () => {const base={...defaultProposals[0]};setProposals([{...base,name:'Repair, no ground disturbance',disturbance:'no'},{...base,name:'Repair, ground disturbance',disturbance:'yes'}]);setExported(false);setShowAll(false)}
  const update = (index:number,p:Proposal) => {setProposals(old=>index===0?[p,old[1]]:[old[0],p]);setExported(false)}
  const download = () => {
    const url=URL.createObjectURL(new Blob([exportBrief(proposals,refreshNote)],{type:'text/markdown;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download='lanark-comparison-brief.md';a.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000);setExported(true)
  }
  const navigate = (next:View) => {setView(next);document.querySelector('.work-panel')?.scrollTo({top:0});if(window.innerWidth<900)document.querySelector('.work-panel')?.scrollIntoView({block:'start'})}
  const openSource = (id:string) => {navigate('evidence');requestAnimationFrame(()=>{const el=document.getElementById(`source-${id}`);if(el instanceof HTMLDetailsElement){el.open=true;el.scrollIntoView({block:'nearest'})}})}
  return <div className="app-shell"><header className="app-header"><a className="brand" href="#" onClick={()=>navigate('proposals')}><PittsburghMark/><span>Housing Navigator<small>Pittsburgh</small></span></a><div className="header-right"><span className="local-label">Historical Lanark example</span><button className="export-button" onClick={download}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2V13M6 9L10 13L14 9M3 13V18H17V13" stroke="currentColor" strokeWidth="1.5"/></svg>Export brief</button></div></header>
    <main className="workbench"><ParcelView/><section className="work-panel" aria-label="Proposal workbench"><div className="panel-header"><div><span className="panel-location">Lanark / Project study</span><h2>Explore a housing proposal</h2></div><span className="case-badge">Historical example</span></div>
      <nav className="panel-tabs" aria-label="Workspace views">{([['proposals','Proposals'],['comparison','Comparison'],['evidence','Evidence']] as const).map(([id,title])=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}>{title}</button>)}</nav>
      <div className="conflict" role="note"><span className="conflict-icon">!</span><div><strong>Property records conflict</strong><p>Assessment: VACANT LAND. Six permits describe dwelling work. Current condition and lawful use need review.</p></div><button aria-label="View conflicting evidence" onClick={()=>openSource('assessment')}>↗</button></div>
      <div className="view-content" hidden={view!=='proposals'} id="proposals"><div className="editor-intro"><p>Compare two scopes on the same parcel.</p><button className="text-button" onClick={()=>{setProposals(defaultProposals);setExported(false)}}>Reset examples</button></div><div className="proposal-grid">{proposals.map((p,i)=><ProposalEditor key={i} value={p} index={i} onChange={value=>update(i,value)}/>)}</div><p className="assumption-note">Inputs are hypothetical. Leave unverified facts as unknown. Nonconformity means a departure from current zoning standards.</p><div className="panel-action"><span>One parcel. Two proposals.</span><Button onClick={()=>navigate('comparison')}>Compare proposals <span aria-hidden="true">↗</span></Button></div></div>
      <div className="view-content" hidden={view!=='comparison'} id="comparison"><div className="comparison-heading"><h3>Your comparison</h3><button className="text-button" onClick={()=>navigate('proposals')}>Edit proposals</button></div><p className="input-difference">Changed inputs: <strong>{changedInputs.length?changedInputs.join(', '):'None'}</strong>. Names do not affect the findings.</p><div className="comparison-overview"><div data-testid="explanation-changes"><strong>{explanationChanges}</strong><span>Explanation changes</span></div><div data-testid="status-changes"><strong>{statusChanges}</strong><span>Review-status changes</span></div><div data-testid="action-changes"><strong>{actionChanges}</strong><span>Next-action changes</span></div></div><div className="decision-difference"><strong>{actionChanges===0?'The next action is the same for both proposals.':'A scope-specific diligence task changes.'}</strong><p>{actionChanges===0?'A different explanation does not establish a different project decision. Both still need the unresolved property evidence.':'Review the changed task below. The record conflict still requires reconciliation; this is not a different approval or financial outcome.'}</p></div><div className="next-action"><span>Next action</span><p>Confirm the dwelling's lawful use with City staff, then review the proposed work.</p><a href="https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/OneStopPGH-Permit-Center" target="_blank" rel="noreferrer">OneStopPGH Permit Center ↗</a></div><div className="result-filter"><button className={!showAll?'active':''} aria-pressed={!showAll} onClick={()=>setShowAll(false)}>Differences ({changed})</button><button className={showAll?'active':''} aria-pressed={showAll} onClick={()=>setShowAll(true)}>All checks ({results[0].length})</button></div>
      {changed===0&&!showAll&&<p className="empty-result">These proposals trigger the same checks. Property conflicts and unknowns still apply.</p>}
      {comparisons.map(item=>{const {left:f,right:other}=item;const different=item.explanationChanged||item.reviewStatusChanged||item.nextActionChanged;return <details key={f.id} id={`trace-${f.id}`} className={`comparison-row ${different?'changed':''}`} hidden={!showAll&&!different}><summary><span className="result-dot"/><h4>{f.title}</h4><span>{different?'Differs':'Same'}</span><b aria-hidden="true">+</b></summary><div className="finding-deltas"><span>Explanation: <strong>{item.explanationChanged?'different':'same'}</strong></span><span>Review status: <strong>{item.reviewStatusChanged?'different':'same'}</strong></span><span>Next action: <strong>{item.nextActionChanged?'different':'same'}</strong></span></div><div className="comparison-content"><div><h5>A / {proposals[0].name}</h5><FindingDetail finding={f} onSource={openSource}/></div><div><h5>B / {proposals[1].name}</h5><FindingDetail finding={other} onSource={openSource}/></div></div></details>})}
      <div className="alternate-pair"><strong>Test a narrower practical difference</strong><p>Keep repair fixed and change only ground disturbance. This may change the site-plan review task, not the immediate need to reconcile the property records.</p><Button variant="secondary" onClick={loadDisturbancePair}>Try ground-disturbance contrast</Button></div>
      <details className="scorecard"><summary>Overall ease: not rated / scorecard & unknowns</summary><dl><div><dt>Legal permission</dt><dd>Review required</dd></div><div><dt>Site constraints</dt><dd>Review required</dd></div><div><dt>Process complexity</dt><dd>Unknown</dd></div><div><dt>Financial feasibility</dt><dd>Unassessed</dd></div></dl><p>Evidence is partial. Flood, historic status, utilities, title, contamination, undermining and structural condition are not established. Mapped slope is an intersection flag, not a survey. No numerical score or approval probability is assigned.</p></details><div className="panel-action"><button className="text-button" onClick={()=>window.print()}>Print / save as PDF</button><Button onClick={download}>Download Markdown brief</Button></div></div>
      <div className="view-content evidence-content" hidden={view!=='evidence'} id="sources"><h3>Evidence register</h3><p className="evidence-intro">Research snapshot retrieved September 26, 2026. Complete rule and effective-date review remains outstanding.</p><details className="refresh"><summary>Check the latest assessment record</summary><p>A live observation is shown separately. It does not replace the dated comparison evidence.</p><button className="secondary" disabled={loading} onClick={async()=>{setLoading(true);const r=await refreshAssessment(parcel.id);setRefreshNote(r.note);setLoading(false)}}>{loading?'Checking source...':'Refresh assessment only'}</button><p className="refresh-note" role="status">{refreshNote}</p></details>{sources.map(s=><details key={s.id} id={`source-${s.id}`} className="source-row"><summary>{s.title}<span>+</span></summary><p><a href={s.url} target="_blank" rel="noreferrer">Open source ↗</a></p><p>As of: {s.asOf}<br/>Retrieved: {s.retrievedAt}</p><p>{s.terms}</p></details>)}<details className="limitations"><summary>Prototype limitations</summary><p>AI is unavailable. These are deterministic conditional checks, not approval decisions. Practitioner fit, full rule review and organizer acceptance of component-only scoring are unvalidated. No acquisition recommendation or financial conclusion is established.</p></details></div>
      <p className="export-status" role="status">{exported?'Brief downloaded with both proposals, assumptions and sources.':''}</p>
    </section></main><footer className="status-bar"><span><i/>Lanark evidence loaded <small>/ snapshot</small></span><span>Independent Pittsburgh prototype <span className="status-divider">|</span> AI unavailable <span className="status-divider">|</span> Finances unassessed</span></footer></div>
}
