export type OneHomeRequirement = {
  id: 'minimum_lot_area' | 'minimum_front_setback' | 'minimum_rear_setback' | 'minimum_exterior_side_setback' | 'minimum_interior_side_setback' | 'maximum_height' | 'maximum_stories'
  label: string
  value: number
  unit: 'sq_ft' | 'ft' | 'stories'
  qualification: string
}

export type OneHomeAssessment = {
  applicability: 'applicable' | 'unsupported' | 'unknown'
  scope: string
  mappedDistrict: string | null
  districtSourceUrl: string
  districtRetrievedAt: string | null
  rule: {
    status: 'reviewed_baseline' | 'out_of_scope' | 'unavailable'
    version: string
    sourceUrl: string
    exceptionsSourceUrl: string
    sourceDate: string | null
    sectionAmendmentEffectiveDate: string | null
    reviewedAt: string
    requirements: OneHomeRequirement[]
  }
  recordedLotArea: {
    status: 'available' | 'missing' | 'error'
    sqFt: number | null
    sourceUrl: string
    sourceDate: string | null
    retrievedAt: string | null
  }
  lotAreaComparison: {
    status: 'recorded_meets_base_minimum' | 'recorded_below_base_minimum' | 'unknown' | 'out_of_scope'
    baseMinimumSqFt: number | null
    explanation: string
  }
  processGuidance: OneHomeGuidance & { conflictingSourceUrl: string }
  waterGuidance: OneHomeGuidance & { serviceAreaUrl: string }
  missingEvidence: string[]
  nextActions: string[]
}

type OneHomeGuidance = { status: 'curated_guidance'; sourceUrl: string; sourceDate: string | null; reviewedAt: string; summary: string }
type Context = { municipality: string; proposal: { activities: string[]; proposedHomes: number | null; housingForm: string; groundDisturbance: string } }

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key))
const bounded = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && [...value].every(character => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
const nullableDate = (value: unknown) => value === null || date(value)
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value))
const nullableTimestamp = (value: unknown) => value === null || timestamp(value)
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1_000_000_000

function httpsUrl(value: unknown): value is string {
  if (!bounded(value, 2048) || !value.startsWith('https://') || /\s/.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch { return false }
}

const requirementUnits: Record<string, string> = {
  minimum_lot_area: 'sq_ft', minimum_front_setback: 'ft', minimum_rear_setback: 'ft',
  minimum_exterior_side_setback: 'ft', minimum_interior_side_setback: 'ft', maximum_height: 'ft', maximum_stories: 'stories',
}
const reviewedValues: Record<string, Record<string, number>> = {
  'R1D-L': { minimum_lot_area: 3000, minimum_front_setback: 30, minimum_rear_setback: 30, minimum_exterior_side_setback: 30, minimum_interior_side_setback: 5, maximum_height: 40, maximum_stories: 3 },
  'R1D-H': { minimum_lot_area: 1200, minimum_front_setback: 15, minimum_rear_setback: 15, minimum_exterior_side_setback: 15, minimum_interior_side_setback: 5, maximum_height: 40, maximum_stories: 3 },
}
const officialSources = {
  district: 'https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0',
  area: 'https://data.wprdc.org/dataset/property-assessments',
  process: 'https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Building-Development-Application',
  conflictingProcess: 'https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes',
  water: 'https://www.pgh2o.com/developers-contractors-vendors/permits/water-and-sewer-tap-plan-review',
  waterArea: 'https://www.pgh2o.com/your-water/learn-where-we-provide-our-services',
}

function validRequirement(value: unknown): value is OneHomeRequirement {
  return record(value) && keys(value, ['id', 'label', 'value', 'unit', 'qualification']) && typeof value.id === 'string' && requirementUnits[value.id] === value.unit && bounded(value.label, 100) && positive(value.value) && bounded(value.qualification, 500)
}

function validGuidance(value: unknown, water: boolean): boolean {
  return record(value) && keys(value, water ? ['status', 'sourceUrl', 'serviceAreaUrl', 'sourceDate', 'reviewedAt', 'summary'] : ['status', 'sourceUrl', 'conflictingSourceUrl', 'sourceDate', 'reviewedAt', 'summary']) && value.status === 'curated_guidance' && httpsUrl(value.sourceUrl) && (water ? httpsUrl(value.serviceAreaUrl) : httpsUrl(value.conflictingSourceUrl)) && nullableDate(value.sourceDate) && date(value.reviewedAt) && bounded(value.summary, 1000)
}

function validTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 12 && value.every(item => bounded(item, 500))
}

export function isOneHomeAssessment(value: unknown, context: Context): value is OneHomeAssessment | undefined {
  if (value === undefined) return true
  if (!record(value) || !keys(value, ['applicability', 'scope', 'mappedDistrict', 'districtSourceUrl', 'districtRetrievedAt', 'rule', 'recordedLotArea', 'lotAreaComparison', 'processGuidance', 'waterGuidance', 'missingEvidence', 'nextActions'])) return false
  if (!['applicable', 'unsupported', 'unknown'].includes(String(value.applicability)) || !bounded(value.scope, 240) || value.mappedDistrict !== null && !bounded(value.mappedDistrict, 80) || value.districtSourceUrl !== officialSources.district || !nullableTimestamp(value.districtRetrievedAt) || !validTextList(value.missingEvidence) || !validTextList(value.nextActions)) return false
  if (context.municipality !== 'Pittsburgh') return false
  const proposalFits = context.proposal.activities.includes('new_construction') && context.proposal.activities.every(id => ['new_construction', 'site_work'].includes(id)) && context.proposal.proposedHomes === 1 && context.proposal.housingForm === 'detached'
  const rule = value.rule
  if (!record(rule) || !keys(rule, ['status', 'version', 'sourceUrl', 'exceptionsSourceUrl', 'sourceDate', 'sectionAmendmentEffectiveDate', 'reviewedAt', 'requirements']) || !['reviewed_baseline', 'out_of_scope', 'unavailable'].includes(String(rule.status)) || !bounded(rule.version, 120) || !httpsUrl(rule.sourceUrl) || rule.exceptionsSourceUrl !== 'https://ecode360.com/45479734' || !nullableDate(rule.sourceDate) || !nullableDate(rule.sectionAmendmentEffectiveDate) || !date(rule.reviewedAt) || !Array.isArray(rule.requirements) || !rule.requirements.every(validRequirement)) return false
  const reviewed = rule.status === 'reviewed_baseline'
  if (value.mappedDistrict !== null && !timestamp(value.districtRetrievedAt) || value.mappedDistrict === null && value.districtRetrievedAt !== null) return false
  if (reviewed !== ['R1D-L', 'R1D-H'].includes(String(value.mappedDistrict))) return false
  if (reviewed && (!['R1D-L', 'R1D-H'].includes(String(value.mappedDistrict)) || rule.version !== 'pittsburgh-r1d-dimensions-v1-2026-09-27' || rule.sourceUrl !== 'https://ecode360.com/45474194' || rule.requirements.length !== 7 || new Set(rule.requirements.map(item => item.id)).size !== 7 || rule.requirements.some(item => item.value !== reviewedValues[String(value.mappedDistrict)][item.id])) || !reviewed && rule.requirements.length !== 0) return false
  if (value.applicability === 'applicable' && (!proposalFits || !reviewed || !timestamp(value.districtRetrievedAt))) return false
  if (value.applicability === 'unsupported' && proposalFits && reviewed) return false
  if (value.applicability === 'unknown' && (reviewed || value.mappedDistrict !== null || !proposalFits)) return false
  if (rule.status === 'out_of_scope' && value.mappedDistrict === null || rule.status === 'unavailable' && value.mappedDistrict !== null) return false
  const area = value.recordedLotArea
  if (!record(area) || !keys(area, ['status', 'sqFt', 'sourceUrl', 'sourceDate', 'retrievedAt']) || !['available', 'missing', 'error'].includes(String(area.status)) || area.sourceUrl !== officialSources.area || !nullableDate(area.sourceDate) || !nullableTimestamp(area.retrievedAt) || (area.status === 'available' ? !positive(area.sqFt) || !timestamp(area.retrievedAt) : area.sqFt !== null)) return false
  if (value.applicability !== 'applicable' && (area.status !== 'missing' || area.retrievedAt !== null)) return false
  if (value.applicability === 'applicable' && !timestamp(area.retrievedAt)) return false
  const comparison = value.lotAreaComparison
  if (!record(comparison) || !keys(comparison, ['status', 'baseMinimumSqFt', 'explanation']) || !['recorded_meets_base_minimum', 'recorded_below_base_minimum', 'unknown', 'out_of_scope'].includes(String(comparison.status)) || !bounded(comparison.explanation, 700)) return false
  if (value.applicability !== 'applicable') {
    if (comparison.status !== 'out_of_scope' || comparison.baseMinimumSqFt !== null) return false
  } else {
    const minimum = rule.requirements.find(item => item.id === 'minimum_lot_area')?.value
    if (comparison.baseMinimumSqFt !== minimum || area.status === 'available' && comparison.status !== (Number(area.sqFt) >= Number(minimum) ? 'recorded_meets_base_minimum' : 'recorded_below_base_minimum') || area.status !== 'available' && comparison.status !== 'unknown') return false
  }
  return validGuidance(value.processGuidance, false) && validGuidance(value.waterGuidance, true) && (value.processGuidance as OneHomeAssessment['processGuidance']).sourceUrl === officialSources.process && (value.processGuidance as OneHomeAssessment['processGuidance']).conflictingSourceUrl === officialSources.conflictingProcess && (value.waterGuidance as OneHomeAssessment['waterGuidance']).sourceUrl === officialSources.water && (value.waterGuidance as OneHomeAssessment['waterGuidance']).serviceAreaUrl === officialSources.waterArea
}
