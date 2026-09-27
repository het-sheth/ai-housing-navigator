import type { PropertyCandidate, PropertyDetail, PropertySearch } from './property-client'

type Props = {
  query: string
  parcelId: string | null
  historical: boolean
  confirmedLive: boolean
  searchResult: PropertySearch | null
  candidate: PropertyCandidate | null
  detail: PropertyDetail | null
  status: 'idle' | 'searching' | 'loading' | 'error'
  error: string
  onQuery: (value: string) => void
  onSearch: () => void
  onCandidate: (value: PropertyCandidate) => void
  onConfirm: () => void
  onRefresh: () => void
  onChangeParcel: () => void
}

function date(value: string | null) {
  if (!value) return 'Unknown'
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  if (!Number.isFinite(parsed.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)
}

function Sources({ detail }: { detail: PropertyDetail }) {
  return <details className="gp-details gp-source-details" data-testid="property-source-results">
    <summary>Sources and record dates <span>Assessment and boundary</span></summary>
    <dl>
      <dt>Parcel ID</dt><dd>{detail.parcelId}</dd>
      <dt>Assessment</dt><dd>{detail.assessment.status === 'available' ? 'Record found' : detail.assessment.status === 'error' ? 'Source error' : 'No record returned'}</dd>
      <dt>Assessment file date</dt><dd><time dateTime={detail.assessment.sourceDate || undefined}>{date(detail.assessment.sourceDate)}</time></dd>
      <dt>Assessment retrieved</dt><dd><time dateTime={detail.assessment.retrievedAt}>{date(detail.assessment.retrievedAt)}</time></dd>
      <dt>Parcel boundary</dt><dd>{detail.boundary.status === 'available' ? 'Boundary found' : detail.boundary.status === 'error' ? 'Source error' : 'No boundary returned'}</dd>
      <dt>Boundary source date</dt><dd>Unknown</dd>
      <dt>Boundary retrieved</dt><dd><time dateTime={detail.boundary.retrievedAt}>{date(detail.boundary.retrievedAt)}</time></dd>
    </dl>
    <p><a href={detail.assessment.sourceUrl} target="_blank" rel="noreferrer">County assessment record ↗</a> · <a href={detail.boundary.sourceUrl} target="_blank" rel="noreferrer">County parcel map ↗</a></p>
    <p>Assessment classifications describe the recorded file, not current condition or lawful use. The mapped parcel boundary is not a survey.</p>
  </details>
}

export function PropertyStep(props: Props) {
  const { query, parcelId, historical, confirmedLive, searchResult, candidate, detail, status, error, onQuery, onSearch, onCandidate, onConfirm, onRefresh, onChangeParcel } = props
  const record = detail?.assessment.record
  const hasSelection = historical || confirmedLive
  return <>
    <label className="gp-label" htmlFor="gp-property">Street address or parcel ID</label>
    <div className="gp-property-search"><input id="gp-property" className="gp-input gp-address" value={query} readOnly={hasSelection} maxLength={300} placeholder="2003 Mountford Ave or parcel ID" onChange={event => onQuery(event.target.value)} />{hasSelection ? <button className="gp-secondary" type="button" data-testid="change-parcel-button" onClick={onChangeParcel}>Change parcel</button> : <button className="gp-secondary" type="button" data-testid="property-search-button" disabled={!query.trim() || status === 'searching'} onClick={onSearch}>{status === 'searching' ? 'Searching…' : 'Search'}</button>}</div>
    {error && <p className="gp-error-message" role="alert">{error}</p>}
    {searchResult && <div className="gp-candidates" data-testid="property-search-status"><strong>{searchResult.status === 'no_match' ? 'No exact match found' : searchResult.status === 'candidates' ? 'Choose your parcel' : 'Search unavailable'}</strong>{searchResult.truncated && <p>More than 20 matches. Refine the address or use a parcel ID.</p>}{searchResult.status === 'no_match' && <p>Check the address spelling or search by parcel ID.</p>}{searchResult.candidates.map(item => <label className="gp-check" key={item.parcelId}><input type="radio" name="parcel-candidate" data-testid={`property-candidate-${item.parcelId}`} disabled={status === 'loading'} checked={candidate?.parcelId === item.parcelId} onChange={() => onCandidate(item)} /><span>{item.address || 'Address unavailable'}, {item.city || 'city unknown'} · {item.zip || 'ZIP unknown'}<small>Parcel {item.parcelId} · {item.municipality || 'municipality unknown'}</small></span></label>)}{candidate && <button className="gp-secondary" type="button" data-testid="property-confirm-button" disabled={status === 'loading'} onClick={onConfirm}>{status === 'loading' ? 'Checking sources…' : `Confirm parcel ${candidate.parcelId}`}</button>}</div>}
    {hasSelection && <section className="gp-property-summary" data-testid="property-summary"><span className="gp-kicker">{historical ? 'Historical example' : 'Selected parcel'}</span><h2>{record?.address || (historical ? '1623 Lanark Street' : query || `Parcel ${parcelId}`)}</h2><div className="gp-property-facts"><div><span>Recorded use</span><strong>{historical ? 'Vacant land (2026 snapshot)' : record?.useDescription || 'Unavailable'}</strong></div><div><span>Recorded lot area</span><strong>{historical ? '1,657 sq ft (2026 snapshot)' : record?.lotAreaSqFt == null ? 'Unavailable' : `${record.lotAreaSqFt.toLocaleString()} sq ft`}</strong></div></div>{confirmedLive && <><div className="gp-property-summary-actions"><button className="gp-text-button" type="button" disabled={status === 'loading'} onClick={onRefresh}>{status === 'loading' ? 'Refreshing…' : detail ? 'Refresh records' : 'Load current records'}</button>{!detail && <span>Saved identity. Records have not been loaded in this visit.</span>}</div>{detail && <Sources detail={detail} />}</>}{historical && <details className="gp-details gp-source-details"><summary>Historical source <span>Saved example</span></summary><p>This Lanark record and mapped outline were saved from September 2026 research. Search and confirm the parcel to fetch available records now.</p></details>}</section>}
    {!hasSelection && query && !searchResult && <p className="gp-helper">Search and confirm a parcel to see its boundary and recorded assessment. You can continue with the site unresolved.</p>}
  </>
}
