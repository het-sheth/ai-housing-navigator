import { useState } from 'react'
import { defaultProposals, evaluate, exportBrief, parcel, sources, type Proposal, type Finding } from './domain'
import { refreshAssessment } from './assessment'

const choices = {
  lawfulUse: [['unknown','Unknown'],['yes','Assume lawful'],['no','Not established']],
  scope: [['repair','Repair / remodel'],['expansion','Expansion'],['reconstruction','Reconstruction / partial demolition']],
  disturbance: [['unknown','Unknown'],['yes','Yes'],['no','No']],
  form: [['unknown','Unknown'],['attached','Attached'],['detached','Detached']],
  nonconformity: [['unknown','Unknown'],['same','Assume no increase'],['increased','Increase proposed']],
}
function ProposalEditor({value,onChange,index}:{value:Proposal;onChange:(p:Proposal)=>void;index:number}) {
  const select = (key:keyof typeof choices, label:string) => <label>{label}<select value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}>{choices[key].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
  return <fieldset className="proposal"><legend><span className="letter">{index === 0 ? 'A' : 'B'}</span> Proposal {index === 0 ? 'A' : 'B'}</legend>
    <label>Proposal name<input maxLength={80} value={value.name} onChange={e=>onChange({...value,name:e.target.value})}/></label>
    <div className="fields">{(['existingUnits','proposedUnits'] as const).map(key=><label key={key}>{key === 'existingUnits' ? 'Existing homes (assumed)' : 'Proposed homes'}<input type="number" min="0" max="100" step="1" placeholder="Unknown" value={value[key] ?? ''} onChange={e=>onChange({...value,[key]:e.target.value === '' ? null : Number(e.target.value)})}/></label>)}</div>
    {select('scope','Type of work')}
    <div className="fields">{select('lawfulUse','Lawful existing use')}{select('form','Building form')}{select('disturbance','Land disturbance')}{select('nonconformity','Change in nonconformity')}</div>
    <p className="hint">All entries are hypothetical assumptions, not verified property facts. Nonconformity means an existing departure from current zoning standards.</p>
  </fieldset>
}
function FindingDetail({finding}:{finding:Finding}) {
  return <div className="finding-detail"><span className="state">{finding.state}</span><p>{finding.reason}</p><p><strong>Still needed:</strong> {finding.missing}</p><p><strong>Next action:</strong> {finding.action}</p><div className="citations">{finding.sourceIds.map(id=><a key={id} href={`#source-${id}`}>{id}</a>)}</div></div>
}
function ParcelMap() {
  const xs = parcel.ring.map(p=>p[0]), ys = parcel.ring.map(p=>p[1])
  const minX = Math.min(...xs), maxY = Math.max(...ys)
  const width = Math.max(...xs)-minX, height = maxY-Math.min(...ys)
  const points = parcel.ring.map(([x,y])=>`${x-minX},${maxY-y}`).join(' ')
  return <figure className="parcel-map"><svg viewBox={`-15 -15 ${width+30} ${height+30}`} role="img" aria-label="Actual Lanark parcel outline, north up, from EPSG:2272 coordinates"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#d8e4dd" strokeWidth=".3"/></pattern></defs><rect x="-15" y="-15" width={width+30} height={height+30} fill="url(#grid)"/><polygon points={points} fill="#d9b45b" fillOpacity=".45" stroke="#315a50" strokeWidth=".8"/><text x={width-2} y="-6" fontSize="4" fill="#24463e">N ↑</text><text x={width/2} y={height/2+1} fontSize="5" textAnchor="middle" fill="#24463e">23-C-208</text></svg><figcaption>Actual parcel outline · North up<br/>EPSG:2272, US survey feet · Not a survey</figcaption></figure>
}
export default function App() {
  const [selected,setSelected] = useState(false)
  const [proposals,setProposals] = useState<[Proposal,Proposal]>(defaultProposals)
  const [refreshNote,setRefreshNote] = useState('No live refresh requested. Comparison uses the September 26, 2026 verified-date research snapshot.')
  const [loading,setLoading] = useState(false)
  const [exported,setExported] = useState(false)
  const results = proposals.map(evaluate)
  const changed = results[0].filter((f,i)=>JSON.stringify(f)!==JSON.stringify(results[1][i])).length
  const update = (index:number,p:Proposal) => {setProposals(old=>index===0 ? [p,old[1]] : [old[0],p]);setExported(false)}
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBrief(proposals,refreshNote)],{type:'text/markdown;charset=utf-8'}))
    const a = document.createElement('a');a.href=url;a.download='lanark-comparison-brief.md';a.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000);setExported(true)
  }
  return <><header className="topbar"><a className="brand" href="#"><span className="brand-mark">⌂</span> Housing Navigator</a><span className="prototype">LOCAL PROTOTYPE · PITTSBURGH</span></header><main>
    <section className="intro"><p className="eyebrow">EARLY PROJECT DILIGENCE</p><h1>One property.<br/>Two paths to examine.</h1><p className="lead">Compare housing proposals, understand what changes, and take the unresolved questions to the right people.</p></section>
    <nav className="steps" aria-label="Review steps"><a href="#property">01 <span>Confirm property</span></a><a href="#proposals">02 <span>Compare proposals</span></a><a href="#brief">03 <span>Take a brief</span></a></nav>
    <section id="property" className="section"><div className="section-heading"><div><p className="eyebrow">01 / THE PROPERTY</p><h2>Start with a real case</h2></div><span className="tag">Dated demo evidence</span></div>
      <div className="property-card"><ParcelMap/><div className="property-info"><label>Demonstration property<select aria-label="Demonstration property" defaultValue={parcel.id}><option value={parcel.id}>1623 Lanark St · Fineview</option></select></label><h3>{parcel.address}</h3><p>{parcel.jurisdiction} · Fineview</p><div className="facts"><div><small>PARCEL ID</small><code>{parcel.id}</code></div><div><small>BASE ZONING</small><strong>{parcel.district}</strong></div><div><small>ASSESSMENT LOT AREA</small><strong>{parcel.lotArea.toLocaleString()} sq ft</strong></div></div><p className="hint">One supported case. Other properties and jurisdictions are not evaluated. Evidence retrieved September 26, 2026; assessment as of September 1, 2026.</p><button onClick={()=>setSelected(true)} disabled={selected}>{selected ? '✓ Lanark selected' : 'Use this demonstration property'}</button></div></div>
      <aside className="conflict"><span className="warning-icon">!</span><div><strong>Two records tell different stories. Keep both.</strong><p>Assessment: VACANT LAND. Six completed PLI records include work to an existing single-family dwelling. Neither establishes current condition or lawful use. Changing a proposal does not resolve this conflict.</p></div></aside>
      <details className="refresh"><summary>Check the latest assessment record</summary><p>The comparison remains a dated snapshot. A live observation is shown separately, with its source and retrieval time.</p><button className="secondary" disabled={loading} onClick={async()=>{setLoading(true);const r=await refreshAssessment(parcel.id);setRefreshNote(r.note);setLoading(false)}}>{loading ? 'Checking source...' : 'Refresh assessment only'}</button><p className="refresh-note" role="status">{refreshNote}</p></details>
    </section>
    {!selected ? <div className="empty-state">Select the Lanark case above to begin your proposal comparison.</div> : <>
      <section id="proposals" className="section"><div className="section-heading"><div><p className="eyebrow">02 / THE PROPOSALS</p><h2>What if the scope changes?</h2></div><button className="text-button" onClick={()=>{setProposals(defaultProposals);setExported(false)}}>Reset examples</button></div><p>Start with repair versus expansion on the same parcel. These examples are hypothetical, not approved alternatives.</p><div className="proposal-grid">{proposals.map((p,i)=><ProposalEditor key={i} value={p} index={i} onChange={value=>update(i,value)}/>)}</div>
      <div className="scorecard"><div><p className="eyebrow">DEVELOPMENT EASE</p><h3>Overall: not rated</h3><p>No numeric weights or approval probability.</p></div><dl><div><dt>Legal permission</dt><dd>Review required</dd></div><div><dt>Site constraints</dt><dd>Review required</dd></div><div><dt>Process complexity</dt><dd>Unknown</dd></div><div><dt>Financial feasibility</dt><dd>Unassessed</dd></div></dl></div>
      <div className="results-heading"><h3>Your comparison</h3><p aria-live="polite">{changed} changed checks · {results[0].length-changed} unchanged checks</p></div><p className="hint">Evidence completeness is partial. A less intensive scope does not clear missing evidence.</p>
      <div className="comparison-labels"><span>CHECK</span><span>A · {proposals[0].name}</span><span>B · {proposals[1].name}</span></div>
      {results[0].map((f,i)=>{const other=results[1][i];const different=JSON.stringify(f)!==JSON.stringify(other);return <article key={f.id} className={`comparison-row ${different?'changed':''}`}><div className="check-title"><span className={`change-label ${different?'gold':''}`}>{different?'CHANGED':'UNCHANGED'}</span><h4>{f.title}</h4></div><div><span className="mobile-label">A · {proposals[0].name}</span><FindingDetail finding={f}/></div><div><span className="mobile-label">B · {proposals[1].name}</span><FindingDetail finding={other}/></div></article>})}
      </section>
      <section id="brief" className="brief section"><div><p className="eyebrow">03 / THE NEXT CONVERSATION</p><h2>Take the questions with you.</h2><p>Download both proposals, their assumptions, findings, unresolved checks and dated sources in one readable brief.</p></div><div className="brief-actions"><button onClick={download}>Download Markdown brief ↓</button><button className="secondary" onClick={()=>window.print()}>Print / save as PDF</button><span role="status">{exported?'Brief downloaded.':''}</span></div></section>
    </>}
    <section className="section sources"><p className="eyebrow">THE EVIDENCE TRAIL</p><h2>Sources and boundaries</h2><p>Research snapshot, September 26, 2026. Source dates are not a guarantee of current legal requirements. Full code dependencies and professional review remain outstanding.</p>{sources.map(s=><details key={s.id} id={`source-${s.id}`}><summary><span>{s.id}</span> {s.title}</summary><p><a href={s.url} target="_blank" rel="noreferrer">Open source ↗</a></p><p>As of: {s.asOf} · Retrieved: {s.retrievedAt}</p><p>{s.terms}</p></details>)}</section>
    <footer><strong>Built for a next step, not an approval decision.</strong><p>AI unavailable: this flow uses structured inputs and deterministic checks. Practitioner validation and organizer acceptance of a component-only score are still outstanding. No acquisition recommendation. No financial feasibility conclusion.</p></footer>
  </main></>
}
