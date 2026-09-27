import type { OneHomeAssessment } from './one-home-assessment'

const safe = (value: string) => value.replace(/[\\`*_{}[\]<>#|]/g, character => `\\${character}`)
const date = (value: string | null) => value ?? 'Unknown'

export function oneHomeBriefLines(value: OneHomeAssessment): string[] {
  const lines = ['', '## Focused one-home site evidence', `Scope: ${safe(value.scope)}`, `Applicability: ${value.applicability}`, `Mapped district: ${safe(value.mappedDistrict ?? 'Unresolved')}`, `City zoning map: ${value.districtSourceUrl} | retrieved: ${value.districtRetrievedAt ?? 'Not checked'}`]
  if (value.applicability !== 'applicable') {
    lines.push('This proposal or mapped district is outside the focused review. General screening findings and next actions apply.')
    return lines
  }
  const area = value.recordedLotArea
  const comparison = value.lotAreaComparison
  lines.push(`County recorded lot area: ${area.status === 'available' ? `${Number(area.sqFt).toLocaleString('en-US')} sq ft` : area.status}`, `Published base minimum lot area: ${Number(comparison.baseMinimumSqFt).toLocaleString('en-US')} sq ft`, `Recorded area comparison: ${safe(comparison.explanation)}`, `County area source: ${area.sourceUrl} | source date: ${date(area.sourceDate)} | retrieved: ${area.retrievedAt ?? 'Not checked'}`, '', 'Published base dimensions, not measured project compliance:', ...value.rule.requirements.map(item => `- ${safe(item.label)}: ${item.value.toLocaleString('en-US')} ${item.unit === 'sq_ft' ? 'sq ft' : item.unit}. ${safe(item.qualification)}`), `City base table: ${value.rule.sourceUrl} | section amendment effective: ${date(value.rule.sectionAmendmentEffectiveDate)} | reviewed: ${value.rule.reviewedAt}`, `City lot exceptions: ${value.rule.exceptionsSourceUrl} | applicability and plat or recording history unverified`, '', 'Missing site-plan and review evidence:', ...value.missingEvidence.map(item => `- ${safe(item)}`), '', `City Building & Development Application guidance: ${value.processGuidance.sourceUrl} | source date: ${date(value.processGuidance.sourceDate)} | reviewed: ${value.processGuidance.reviewedAt}`, `Newer City guidance describes BDA as the initial application for new structures, replacing separate ZDR and building permit applications. ${safe(value.processGuidance.summary)}`, `City Planning guidance mentioning separate ZDR: ${value.processGuidance.conflictingSourceUrl}`, `Water tap review guidance: ${value.waterGuidance.sourceUrl} | source date: ${date(value.waterGuidance.sourceDate)} | reviewed: ${value.waterGuidance.reviewedAt}`, `Water service area guidance: ${value.waterGuidance.serviceAreaUrl}`, `Water guidance: ${safe(value.waterGuidance.summary)}`, 'Confirm the current City path and water provider directly. Capacity, dimensional compliance and permission remain unverified.')
  return lines
}
