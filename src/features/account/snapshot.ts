import { validateDraft, type Draft } from '../projects/contracts'
import { hasCompleteScreen, type ScreeningResult } from '../projects/screening-client'
import { resultMatchesInput, validParcelId, validProposal, type Comparison, type ProposalInput } from '../comparison/comparison-model'
import { loadDraft, saveDraft, startNewDraft } from '../projects/draft-store'
import { loadComparison, saveComparison } from '../comparison/comparison-store'

export type SnapshotKind = 'walkthrough' | 'comparison'

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const nullableText = (value: unknown): value is string | null => value === null || typeof value === 'string'
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
const checkStatuses = new Set(['screened_low_friction', 'mapped_flag', 'unknown', 'unsupported', 'error'])
const observationStatuses = new Set(['available', 'empty', 'incomplete', 'mapped_flag', 'mapped_no_flag', 'no_intersection', 'unknown', 'error'])
const observationCoverage = new Set(['exact_parcel_record_search', 'mapped_intersection_only'])

function validResult(value: unknown, parcelId: string, input: ProposalInput): value is ScreeningResult {
  if (!record(value) || !record(value.proposal) || !Array.isArray(value.checks) || !Array.isArray(value.nextActions)) return false
  if (!['pending', 'scored'].includes(String(value.status)) || !timestamp(value.retrievedAt) || typeof value.rubricVersion !== 'string' || typeof value.caveat !== 'string' || !['Pittsburgh', 'other', 'unresolved'].includes(String(value.municipality))) return false
  if (!value.nextActions.every(action => typeof action === 'string')) return false
  if (!value.checks.every(check => record(check) && typeof check.id === 'string' && typeof check.label === 'string' && checkStatuses.has(String(check.status)) && typeof check.reason === 'string' && nullableText(check.sourceUrl) && nullableText(check.sourceDate) && nullableText(check.retrievedAt) && !('points' in check) && !('maxPoints' in check))) return false
  if (new Set(value.checks.map(check => check.id)).size !== value.checks.length) return false
  if (value.sourceObservations !== undefined && (!Array.isArray(value.sourceObservations) || !value.sourceObservations.every(item => record(item) && typeof item.id === 'string' && observationStatuses.has(String(item.status)) && observationCoverage.has(String(item.coverage)) && typeof item.sourceUrl === 'string' && item.sourceUrl.startsWith('https://') && nullableText(item.sourceDate) && timestamp(item.retrievedAt) && typeof item.summary === 'string' && (item.count === null || Number.isSafeInteger(item.count) && Number(item.count) >= 0)))) return false
  const result = value as ScreeningResult
  if (!resultMatchesInput(result, parcelId, input)) return false
  return result.status === 'pending' ? result.score === null : hasCompleteScreen(result)
}

function validateComparison(data: unknown): Comparison {
  if (!record(data) || data.version !== 1 || typeof data.parcelId !== 'string' || !validParcelId(data.parcelId) || !timestamp(data.confirmedAt) || !record(data.proposals) || Object.keys(data.proposals).length !== 2) throw new Error('The cloud comparison is invalid. Device work was left untouched.')
  for (const side of ['A', 'B'] as const) {
    const slot = data.proposals[side]
    if (!record(slot) || !validProposal(slot.input) || !Object.hasOwn(slot, 'result') || slot.result !== null && !validResult(slot.result, data.parcelId, slot.input)) throw new Error('The cloud comparison is invalid. Device work was left untouched.')
  }
  return structuredClone(data) as Comparison
}

export function validateCloudSnapshot(kind: 'walkthrough', data: unknown): Draft
export function validateCloudSnapshot(kind: 'comparison', data: unknown): Comparison
export function validateCloudSnapshot(kind: SnapshotKind, data: unknown): Draft | Comparison
export function validateCloudSnapshot(kind: SnapshotKind, data: unknown): Draft | Comparison {
  return kind === 'walkthrough' ? validateDraft(data) : validateComparison(data)
}

const backupPrefix = 'housing-navigator-comparison-backup-v1:'

export function localWalkthroughCopy(draft: Draft): Draft {
  return validateDraft({ ...draft, id: crypto.randomUUID() })
}

export async function restoreCloudSnapshot(kind: SnapshotKind, data: unknown): Promise<string> {
  if (kind === 'walkthrough') {
    const restored = localWalkthroughCopy(validateCloudSnapshot('walkthrough', data))
    const current = await loadDraft()
    if (current) await startNewDraft(localWalkthroughCopy(current), restored)
    else await saveDraft(restored)
    return '/projects/new'
  }
  const restored = validateCloudSnapshot('comparison', data)
  const current = loadComparison(restored.parcelId)
  if (current && JSON.stringify(current) !== JSON.stringify(restored)) {
    const key = `${backupPrefix}${encodeURIComponent(restored.parcelId)}:${crypto.randomUUID()}`
    localStorage.setItem(key, JSON.stringify(current))
  }
  saveComparison(restored)
  return `/compare?parcelId=${encodeURIComponent(restored.parcelId)}`
}

export function listDeviceComparisonBackups(): { key: string; parcelId: string; saved: Comparison }[] {
  const backups: { key: string; parcelId: string; saved: Comparison }[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(backupPrefix)) continue
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const saved = validateCloudSnapshot('comparison', JSON.parse(raw))
      backups.push({ key, parcelId: saved.parcelId, saved })
    } catch { continue }
  }
  return backups
}
