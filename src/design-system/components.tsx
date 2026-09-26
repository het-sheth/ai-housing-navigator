import { useId, type ButtonHTMLAttributes } from 'react'
import './components.css'

export function Button({variant='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'quiet'}) {
  return <button className={`ds-button ds-button-${variant} ${className}`} {...props}/>
}

export type EvidenceState = 'live'|'snapshot'|'assumption'|'unknown'|'conflict'|'unavailable'
const evidenceLabels:Record<EvidenceState,string> = {
  live:'Live observation',snapshot:'Dated snapshot',assumption:'Your assumption',unknown:'Not checked',conflict:'Sources conflict',unavailable:'Source unavailable',
}
export function EvidenceBadge({state}:{state:EvidenceState}) {
  return <span className={`ds-evidence ds-evidence-${state}`}><span aria-hidden="true"/>{evidenceLabels[state]}</span>
}

export function ChoiceGroup({legend,hint,options,value,onChange}:{legend:string;hint?:string;options:{value:string;label:string;description?:string}[];value:string;onChange:(value:string)=>void}) {
  const id=useId()
  return <fieldset className="ds-choice-group" aria-describedby={hint?`${id}-hint`:undefined}><legend>{legend}</legend>{hint&&<p id={`${id}-hint`} className="ds-hint">{hint}</p>}<div className="ds-choice-list">{options.map(option=><label key={option.value} className={`ds-choice ${value===option.value?'is-selected':''}`}><input type="radio" name={id} value={option.value} checked={value===option.value} onChange={()=>onChange(option.value)}/><span><strong>{option.label}</strong>{option.description&&<small>{option.description}</small>}</span></label>)}</div></fieldset>
}

export function StepIndicator({labels,current}:{labels:string[];current:number}) {
  return <ol className="ds-steps" aria-label="Progress">{labels.map((label,i)=><li key={label} aria-current={i===current?'step':undefined} className={i<current?'completed':''}><span aria-hidden="true">{i<current?'✓':i+1}</span><div>{label}<small>{i===current?'Current step':i<current?'Completed':'Upcoming'}</small></div></li>)}</ol>
}
