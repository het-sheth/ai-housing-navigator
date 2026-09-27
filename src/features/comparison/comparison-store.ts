import { isScreeningCheck, type ScreeningResult } from '../projects/screening-client'
import { isOneHomeAssessment } from '../projects/one-home-assessment'
import { resultMatchesInput, validParcelId, validProposal, type Comparison, type ProposalInput } from './comparison-model'

const keyFor = (parcelId: string) => `housing-navigator-comparison-v1:${encodeURIComponent(parcelId)}`
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function validSavedResult(value: unknown, parcelId: string, input: ProposalInput): value is ScreeningResult {
  if (!record(value) || !record(value.proposal) || !Array.isArray(value.checks) || !Array.isArray(value.nextActions)) return false
  const result = value as ScreeningResult
  return ['pending', 'scored'].includes(result.status) && typeof result.rubricVersion === 'string' && typeof result.retrievedAt === 'string' && Number.isFinite(Date.parse(result.retrievedAt)) && typeof result.caveat === 'string' && ['Pittsburgh', 'other', 'unresolved'].includes(result.municipality) && result.nextActions.every(action => typeof action === 'string') && result.checks.every(isScreeningCheck) && isOneHomeAssessment(result.oneHomeAssessment, { municipality: result.municipality, proposal: result.proposal }) && (result.status === 'pending' ? result.score === null : record(result.score) && typeof result.score.lower === 'number' && typeof result.score.upper === 'number' && Number.isFinite(result.score.lower) && Number.isFinite(result.score.upper) && result.score.lower >= 0 && result.score.upper <= 100 && result.score.lower <= result.score.upper) && resultMatchesInput(result, parcelId, input)
}

export function loadComparison(parcelId: string): Comparison | null {
  if (!validParcelId(parcelId)) return null
  const raw = localStorage.getItem(keyFor(parcelId))
  if (!raw) return null
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('The saved comparison could not be read. It was left untouched.') }
  if (!record(value) || value.version !== 1 || value.parcelId !== parcelId || typeof value.confirmedAt !== 'string' || !Number.isFinite(Date.parse(value.confirmedAt)) || !record(value.proposals)) throw new Error('The saved comparison is invalid. It was left untouched.')
  for (const side of ['A', 'B'] as const) {
    const slot = value.proposals[side]
    if (!record(slot) || !validProposal(slot.input) || slot.result !== null && !validSavedResult(slot.result, parcelId, slot.input)) throw new Error('The saved comparison is invalid. It was left untouched.')
  }
  return value as Comparison
}

export function saveComparison(comparison: Comparison): void {
  localStorage.setItem(keyFor(comparison.parcelId), JSON.stringify(comparison))
}
