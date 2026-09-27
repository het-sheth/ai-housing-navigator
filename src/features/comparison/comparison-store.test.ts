import { afterEach, describe, expect, it, vi } from 'vitest'
import { createComparison } from './comparison-model'
import { loadComparison, saveComparison } from './comparison-store'
import sample from '../projects/one-home-assessment.fixture.json'

const entries = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => { entries.set(key, value) },
})
afterEach(() => entries.clear())

describe('comparison storage', () => {
  it('rejects a corrupt focused finding without changing saved bytes', () => {
    const saved = createComparison('0046R00029000000')
    saved.proposals.A.input = { ...saved.proposals.A.input, activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached' }
    const payload = { status: 'pending', score: null, rubricVersion: 'test', parcelId: saved.parcelId, proposal: saved.proposals.A.input, municipality: 'Pittsburgh', checks: [], nextActions: [], retrievedAt: '2026-09-27T12:00:00Z', caveat: '', ...sample }
    const data = { ...saved, proposals: { ...saved.proposals, A: { ...saved.proposals.A, result: { ...payload, oneHomeAssessment: { ...sample.oneHomeAssessment, processGuidance: { ...sample.oneHomeAssessment.processGuidance, sourceUrl: 'http://insecure.test' } } } } } }
    const key = 'housing-navigator-comparison-v1:0046R00029000000'
    const bytes = JSON.stringify(data)
    entries.set(key, bytes)
    expect(() => loadComparison(saved.parcelId)).toThrow(/invalid/i)
    expect(entries.get(key)).toBe(bytes)
  })
  it('keeps leading zeroes in distinct parcel keys and restores both sides', () => {
    const saved = createComparison('0046R00029000000')
    saved.proposals.A.input.description = 'One home'
    saved.proposals.B.input.description = 'Two homes'
    saveComparison(saved)
    expect(loadComparison('0046R00029000000')).toEqual(saved)
    expect(loadComparison('46R00029000000')).toBeNull()
  })

  it('leaves a corrupt record untouched and explains the error', () => {
    const key = 'housing-navigator-comparison-v1:0046R00029000000'
    entries.set(key, '{broken')
    expect(() => loadComparison('0046R00029000000')).toThrow(/left untouched/)
    expect(entries.get(key)).toBe('{broken')
  })

  it('rejects a restored pending result that exposes numeric contributions', () => {
    const saved = createComparison('0046R00029000000')
    const input = { ...saved.proposals.A.input, activities: ['new_construction'] as const }
    saved.proposals.A.input = { ...input, activities: [...input.activities] }
    const parsed = JSON.parse(JSON.stringify(saved))
    parsed.proposals.A.result = {
      status: 'pending', score: null, rubricVersion: 'test', parcelId: saved.parcelId,
      proposal: { activities: ['new_construction'], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' },
      municipality: 'Pittsburgh', checks: [{ id: 'flood', label: 'Flood', status: 'unknown', reason: 'Unknown', sourceUrl: null, sourceDate: null, retrievedAt: null, points: 5 }],
      nextActions: [], retrievedAt: '2026-09-27T10:00:00Z', caveat: 'Incomplete',
    }
    entries.set('housing-navigator-comparison-v1:0046R00029000000', JSON.stringify(parsed))
    expect(() => loadComparison(saved.parcelId)).toThrow(/invalid/)
  })

  it('rejects a result whose saved proposal fields differ from the edited side', () => {
    const saved = createComparison('0046R00029000000')
    const parsed = JSON.parse(JSON.stringify(saved))
    parsed.proposals.A.result = {
      status: 'pending', score: null, rubricVersion: 'test', parcelId: saved.parcelId,
      proposal: { activities: [], proposedHomes: 1, housingForm: 'unknown', groundDisturbance: 'unknown' },
      municipality: 'Pittsburgh', checks: [], nextActions: [], retrievedAt: '2026-09-27T10:00:00Z', caveat: 'Incomplete',
    }
    entries.set('housing-navigator-comparison-v1:0046R00029000000', JSON.stringify(parsed))
    expect(() => loadComparison(saved.parcelId)).toThrow(/invalid/)
  })

  it('validates saved metric scores without rejecting eligible pending findings', () => {
    const saved = createComparison('0046R00029000000')
    const parsed = JSON.parse(JSON.stringify(saved))
    parsed.proposals.A.result = {
      status: 'pending', score: null, rubricVersion: 'test', parcelId: saved.parcelId,
      proposal: { activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' },
      municipality: 'Pittsburgh', checks: [{ id: 'flood', label: 'Flood', status: 'screened_low_friction', reason: 'Whole parcel X', sourceUrl: 'https://hazards.fema.gov/layer', sourceDate: null, retrievedAt: '2026-09-27T10:00:00Z', metricScore: { value: 2, max: 2, scope: 'Whole parcel minimal-hazard X', rule: 'FEMA X minimal-hazard' } }],
      nextActions: [], retrievedAt: '2026-09-27T10:00:00Z', caveat: 'Incomplete',
    }
    entries.set('housing-navigator-comparison-v1:0046R00029000000', JSON.stringify(parsed))
    expect(loadComparison(saved.parcelId)?.proposals.A.result?.checks[0].metricScore?.value).toBe(2)
    parsed.proposals.A.result.checks[0].metricScore.scope = ''
    entries.set('housing-navigator-comparison-v1:0046R00029000000', JSON.stringify(parsed))
    expect(() => loadComparison(saved.parcelId)).toThrow(/invalid/)
  })
})
