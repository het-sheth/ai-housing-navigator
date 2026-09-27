import { ACTIVITIES, type ActivityId, type GroundDisturbance, type HousingForm } from '../projects/contracts'
import { hasCompleteScreen, type ScreeningResult } from '../projects/screening-client'

export type ProposalInput = {
  description: string
  activities: ActivityId[]
  proposedHomes: number | null
  housingForm: HousingForm
  groundDisturbance: GroundDisturbance
}

export type ProposalSlot = { input: ProposalInput; result: ScreeningResult | null }
export type Comparison = {
  version: 1
  parcelId: string
  confirmedAt: string
  proposals: { A: ProposalSlot; B: ProposalSlot }
}

export type CheckDifference = {
  id: string
  label: string
  kind: 'finding_changed' | 'coverage_changed' | 'shared' | 'source_changed'
  a: ScreeningResult['checks'][number] | null
  b: ScreeningResult['checks'][number] | null
}

export const validParcelId = (value: string) => value.length > 0 && value.length <= 64 && /^[A-Za-z0-9 -]+$/.test(value)

export function emptyProposal(): ProposalInput {
  return { description: '', activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }
}

export function createComparison(parcelId: string): Comparison {
  if (!validParcelId(parcelId)) throw new Error('Enter an exact parcel ID using letters, numbers, spaces or hyphens.')
  return { version: 1, parcelId, confirmedAt: new Date().toISOString(), proposals: { A: { input: emptyProposal(), result: null }, B: { input: emptyProposal(), result: null } } }
}

export function updateProposal(comparison: Comparison, side: 'A' | 'B', input: ProposalInput): Comparison {
  return { ...comparison, proposals: { ...comparison.proposals, [side]: { input, result: null } } }
}

export function resultMatchesInput(result: ScreeningResult, parcelId: string, input: ProposalInput) {
  return result.parcelId === parcelId && result.proposal.proposedHomes === input.proposedHomes && result.proposal.housingForm === input.housingForm && result.proposal.groundDisturbance === input.groundDisturbance && result.proposal.activities.length === input.activities.length && result.proposal.activities.every((id, index) => id === input.activities[index])
}

export function visibleScore(result: ScreeningResult | null): number | null {
  return result && hasCompleteScreen(result) ? result.score!.lower : null
}

export function compareChecks(a: ScreeningResult | null, b: ScreeningResult | null): CheckDifference[] {
  if (!a && !b) return []
  const left = new Map(a?.checks.map(check => [check.id, check]) ?? [])
  const right = new Map(b?.checks.map(check => [check.id, check]) ?? [])
  return [...new Set([...left.keys(), ...right.keys()])].map(id => {
    const aCheck = left.get(id)
    const bCheck = right.get(id)
    return {
      id, label: aCheck?.label ?? bCheck!.label,
      kind: !aCheck || !bCheck ? 'coverage_changed' as const
        : aCheck.status === bCheck.status && aCheck.reason === bCheck.reason && JSON.stringify(aCheck.metricScore ?? null) === JSON.stringify(bCheck.metricScore ?? null)
          ? aCheck.sourceUrl !== bCheck.sourceUrl || aCheck.sourceDate !== bCheck.sourceDate ? 'source_changed' as const : 'shared' as const
          : [aCheck.status, bCheck.status].some(status => ['unknown', 'unsupported', 'error'].includes(status)) || aCheck.id === 'zoning-use' && JSON.stringify(a?.proposal) !== JSON.stringify(b?.proposal) || aCheck.id === 'slope' && a?.proposal.groundDisturbance !== b?.proposal.groundDisturbance
            ? 'coverage_changed' as const : 'finding_changed' as const,
      a: aCheck ?? null, b: bCheck ?? null,
    }
  })
}

export function compareActions(a: ScreeningResult | null, b: ScreeningResult | null): { text: string; sides: ('A' | 'B')[] }[] {
  const actions = new Map<string, { text: string; sides: ('A' | 'B')[] }>()
  for (const [side, result] of [['A', a], ['B', b]] as const) {
    for (const text of result?.nextActions ?? []) {
      const key = text.trim()
      if (!key) continue
      const existing = actions.get(key)
      if (existing) { if (!existing.sides.includes(side)) existing.sides.push(side) }
      else actions.set(key, { text: key, sides: [side] })
    }
  }
  return [...actions.values()]
}

export function compareObservations(a: ScreeningResult | null, b: ScreeningResult | null) {
  const left = new Map(a?.sourceObservations?.map(item => [item.id, item]) ?? [])
  const right = new Map(b?.sourceObservations?.map(item => [item.id, item]) ?? [])
  return [...new Set([...left.keys(), ...right.keys()])].map(id => {
    const first = left.get(id) ?? null
    const second = right.get(id) ?? null
    const evidence = (item: typeof first) => item && [item.status, item.coverage, item.count, item.summary, item.sourceUrl, item.sourceDate]
    return { id, a: first, b: second, changed: JSON.stringify(evidence(first)) !== JSON.stringify(evidence(second)) }
  })
}

export function compareInputs(a: ProposalInput, b: ProposalInput): { label: string; a: string; b: string }[] {
  const activityText = (input: ProposalInput) => ACTIVITIES.filter(item => input.activities.includes(item.id)).map(item => item.label).join(', ') || 'Unanswered'
  const fields = [
    { label: 'Description', a: a.description || 'Unanswered', b: b.description || 'Unanswered' },
    { label: 'Work activities', a: activityText(a), b: activityText(b) },
    { label: 'Proposed homes', a: a.proposedHomes === null ? 'Unknown' : String(a.proposedHomes), b: b.proposedHomes === null ? 'Unknown' : String(b.proposedHomes) },
    { label: 'Building type', a: a.housingForm === 'attached' ? 'Shares a wall (rowhouse)' : a.housingForm === 'detached' ? 'Detached' : 'Unknown', b: b.housingForm === 'attached' ? 'Shares a wall (rowhouse)' : b.housingForm === 'detached' ? 'Detached' : 'Unknown' },
    { label: 'Ground disturbance', a: a.groundDisturbance, b: b.groundDisturbance },
  ]
  return fields.filter(field => field.a !== field.b)
}

export function validProposal(value: unknown): value is ProposalInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  return typeof input.description === 'string' && input.description.length <= 4000 && Array.isArray(input.activities) && input.activities.every(id => ACTIVITIES.some(item => item.id === id)) && new Set(input.activities).size === input.activities.length && (input.proposedHomes === null || typeof input.proposedHomes === 'number' && Number.isSafeInteger(input.proposedHomes) && input.proposedHomes >= 0) && ['detached', 'attached', 'unknown'].includes(String(input.housingForm)) && ['yes', 'no', 'unknown'].includes(String(input.groundDisturbance))
}
