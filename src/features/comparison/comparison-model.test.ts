import { describe, expect, it } from 'vitest'
import type { ScreeningCheck, ScreeningResult } from '../projects/screening-client'
import { compareChecks, compareInputs, createComparison, resultMatchesInput, updateProposal, visibleScore } from './comparison-model'

const parcelId = '0046R00029000000'
const check = (id: string, reason: string): ScreeningCheck => ({ id, label: id, status: 'unknown', reason, sourceUrl: 'https://example.org/source', sourceDate: null, retrievedAt: '2026-09-27T10:00:00Z' })
const result = (checks = [check('flood', 'Needs review')]): ScreeningResult => ({
  status: 'pending', score: null, rubricVersion: 'test', parcelId,
  proposal: { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'unknown' },
  municipality: 'Pittsburgh', checks, nextActions: ['Ask the County'], retrievedAt: '2026-09-27T10:00:00Z', caveat: 'Incomplete',
})

describe('proposal comparison model', () => {
  it('preserves a string parcel ID and invalidates only the edited side', () => {
    const original = createComparison(parcelId)
    const input = { ...original.proposals.A.input, activities: ['new_construction'] as const, proposedHomes: 1, housingForm: 'detached' as const }
    const withResults = { ...original, proposals: { A: { input: { ...input, activities: [...input.activities] }, result: result() }, B: { input: original.proposals.B.input, result: result() } } }
    const changed = updateProposal(withResults, 'A', { ...withResults.proposals.A.input, description: 'Second idea' })
    expect(changed.parcelId).toBe(parcelId)
    expect(changed.proposals.A.result).toBeNull()
    expect(changed.proposals.B.result).toEqual(result())
  })

  it('compares exact inputs and shows changed, unchanged and absent source checks', () => {
    const proposal = { ...createComparison(parcelId).proposals.A.input, activities: ['new_construction'] as const, proposedHomes: 1, housingForm: 'detached' as const }
    expect(resultMatchesInput(result(), parcelId, { ...proposal, activities: [...proposal.activities] })).toBe(true)
    expect(resultMatchesInput(result(), parcelId, { ...proposal, activities: [...proposal.activities], proposedHomes: 2 })).toBe(false)
    const differences = compareChecks(result([check('flood', 'Needs review'), check('slope', 'Same')]), result([check('flood', 'Mapped flag'), check('slope', 'Same')]))
    expect(differences.map(item => item.kind)).toEqual(['changed', 'unchanged'])
    expect(compareChecks(result([check('flood', 'Needs review')]), result([]))).toEqual([expect.objectContaining({ id: 'flood', kind: 'missing' })])
  })

  it('withholds all score numbers for incomplete coverage', () => {
    expect(visibleScore({ ...result(), status: 'scored', score: { lower: 42, upper: 42 } })).toBeNull()
  })

  it('separates source changes from unchanged findings and user intent', () => {
    const sourceDateChanged = compareChecks(result([check('flood', 'Same')]), result([{ ...check('flood', 'Same'), sourceDate: '2026-09-27' }]))
    expect(sourceDateChanged[0].kind).toBe('source_changed')
    const a = { ...createComparison(parcelId).proposals.A.input, proposedHomes: 1 }
    const b = { ...a, proposedHomes: 2 }
    expect(compareInputs(a, b)).toEqual([{ label: 'Proposed homes', a: '1', b: '2' }])
  })
})
