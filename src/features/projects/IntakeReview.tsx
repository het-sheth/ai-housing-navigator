import { Button } from '../../design-system/components'
import { ACTIVITIES, type ActivityId } from './contracts'
import type { IntakeResponse } from './ai-client'

type Props = {
  result: IntakeResponse
  selected: ActivityId[]
  onToggle: (id: ActivityId) => void
  onApply: () => void
  onDiscard: () => void
}

export function IntakeReview({ result, selected, onToggle, onApply, onDiscard }: Props) {
  return <section className="gp-ai-review" aria-label="Review AI suggestions" data-testid="ai-suggestion-review">
    <h2>Review suggestions</h2>
    <p>AI suggests how to describe your work; it has not checked permissions. Only selected suggestions are added when you apply them.</p>
    {result.suggestions.length === 0 && <p>No supported work activity was found in your words. Keep editing manually or try a clearer description.</p>}
    {result.suggestions.map(item => {
      const label = ACTIVITIES.find(activity => activity.id === item.activityId)?.label ?? item.activityId
      return <div className="gp-ai-suggestion" key={item.activityId}>
        {item.intent === 'negated' ? <p><strong>Excluded: {label}</strong>. Your wording: “{item.quote}”</p> : <label><input type="checkbox" checked={selected.includes(item.activityId)} onChange={() => onToggle(item.activityId)} /><span><strong>{item.intent === 'tentative' ? `Maybe: ${label}` : label}</strong><span>Your wording: “{item.quote}”</span><span>{item.reason}</span></span></label>}
      </div>
    })}
    {result.question && <p className="gp-ai-question"><strong>A question to consider:</strong> {result.question}</p>}
    <div className="gp-ai-actions"><Button onClick={onApply} disabled={selected.length === 0}>Apply selected work</Button><Button variant="quiet" onClick={onDiscard}>Discard suggestions</Button></div>
  </section>
}
