export type RecordedUse = 'vacant_land' | 'single_family' | 'any'
export type SearchCriteria = { recordedUse: RecordedUse; zip: string }
export type ExplorerCandidate = {
  parcelId: string
  address: string
  city: string | null
  municipality: string
  zip: string | null
  recordedUse: string | null
  sourceDate: string | null
  matched: string
}
export type CandidateSearch = {
  status: 'candidates' | 'no_match'
  candidates: ExplorerCandidate[]
  truncated: boolean
  retrievedAt: string
  sourceUrl: string
  sourceDate: string | null
  coverage: string
  unknowns: string[]
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validCandidate(value: unknown): value is ExplorerCandidate {
  return object(value) && typeof value.parcelId === 'string' && /^[A-Za-z0-9 -]{1,64}$/.test(value.parcelId) &&
    typeof value.address === 'string' && (value.city === null || typeof value.city === 'string') &&
    typeof value.municipality === 'string' && (value.zip === null || typeof value.zip === 'string') &&
    (value.recordedUse === null || typeof value.recordedUse === 'string') &&
    (value.sourceDate === null || typeof value.sourceDate === 'string') && typeof value.matched === 'string'
}

function validSearch(value: unknown): value is CandidateSearch {
  return object(value) && ['candidates', 'no_match'].includes(String(value.status)) &&
    Array.isArray(value.candidates) && value.candidates.length <= 20 && value.candidates.every(validCandidate) &&
    typeof value.truncated === 'boolean' && typeof value.retrievedAt === 'string' &&
    typeof value.sourceUrl === 'string' && (value.sourceDate === null || typeof value.sourceDate === 'string') &&
    typeof value.coverage === 'string' && Array.isArray(value.unknowns) && value.unknowns.every(item => typeof item === 'string')
}

export async function searchCandidates(criteria: SearchCriteria, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<CandidateSearch> {
  const params = new URLSearchParams({ use: criteria.recordedUse })
  if (criteria.zip) params.set('zip', criteria.zip)
  const response = await fetcher(`/api/property/candidates?${params.toString()}`, { signal })
  if (!response.ok) throw new Error('candidate_search_unavailable')
  const result: unknown = await response.json()
  if (!validSearch(result)) throw new Error('invalid_candidate_response')
  return result
}
