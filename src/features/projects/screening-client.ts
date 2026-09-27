import type { ActivityId, Draft } from './contracts'

export type ScreeningCheck = {
  id: string
  label: string
  status: 'screened_low_friction' | 'mapped_flag' | 'unknown' | 'unsupported' | 'error'
  reason: string
  sourceUrl: string | null
  sourceDate: string | null
  retrievedAt: string | null
}

export type SourceObservation = {
  id: string
  status: 'available' | 'empty' | 'incomplete' | 'mapped_flag' | 'mapped_no_flag' | 'no_intersection' | 'unknown' | 'error'
  coverage: 'exact_parcel_record_search' | 'mapped_intersection_only'
  sourceUrl: string
  sourceDate: string | null
  retrievedAt: string
  count: number | null
  summary: string
}

export type ScreeningResult = {
  status: 'pending' | 'scored'
  score: { lower: number; upper: number } | null
  rubricVersion: string
  parcelId: string
  proposal: { activities: ActivityId[]; proposedHomes: number | null; housingForm: Draft['housingForm']; groundDisturbance: Draft['groundDisturbance'] }
  municipality: 'Pittsburgh' | 'other' | 'unresolved'
  checks: ScreeningCheck[]
  sourceObservations?: SourceObservation[]
  nextActions: string[]
  retrievedAt: string
  caveat: string
}

export const REQUIRED_SCREENING_CHECKS = ['zoning-use', 'zoning-other', 'flood', 'slope', 'undermining', 'process', 'infrastructure'] as const

const checkStatuses = ['screened_low_friction', 'mapped_flag', 'unknown', 'unsupported', 'error']
const sourceObservationIds = new Set(['pli-permits', 'mapped-undermining', 'mapped-landslide', 'riparian-stormwater', 'riparian-river', 'historic-district', 'historic-property', 'inclusionary-housing', 'baum-centre-overlay', 'north-side-parking', 'parking-reduction', 'major-transit-buffer', 'height-reduction', 'riverfront-height'])
const sourceObservationKeys = ['id', 'status', 'coverage', 'sourceUrl', 'sourceDate', 'retrievedAt', 'count', 'summary']
const nullableText = (value: unknown): value is string | null => value === null || typeof value === 'string'
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

function isCheck(value: unknown): value is ScreeningCheck {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string' && checkStatuses.includes(String(value.status)) && typeof value.reason === 'string' && nullableText(value.sourceUrl) && nullableText(value.sourceDate) && nullableText(value.retrievedAt)
}

function isSourceObservation(value: unknown): value is SourceObservation {
  if (!isRecord(value) || Object.keys(value).length !== sourceObservationKeys.length || !sourceObservationKeys.every(key => key in value) || typeof value.id !== 'string' || !sourceObservationIds.has(value.id) || !['available', 'empty', 'incomplete', 'mapped_flag', 'mapped_no_flag', 'no_intersection', 'unknown', 'error'].includes(String(value.status)) || !['exact_parcel_record_search', 'mapped_intersection_only'].includes(String(value.coverage)) || typeof value.sourceUrl !== 'string' || !value.sourceUrl.startsWith('https://') || !nullableText(value.sourceDate) || typeof value.retrievedAt !== 'string' || !Number.isFinite(Date.parse(value.retrievedAt)) || typeof value.summary !== 'string') return false
  if (['empty', 'no_intersection'].includes(String(value.status))) return value.count === 0
  if (['error', 'incomplete'].includes(String(value.status))) return value.count === null
  return Number.isSafeInteger(value.count) && Number(value.count) > 0
}

export function hasCompleteScreen(result: ScreeningResult): boolean {
  const checks = new Map(result.checks.map(check => [check.id, check]))
  return result.status === 'scored' && result.score !== null && result.score.lower === result.score.upper && result.checks.length === REQUIRED_SCREENING_CHECKS.length && checks.size === REQUIRED_SCREENING_CHECKS.length && REQUIRED_SCREENING_CHECKS.every(id => ['screened_low_friction', 'mapped_flag'].includes(checks.get(id)?.status ?? ''))
}

export async function requestScreening(draft: Draft, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<ScreeningResult> {
  if (!draft.parcelId || !draft.propertyConfirmed || draft.propertyEvidence !== 'live') throw new Error('A confirmed live parcel is required before screening.')
  const response = await fetcher('/api/screening/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parcelId: draft.parcelId, proposal: { activities: draft.activities, proposedHomes: draft.proposedHomes, housingForm: draft.housingForm, groundDisturbance: draft.groundDisturbance } }),
    signal,
  })
  if (!response.ok) throw new Error('screening_unavailable')
  const result: unknown = await response.json()
  if (!isRecord(result) || result.parcelId !== draft.parcelId || !isRecord(result.proposal) || !Array.isArray(result.proposal.activities) || result.proposal.activities.length !== draft.activities.length || result.proposal.activities.some((id: unknown, index: number) => id !== draft.activities[index]) || result.proposal.proposedHomes !== draft.proposedHomes || result.proposal.housingForm !== draft.housingForm || result.proposal.groundDisturbance !== draft.groundDisturbance || !['pending', 'scored'].includes(String(result.status)) || !['Pittsburgh', 'other', 'unresolved'].includes(String(result.municipality)) || typeof result.rubricVersion !== 'string' || typeof result.retrievedAt !== 'string' || !Number.isFinite(Date.parse(result.retrievedAt)) || typeof result.caveat !== 'string' || !Array.isArray(result.checks) || !result.checks.every(isCheck) || (result.sourceObservations !== undefined && (!Array.isArray(result.sourceObservations) || result.sourceObservations.length > sourceObservationIds.size || !result.sourceObservations.every(isSourceObservation) || new Set(result.sourceObservations.map((item: SourceObservation) => item.id)).size !== result.sourceObservations.length)) || !Array.isArray(result.nextActions) || !result.nextActions.every((action: unknown) => typeof action === 'string') || (result.status === 'pending' && (result.score !== null || result.checks.some((check: unknown) => isRecord(check) && ('points' in check || 'maxPoints' in check)))) || (result.status === 'scored' && (!isRecord(result.score) || typeof result.score.lower !== 'number' || typeof result.score.upper !== 'number' || !Number.isFinite(result.score.lower) || !Number.isFinite(result.score.upper) || result.score.lower < 0 || result.score.upper > 100 || result.score.lower > result.score.upper))) throw new Error('screening_invalid_response')
  return result as ScreeningResult
}
