import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDraft } from '../projects/contracts'
import { createComparison } from '../comparison/comparison-model'
import { localWalkthroughCopy, restoreCloudSnapshot, validateCloudSnapshot } from './snapshot'

afterEach(() => vi.unstubAllGlobals())

describe('cloud snapshot validation', () => {
  it('accepts a complete walkthrough draft without changing its parcel identifier', () => {
    const draft = { ...createDraft(), parcelId: '0046R00029000000', propertyConfirmed: true, propertyEvidence: 'live' as const }
    expect(validateCloudSnapshot('walkthrough', draft)).toEqual(draft)
  })

  it('rejects an invalid walkthrough before it can replace a local draft', () => {
    const draft = { ...createDraft(), proposedHomes: -1 }
    expect(() => validateCloudSnapshot('walkthrough', draft)).toThrow(/home counts/i)
  })

  it('accepts a complete two-sided comparison without dropping its parcel identifier', () => {
    const comparison = createComparison('0046R00029000000')
    comparison.proposals.B.input.description = 'Add one home'
    expect(validateCloudSnapshot('comparison', comparison)).toEqual(comparison)
  })

  it('rejects a partial comparison and leaves local data for another operation', () => {
    const comparison = createComparison('0046R00029000000')
    const malformed = { ...comparison, proposals: { A: comparison.proposals.A } }
    expect(() => validateCloudSnapshot('comparison', malformed)).toThrow(/comparison/i)
  })

  it('rejects a pending comparison result with a numeric score', () => {
    const comparison = createComparison('0046R00029000000')
    const malformed = structuredClone(comparison) as unknown as { proposals: { A: { result: unknown } } }
    malformed.proposals.A.result = { status: 'pending', score: { lower: 50, upper: 50 } }
    expect(() => validateCloudSnapshot('comparison', malformed)).toThrow(/comparison/i)
  })

  it('backs up a device comparison before restoring a cloud version for the same parcel', async () => {
    const entries = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value) },
    })
    const device = createComparison('0046R00029000000')
    device.proposals.A.input.description = 'Device work'
    const cloud = createComparison('0046R00029000000')
    cloud.proposals.A.input.description = 'Cloud work'
    entries.set('housing-navigator-comparison-v1:0046R00029000000', JSON.stringify(device))
    await restoreCloudSnapshot('comparison', cloud)
    expect(JSON.parse(entries.get('housing-navigator-comparison-v1:0046R00029000000')!).proposals.A.input.description).toBe('Cloud work')
    const backup = [...entries.entries()].find(([key]) => key.startsWith('housing-navigator-comparison-backup-v1:'))
    expect(JSON.parse(backup![1]).proposals.A.input.description).toBe('Device work')
  })

  it('uses a new local identity for every restore of the same cloud walkthrough', () => {
    const cloud = createDraft()
    const current = createDraft()
    const first = localWalkthroughCopy(cloud)
    const second = localWalkthroughCopy(cloud)
    const archiveKeys = [current.id, first.id, second.id].map(id => `archive:${id}`)
    expect(new Set(archiveKeys).size).toBe(3)
    expect(first).toMatchObject({ ...cloud, id: expect.any(String) })
    expect(first.id).not.toBe(cloud.id)
    expect(second.id).not.toBe(first.id)
  })
})
