import type { SourceObservation } from './screening-client'

function observationLabel(id: string) {
  const label = id.replaceAll('-', ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function SourceObservations({ observations }: { observations?: SourceObservation[] }) {
  if (!observations?.length) return null
  return <details className="gp-details">
    <summary>Supplementary source observations <span>{observations.length}</span></summary>
    <p>These records and mapped observations do not complete rubric checks or establish permission for your proposal.</p>
    {observations.map(observation => <article className="gp-check-detail" key={observation.id}>
      <strong>{observationLabel(observation.id)}</strong>
      <p>{observation.status.replaceAll('_', ' ')}: {observation.summary}</p>
      <p>Coverage: {observation.coverage === 'exact_parcel_record_search' ? 'Exact parcel record search' : 'Mapped intersection only'}.{observation.count !== null && ` Returned matches: ${observation.count}.`}</p>
      <p>Source date: {observation.sourceDate || 'Unknown'}. Retrieved: <time dateTime={observation.retrievedAt}>{observation.retrievedAt}</time>. {/^https:\/\//i.test(observation.sourceUrl) && <a href={observation.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a>}</p>
    </article>)}
  </details>
}
