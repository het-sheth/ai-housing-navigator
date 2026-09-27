import { describe, expect, it } from 'vitest'
import sample from './one-home-assessment.fixture.json'
import { isOneHomeAssessment } from './one-home-assessment'

const base = sample.oneHomeAssessment
const result = { municipality: 'Pittsburgh', proposal: { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'yes' } }

describe('focused one-home result validation', () => {
  it('accepts the reviewed R1D sample and old results with no focused result', () => {
    expect(isOneHomeAssessment(base, result)).toBe(true)
    expect(isOneHomeAssessment(undefined, result)).toBe(true)
  })

  it('rejects unsafe source links and invalid dates', () => {
    expect(isOneHomeAssessment({ ...base, districtSourceUrl: 'javascript:alert(1)' }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, rule: { ...base.rule, sourceUrl: 'https://user@example.com/code' } }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, waterGuidance: { ...base.waterGuidance, serviceAreaUrl: 'https://example.com\nhttps://evil.test' } }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, rule: { ...base.rule, reviewedAt: '2026-02-30' } }, result)).toBe(false)
    const officialLinkChanges = [
      { ...base, districtSourceUrl: 'https://evil.test/zoning' },
      { ...base, recordedLotArea: { ...base.recordedLotArea, sourceUrl: 'https://evil.test/area' } },
      { ...base, processGuidance: { ...base.processGuidance, sourceUrl: 'https://evil.test/bda' } },
      { ...base, processGuidance: { ...base.processGuidance, conflictingSourceUrl: 'https://evil.test/planning' } },
      { ...base, waterGuidance: { ...base.waterGuidance, sourceUrl: 'https://evil.test/tap' } },
      { ...base, waterGuidance: { ...base.waterGuidance, serviceAreaUrl: 'https://evil.test/area' } },
    ]
    for (const changed of officialLinkChanges) expect(isOneHomeAssessment(changed, result)).toBe(false)
  })

  it('rejects unsupported proposals carrying applicable baseline findings', () => {
    expect(isOneHomeAssessment(base, { ...result, proposal: { ...result.proposal, housingForm: 'attached' } })).toBe(false)
    expect(isOneHomeAssessment(base, { ...result, municipality: 'other' })).toBe(false)
    expect(isOneHomeAssessment({ ...base, rule: { ...base.rule, status: 'out_of_scope' } }, result)).toBe(false)
  })

  it('rejects inconsistent lot comparisons and unbounded additions', () => {
    expect(isOneHomeAssessment({ ...base, lotAreaComparison: { ...base.lotAreaComparison, status: 'recorded_below_base_minimum' } }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, recordedLotArea: { ...base.recordedLotArea, sqFt: null } }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, missingEvidence: ['x'.repeat(501)] }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, score: 100 }, result)).toBe(false)
    const altered = base.rule.requirements.map(item => item.id === 'minimum_lot_area' ? { ...item, value: 1 } : item)
    expect(isOneHomeAssessment({ ...base, rule: { ...base.rule, requirements: altered }, lotAreaComparison: { ...base.lotAreaComparison, baseMinimumSqFt: 1 } }, result)).toBe(false)
  })

  it('accepts unsupported districts and uncertain zoning without inventing a baseline', () => {
    const empty = { status: 'missing', sqFt: null, sourceUrl: base.recordedLotArea.sourceUrl, sourceDate: null, retrievedAt: null }
    const comparison = { status: 'out_of_scope', baseMinimumSqFt: null, explanation: 'No supported base comparison.' }
    const outside = { ...base, applicability: 'unsupported', mappedDistrict: 'R2-H', rule: { ...base.rule, status: 'out_of_scope', requirements: [] }, recordedLotArea: empty, lotAreaComparison: comparison }
    expect(isOneHomeAssessment(outside, result)).toBe(true)
    const unresolved = { ...outside, applicability: 'unknown', mappedDistrict: null, districtRetrievedAt: null, rule: { ...outside.rule, status: 'unavailable' } }
    expect(isOneHomeAssessment(unresolved, result)).toBe(true)
    const addition = { ...outside, mappedDistrict: 'R1D-H', rule: base.rule }
    expect(isOneHomeAssessment(addition, { ...result, proposal: { ...result.proposal, activities: ['addition'] } })).toBe(true)
    expect(isOneHomeAssessment({ ...outside, applicability: 'applicable' }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...outside, districtRetrievedAt: null }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...base, recordedLotArea: { ...base.recordedLotArea, status: 'missing', sqFt: null, retrievedAt: null }, lotAreaComparison: { ...base.lotAreaComparison, status: 'unknown' } }, result)).toBe(false)
    expect(isOneHomeAssessment({ ...outside, rule: { ...outside.rule, status: 'unavailable' } }, result)).toBe(false)
  })
})
