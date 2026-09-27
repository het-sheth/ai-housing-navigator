const zoningSourceUrl = 'https://ecode360.com/45474194'
const exceptionsSourceUrl = 'https://ecode360.com/45479734'
const districtSourceUrl = 'https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0'
const assessmentSourceUrl = 'https://data.wprdc.org/dataset/property-assessments'
const assessmentApiUrl = 'https://data.wprdc.org/api/3/action/datastore_search'
const bdaSourceUrl = 'https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Building-Development-Application'
const planningSourceUrl = 'https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes'
const waterSourceUrl = 'https://www.pgh2o.com/developers-contractors-vendors/permits/water-and-sewer-tap-plan-review'
const waterServiceAreaUrl = 'https://www.pgh2o.com/your-water/learn-where-we-provide-our-services'
const ruleVersion = 'pittsburgh-r1d-dimensions-v1-2026-09-27'
const reviewedAt = '2026-09-27'

const baseRows = {
  'R1D-L': { lot: 3000, front: 30, rear: 30, exterior: 30, interior: 5, height: 40, stories: 3 },
  'R1D-H': { lot: 1200, front: 15, rear: 15, exterior: 15, interior: 5, height: 40, stories: 3 },
}

function requirements(row) {
  return [
    { id: 'minimum_lot_area', label: 'Base minimum lot area', value: row.lot, unit: 'sq_ft', qualification: 'Published base table; exceptions and lawful baseline unresolved' },
    { id: 'minimum_front_setback', label: 'Base minimum front setback', value: row.front, unit: 'ft', qualification: 'Contextual provisions may apply' },
    { id: 'minimum_rear_setback', label: 'Base minimum rear setback', value: row.rear, unit: 'ft', qualification: 'Contextual provisions may apply' },
    { id: 'minimum_exterior_side_setback', label: 'Base minimum exterior side setback', value: row.exterior, unit: 'ft', qualification: 'Corner lot applicability and contextual provisions unresolved' },
    { id: 'minimum_interior_side_setback', label: 'Base minimum interior side setback', value: row.interior, unit: 'ft', qualification: 'Surveyed lot lines and exceptions unresolved' },
    { id: 'maximum_height', label: 'Base maximum height', value: row.height, unit: 'ft', qualification: 'Also limited by stories; contextual and compatibility provisions may apply' },
    { id: 'maximum_stories', label: 'Base maximum stories', value: row.stories, unit: 'stories', qualification: 'Height and story limits both apply under the base table' },
  ]
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

async function assessmentLotArea(parcelId, fetcher, at) {
  const result = { status: 'missing', sqFt: null, sourceUrl: assessmentSourceUrl, sourceDate: null, retrievedAt: at }
  const url = new URL(assessmentApiUrl)
  url.searchParams.set('resource_id', 'property_assessments_table')
  url.searchParams.set('filters', JSON.stringify({ PARID: parcelId }))
  url.searchParams.set('fields', 'PARID,LOTAREA,ASOFDATE')
  url.searchParams.set('limit', '2')
  try {
    const response = await fetcher(url.toString(), { signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw Error('source_http_error')
    const reader = response.body?.getReader()
    if (!reader) throw Error('source_empty_body')
    const chunks = []
    let length = 0
    while (true) {
      const part = await reader.read()
      if (part.done) break
      length += part.value.byteLength
      if (length > 100_000) { await reader.cancel(); throw Error('source_too_large') }
      chunks.push(part.value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    const records = data?.result?.records
    if (data?.success !== true || !Array.isArray(records) || !Number.isSafeInteger(data?.result?.total) || data.result.total < 0 || data.result.total > 1 || records.length > 1 || records.some(record => record?.PARID !== parcelId)) throw Error('assessment_incomplete')
    if (data.result.total === 0 && records.length === 0) return result
    if (data.result.total !== 1 || records.length !== 1) throw Error('assessment_incomplete')
    result.sourceDate = validDate(records[0].ASOFDATE)
    if (typeof records[0].LOTAREA === 'number' && Number.isFinite(records[0].LOTAREA) && records[0].LOTAREA > 0) {
      result.status = 'available'
      result.sqFt = records[0].LOTAREA
    }
    return result
  } catch {
    return { ...result, status: 'error' }
  }
}

function ruleFor(district) {
  const row = baseRows[district]
  return {
    status: row ? 'reviewed_baseline' : district ? 'out_of_scope' : 'unavailable',
    version: ruleVersion,
    sourceUrl: zoningSourceUrl,
    exceptionsSourceUrl,
    sourceDate: null,
    sectionAmendmentEffectiveDate: '2025-05-07',
    reviewedAt,
    requirements: row ? requirements(row) : [],
  }
}

function guidance() {
  return {
    processGuidance: {
      status: 'curated_guidance', sourceUrl: bdaSourceUrl, conflictingSourceUrl: planningSourceUrl, sourceDate: '2026-09-02', reviewedAt,
      summary: 'The newer City guidance says the Building & Development Application replaces separate ZDR and building permit applications and is typically the initial step for a new structure. An older Planning page still mentions a separate ZDR; confirm the current path and required reviews with PLI.',
    },
    waterGuidance: {
      status: 'curated_guidance', sourceUrl: waterSourceUrl, serviceAreaUrl: waterServiceAreaUrl, sourceDate: null, reviewedAt,
      summary: 'Confirm the water provider and service area. For a new tap or increased flow, ask the provider about an availability letter and required tap-in review; parcel capacity is unverified.',
    },
  }
}

export async function assessOneHome(parcelId, proposal, district, fetcher, at) {
  const applicableProposal = proposal.activities.includes('new_construction') && proposal.activities.every(activity => ['new_construction', 'site_work'].includes(activity)) && proposal.proposedHomes === 1 && proposal.housingForm === 'detached'
  const supportedDistrict = Object.hasOwn(baseRows, district)
  const applicability = !applicableProposal ? 'unsupported' : !district ? 'unknown' : supportedDistrict ? 'applicable' : 'unsupported'
  const rule = ruleFor(district)
  const recordedLotArea = applicability === 'applicable'
    ? await assessmentLotArea(parcelId, fetcher, at)
    : { status: 'missing', sqFt: null, sourceUrl: assessmentSourceUrl, sourceDate: null, retrievedAt: null }
  const minimum = applicability === 'applicable' ? baseRows[district].lot : null
  const comparable = minimum !== null && recordedLotArea.status === 'available'
  const lotAreaComparison = {
    status: !minimum ? 'out_of_scope' : !comparable ? 'unknown' : recordedLotArea.sqFt >= minimum ? 'recorded_meets_base_minimum' : 'recorded_below_base_minimum',
    baseMinimumSqFt: minimum,
    explanation: !minimum
      ? 'No supported base lot-area comparison applies to this proposal and mapped district.'
      : !comparable
        ? 'The County recorded lot area is missing or unavailable; the published base minimum cannot be compared.'
        : recordedLotArea.sqFt >= minimum
          ? 'The County recorded lot area meets the published base minimum by number only. Surveyed area, exceptions and zoning compliance are unverified.'
          : 'The County recorded lot area is below the published base minimum by number only. Lawful baseline, exceptions and zoning compliance are unverified.',
  }
  const missingEvidence = [
    'Surveyed lot area, boundaries, proposed footprint, setbacks, height and story count',
    'Applicable overlays, contextual rules, lawful baseline and plat or recording history for possible lot-size exceptions',
    'Current City application path and required reviews for this scope',
    'Water provider, service area and written availability or capacity determination',
  ]
  if (applicability !== 'applicable') missingEvidence.unshift('A supported one-new-detached-home proposal and one approved whole-parcel R1D-L or R1D-H district')
  if (recordedLotArea.status !== 'available' && applicability === 'applicable') missingEvidence.unshift('Exact-parcel County recorded lot area')
  const nextActions = [
    'Confirm base dimensions with City zoning staff using a survey and site plan; review plat and recording history for possible Section 925.01(C) lot-size exceptions without assuming eligibility.',
    'Confirm the current Building & Development Application path and required reviews with PLI.',
    'Confirm the utility and water provider, site access and written availability, then request tap-in guidance if new or increased service is proposed.',
  ]
  if (applicability === 'applicable' && recordedLotArea.status !== 'available') nextActions.unshift('Retrieve the exact County assessment lot area and verify it against a current survey before comparing the base minimum.')
  return {
    applicability,
    scope: 'One new detached home on one wholly mapped Pittsburgh R1D parcel',
    mappedDistrict: district,
    districtSourceUrl,
    districtRetrievedAt: district ? at : null,
    rule,
    recordedLotArea,
    lotAreaComparison,
    ...guidance(),
    missingEvidence,
    nextActions,
  }
}
