import { describe, expect, it } from 'vitest'
import { ACTIVITIES, ROLES, createDraft, summarizeDraft, validateDraft } from './contracts'

describe('guided draft contracts', () => {
  it('starts with unknown evidence and no silently confirmed site', () => {
    const draft = createDraft()
    expect(draft.parcelId).toBeNull()
    expect(draft.propertyConfirmed).toBe(false)
    expect(draft.confirmedAt).toBeNull()
    expect(draft.existingHomes).toBeNull()
    expect(draft.financial).toEqual({ budget: 'unknown', value: 'unknown', funding: 'unknown' })
    expect(validateDraft(draft)).toEqual(draft)
  })

  it('retains every supported intake category without coercing work to repair', () => {
    const draft = { ...createDraft(), activities: ACTIVITIES.map(item => item.id), description: 'Maybe rebuild, no additional dwelling yet.' }
    expect(validateDraft(draft).activities).toHaveLength(10)
    for (const role of ROLES) expect(validateDraft({ ...draft, role: role.id }).role).toBe(role.id)
    expect(ROLES).toHaveLength(5)
  })

  it('keeps tentative activities separate from confirmed selections', () => {
    const draft = validateDraft({ ...createDraft(), activities: ['repair_remodel'], tentativeActivities: ['addition'] })
    expect(draft.activities).toEqual(['repair_remodel'])
    expect(draft.tentativeActivities).toEqual(['addition'])
    expect(() => validateDraft({ ...draft, tentativeActivities: ['repair_remodel'] })).toThrow()
  })

  it('preserves leading zeros and exact original description', () => {
    const draft = validateDraft({ ...createDraft(), parcelId: '0023C00208000000', description: '  Add a bedroom, not a dwelling.\nMaybe an addition.  ' })
    expect(draft.parcelId).toBe('0023C00208000000')
    expect(draft.description).toBe('  Add a bedroom, not a dwelling.\nMaybe an addition.  ')
  })

  it('migrates an existing device draft without erasing its saved parcel', () => {
    const legacy = { ...createDraft() } as Record<string, unknown>
    delete legacy.propertyEvidence
    delete legacy.housingForm
    delete legacy.groundDisturbance
    const restored = validateDraft({ ...legacy, parcelId: '0023C00208000000', propertyConfirmed: true })
    expect(restored.parcelId).toBe('0023C00208000000')
    expect(restored.propertyEvidence).toBe('historical')
    expect(restored.housingForm).toBe('unknown')
    expect(restored.groundDisturbance).toBe('unknown')
  })

  it.each([-1, 1.5, Infinity, NaN, '2'])('rejects invalid home count %s rather than coerce it', count => {
    expect(() => validateDraft({ ...createDraft(), proposedHomes: count })).toThrow()
  })

  it('retains zero and unknown distinctly and rejects impossible retained homes', () => {
    expect(validateDraft({ ...createDraft(), proposedHomes: 0 }).proposedHomes).toBe(0)
    expect(() => validateDraft({ ...createDraft(), existingHomes: 1, proposedHomes: 2, homesRetained: 2 })).toThrow()
    expect(() => validateDraft({ ...createDraft(), existingHomes: 2, proposedHomes: 0, homesRetained: 1 })).toThrow()
  })

  it.each([
    { schemaVersion: 2 }, { step: 6 }, { revision: -1 }, { role: 'approved' },
    { activities: ['repair'] }, { activities: ['addition', 'addition'] }, { updatedAt: 'yesterday' },
    { financial: { budget: 'yes' } }, { parcelId: 23 }, { propertyConfirmed: true }, { secretExtra: 'discard me' },
  ])('rejects malformed or incompatible storage payload %j', patch => {
    expect(() => validateDraft({ ...createDraft(), ...patch })).toThrow()
  })

  it('returns detached validated data so callers cannot mutate a stored snapshot', () => {
    const input = { ...createDraft(), activities: ['addition'] }
    const result = validateDraft(input)
    input.activities.push('site_work')
    input.financial.budget = 'yes'
    expect(result.activities).toEqual(['addition'])
    expect(result.financial.budget).toBe('unknown')
  })
})

describe('evidence-gap summary', () => {
  it('prioritizes financial assumptions when any component is missing', () => {
    const result = summarizeDraft({ ...createDraft(), parcelId: '0023C00208000000', propertyConfirmed: true, financial: { budget: 'yes', value: 'unknown', funding: 'no' } })
    expect(result.tasks.findIndex(task => task.id === 'financial-readiness')).toBeLessThan(result.tasks.findIndex(task => task.id === 'proposal-review'))
    expect(result.tasks.find(task => task.id === 'financial-readiness')?.request).toContain('revenue or value')
    expect(result.tasks.find(task => task.id === 'financial-readiness')?.request).toContain('funding')
    expect(result.financialStatus).toBe('Unassessed')
  })

  it('does not call all supplied assumptions financial viability', () => {
    const result = summarizeDraft({ ...createDraft(), financial: { budget: 'yes', value: 'yes', funding: 'yes' } })
    expect(result.financialStatus).toBe('Unassessed')
    expect(result.tasks.find(task => task.id === 'financial-readiness')?.request).toContain('review')
  })

  it('calculates negative net homes without making a grocery-only proposal a winner', () => {
    const result = summarizeDraft({ ...createDraft(), existingHomes: 2, proposedHomes: 0, homesRetained: 0, essentialUses: 'Grocery' })
    expect(result.netNew).toBe(-2)
    expect(summarizeDraft(createDraft()).netNew).toBeNull()
  })

  it('never carries Lanark conflict or slope findings into another property', () => {
    const draft = { ...createDraft(), parcelId: '0167L00265000000', propertyQuery: '100 Main St', propertyConfirmed: true }
    const result = summarizeDraft(draft)
    expect(result.coverage).toContain('unresolved')
    expect(result.tasks.some(task => task.id === 'property-identity')).toBe(true)
    expect(JSON.stringify(result)).not.toMatch(/VACANT LAND|R1D-H|slope intersection/)
  })

  it('treats the selected Lanark example as dated evidence rather than automated rule coverage', () => {
    const result = summarizeDraft({ ...createDraft(), parcelId: '0023C00208000000', propertyConfirmed: true, propertyEvidence: 'historical', activities: ['demolition', 'mixed_use'] })
    expect(result.coverage).toContain('Not yet supported')
    expect(result.tasks.some(task => task.id === 'proposal-review')).toBe(true)
    expect(result.tasks.some(task => task.id === 'lanark-condition')).toBe(true)
  })

  it('does not apply historical Lanark conflict to a newly confirmed live lookup', () => {
    const result = summarizeDraft({ ...createDraft(), parcelId: '0023C00208000000', propertyConfirmed: true, propertyEvidence: 'live' })
    expect(result.tasks.some(task => task.id === 'lanark-condition')).toBe(false)
    expect(result.coverage).toContain('Live parcel identity')
  })
})
