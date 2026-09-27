import { describe, expect, it } from 'vitest'
import sample from './one-home-assessment.fixture.json'
import { oneHomeBriefLines } from './one-home-brief'
import type { OneHomeAssessment } from './one-home-assessment'

describe('focused one-home brief', () => {
  it('exports the same recorded area, base table and provenance without a verdict', () => {
    const brief = oneHomeBriefLines(sample.oneHomeAssessment as OneHomeAssessment).join('\n')
    expect(brief).toContain('R1D-H')
    expect(brief).toContain('1,200 sq ft')
    expect(brief).toContain('https://ecode360.com/45474194')
    expect(brief).toContain('https://ecode360.com/45479734')
    expect(brief).toContain('replacing separate ZDR and building permit applications')
    expect(brief).toContain(sample.oneHomeAssessment.processGuidance.summary)
    expect(brief).toContain(sample.oneHomeAssessment.waterGuidance.summary)
    expect(brief).toContain('Surveyed lot area')
    expect(brief).not.toContain('Zoning compliant')
  })
})
