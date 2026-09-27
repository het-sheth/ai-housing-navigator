import { describe, expect, it } from 'vitest'
import { displayPropertyAddress } from './address-label'

describe('property address labels', () => {
  it('keeps zero-numbered lots identifiable without inventing a street number', () => {
    expect(displayPropertyAddress('0 FORD ST', '0040C00148000000')).toBe('FORD ST · Parcel 0040C00148000000')
    expect(displayPropertyAddress('1024 BEECHLAND ST', '0133N00289000000')).toBe('1024 BEECHLAND ST')
    expect(displayPropertyAddress(null, '0000123')).toBe('Parcel 0000123')
  })
})
