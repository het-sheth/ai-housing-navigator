const parcelLayer = 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0'
const municipalityLayer = 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0'
const zoningLayer = 'https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0'
const slopeLayer = 'https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebSlope25/FeatureServer/0'
const floodLayer = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28'
const ruleUrl = 'https://ecode360.com/45476538'
const activities = ['repair_remodel', 'addition', 'interior_conversion', 'additional_dwelling', 'partial_demolition_rebuild', 'demolition', 'new_construction', 'site_work', 'mixed_use', 'other_uncertain']
const rubricVersion = 'pittsburgh-metric-screen-v2-provisional-2026-09-27'
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }

function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
function exactKeys(value, keys) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)) }
function validInput(value) {
  return exactKeys(value, ['parcelId', 'proposal']) && typeof value.parcelId === 'string' && /^[A-Za-z0-9 -]{1,64}$/.test(value.parcelId) &&
    exactKeys(value.proposal, ['activities', 'proposedHomes', 'housingForm', 'groundDisturbance']) &&
    Array.isArray(value.proposal.activities) && value.proposal.activities.length <= 10 &&
    value.proposal.activities.every(item => activities.includes(item)) && new Set(value.proposal.activities).size === value.proposal.activities.length &&
    (value.proposal.proposedHomes === null || Number.isSafeInteger(value.proposal.proposedHomes) && value.proposal.proposedHomes >= 0 && value.proposal.proposedHomes <= 100000) &&
    ['detached', 'attached', 'unknown'].includes(value.proposal.housingForm) && ['yes', 'no', 'unknown'].includes(value.proposal.groundDisturbance)
}

async function body(request) {
  if (Number(request.headers.get('content-length')) > 4096) throw Error('too_large')
  const reader = request.body?.getReader()
  if (!reader) throw Error('invalid_body')
  const chunks = []
  let length = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > 4096) { await reader.cancel(); throw Error('too_large') }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

async function sourceJson(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw Error('source_http_error')
  const reader = response.body?.getReader()
  if (!reader) throw Error('source_empty_body')
  const chunks = []
  let length = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > 2_000_000) { await reader.cancel(); throw Error('source_too_large') }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (parsed?.error) throw Error('source_application_error')
  return parsed
}

function signedArea(ring) {
  let area = 0
  for (let index = 0; index < ring.length - 1; index++) area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]
  return area / 2
}

function validRing(ring) {
  return Array.isArray(ring) && ring.length >= 4 && ring.length <= 10000 &&
    ring.every(point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[0] > -81 && point[0] < -79 && point[1] > 39 && point[1] < 41) &&
    ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] && Math.abs(signedArea(ring)) > 1e-13
}

function esriGeometry(geometry) {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) throw Error('invalid_geometry')
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  if (!Array.isArray(polygons) || !polygons.length || polygons.length > 100 || !polygons.every(polygon => Array.isArray(polygon) && polygon.length && polygon.every(validRing))) throw Error('invalid_geometry')
  const rings = polygons.flatMap(polygon => polygon.map((ring, index) => {
    const clockwise = index === 0
    const isClockwise = signedArea(ring) < 0
    return clockwise === isClockwise ? ring : [...ring].reverse()
  }))
  return { rings, spatialReference: { wkid: 4326 } }
}

export async function exactParcel(pin, fetcher) {
  const url = new URL(`${parcelLayer}/query`)
  for (const [key, value] of Object.entries({ where: `PIN='${pin}'`, outFields: 'PIN', returnGeometry: 'true', outSR: '4326', f: 'geojson' })) url.searchParams.set(key, value)
  const data = await sourceJson(url.toString(), fetcher)
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length !== 1 || data.exceededTransferLimit || data.features[0]?.properties?.PIN !== pin) throw Error('parcel_unresolved')
  return esriGeometry(data.features[0].geometry)
}

export async function spatial(layer, geometry, relation, fields, fetcher) {
  const url = new URL(`${layer}/query`)
  for (const [key, value] of Object.entries({ where: '1=1', geometry: JSON.stringify(geometry), geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: relation, outFields: fields, returnGeometry: 'false', f: 'json' })) url.searchParams.set(key, value)
  const data = await sourceJson(url.toString(), fetcher)
  if (!Array.isArray(data.features) || data.exceededTransferLimit || data.features.length > 100 || !data.features.every(feature => feature && typeof feature.attributes === 'object' && feature.attributes !== null)) throw Error('spatial_response_incomplete')
  return data.features.map(feature => feature.attributes)
}

function check(id, label, status, reason, now, sourceUrl = null, sourceDate = null, metricScore = null) {
  return { id, label, status, reason, sourceUrl, sourceDate, retrievedAt: sourceUrl ? now : null, ...(metricScore ? { metricScore } : {}) }
}

function underminingReason(status) {
  const reasons = {
    mapped_flag: 'The parcel intersects or touches City mapped undermining. A mine map and site professional review are needed; this is not a subsidence finding.',
    mapped_no_flag: 'The parcel intersects City mapped undermining, but the returned feature flag is No. This does not clear site risk; review mine maps and site conditions.',
    unknown: 'The parcel intersects City mapped undermining, but the feature flag is unrecognized or incomplete. Review the source feature and site conditions.',
    error: 'City mapped undermining could not be checked.',
    no_intersection: 'No City undermining feature was returned. Historical mine maps may be incomplete; site conditions remain unassessed.',
  }
  return reasons[status] ?? 'Mapped undermining status needs source review; site conditions remain unassessed.'
}

function pending(input, checks, municipality, actions, now, sourceObservations = [], oneHomeAssessment = null) {
  return json({ status: 'pending', score: null, rubricVersion, parcelId: input.parcelId, proposal: input.proposal, municipality, checks, sourceObservations, ...(oneHomeAssessment ? { oneHomeAssessment } : {}), nextActions: actions, retrievedAt: now, caveat: 'No overall Development Ease Score is calculated. Narrow metric screens do not establish permission or financial feasibility.' })
}

function featureCode(value) { return typeof value === 'string' ? value.trim().toUpperCase() : '' }

export async function handleScreening(request, { fetcher = fetch, now = () => new Date().toISOString(), trustedOrigin = 'http://127.0.0.1:5173' } = {}) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const url = new URL(request.url)
  if (url.pathname !== '/api/screening/run') return json({ error: 'not_found' }, 404)
  const correctRequestHost = trustedOrigin === 'http://127.0.0.1:5173' ? ['127.0.0.1', 'localhost'].includes(url.hostname) : url.origin === trustedOrigin
  if (!correctRequestHost || request.headers.get('origin') !== trustedOrigin) return json({ error: 'origin_denied' }, 403)
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'json_required' }, 415)
  let input
  try { input = await body(request) } catch { return json({ error: 'invalid_or_large_body' }, 413) }
  if (!validInput(input)) return json({ error: 'invalid_request' }, 422)
  const at = now()
  const checks = []
  const actions = []
  if (!input.proposal.activities.length) {
    actions.push('Select at least one work activity before screening a proposal.')
    return pending(input, checks, 'unresolved', actions, at)
  }
  let geometry
  try { geometry = await exactParcel(input.parcelId, fetcher) }
  catch {
    actions.push('Confirm the exact parcel boundary with Allegheny County before screening development conditions.')
    return pending(input, checks, 'unresolved', actions, at)
  }
  let municipality
  try {
    const [inside, intersects] = await Promise.all([
      spatial(municipalityLayer, geometry, 'esriSpatialRelWithin', 'NAME,MUNICODE,OBJECTID', fetcher),
      spatial(municipalityLayer, geometry, 'esriSpatialRelIntersects', 'NAME,MUNICODE,OBJECTID', fetcher),
    ])
    if (inside.length !== 1 || intersects.length !== 1 || !Number.isSafeInteger(inside[0].OBJECTID) || inside[0].OBJECTID !== intersects[0].OBJECTID || featureCode(inside[0].NAME) !== featureCode(intersects[0].NAME) || String(inside[0].MUNICODE) !== String(intersects[0].MUNICODE)) throw Error('municipality_ambiguous')
    municipality = featureCode(inside[0].NAME) === 'PITTSBURGH' && String(inside[0].MUNICODE) === '100' ? 'Pittsburgh' : 'other'
  } catch {
    actions.push('Confirm the full parcel municipality and resolve boundary or source conflicts before applying City rules.')
    return pending(input, checks, 'unresolved', actions, at)
  }
  if (municipality !== 'Pittsburgh') {
    actions.push('Use the governing municipality for zoning and permit review; Pittsburgh checks do not cover this parcel.')
    return pending(input, checks, 'other', actions, at)
  }

  const sourceObservationsPromise = collectSourceObservations(input.parcelId, geometry, fetcher, at)
  let zone
  let unapprovedZone = false
  try {
    const [inside, intersects] = await Promise.all([
      spatial(zoningLayer, geometry, 'esriSpatialRelWithin', 'OBJECTID,zon_new,full_zoning_type,status', fetcher),
      spatial(zoningLayer, geometry, 'esriSpatialRelIntersects', 'OBJECTID,zon_new,full_zoning_type,status', fetcher),
    ])
    if (inside.length !== 1 || intersects.length !== 1 || !Number.isSafeInteger(inside[0].OBJECTID) || inside[0].OBJECTID !== intersects[0].OBJECTID || featureCode(inside[0].zon_new) !== featureCode(intersects[0].zon_new)) throw Error('split_zoning')
    unapprovedZone = featureCode(inside[0].status) !== 'APPROVED' || featureCode(intersects[0].status) !== 'APPROVED'
    if (!unapprovedZone) zone = featureCode(inside[0].zon_new)
  } catch {
    checks.push(check('zoning-use', 'Bounded zoning use-table screen', 'error', 'City district coverage could not be verified for the whole parcel.', at, zoningLayer))
  }
  if (unapprovedZone) checks.push(check('zoning-use', 'Bounded zoning use-table screen', 'unknown', 'Returned City zoning feature was not marked Approved in the map layer. This layer status is not project approval.', at, zoningLayer))
  if (zone) {
    const supportedUse = /^R1D(?:-|$)/.test(zone) && input.proposal.proposedHomes === 1 && input.proposal.housingForm === 'detached' && !input.proposal.activities.some(item => ['additional_dwelling', 'mixed_use', 'other_uncertain'].includes(item))
    const missingInputs = input.proposal.proposedHomes === null || input.proposal.housingForm === 'unknown'
    checks.push(check('zoning-use', 'Bounded zoning use-table screen', supportedUse ? 'screened_low_friction' : missingInputs ? 'unknown' : 'unsupported', supportedUse ? `Mapped ${zone}; the published City use table lists one detached housing unit in R1D. This is a provisional use-table screen only, not project permission.` : `Mapped ${zone}; this proposal is outside the narrow one-detached-home R1D use-table screen or needs explicit form and unit inputs.`, at, ruleUrl, null, supportedUse ? { value: 2, max: 2, scope: `One detached home on a parcel wholly mapped ${zone}`, rule: 'Published City R1D use table lists one detached housing unit' } : null))
  }
  const oneHomeAssessmentPromise = assessOneHome(input.parcelId, input.proposal, zone ?? null, fetcher, at)
  checks.push(check('zoning-other', 'Other zoning requirements', 'unknown', 'Dimensional compliance, overlays, nonconformity and current City interpretation were not evaluated.', at, zoningLayer))

  const [slopeResult, floodResult] = await Promise.allSettled([
    spatial(slopeLayer, geometry, 'esriSpatialRelIntersects', 'objectid_1,slope25', fetcher),
    Promise.all([
      spatial(floodLayer, geometry, 'esriSpatialRelIntersects', 'OBJECTID,FLD_ZONE,ZONE_SUBTY,SFHA_TF', fetcher),
      spatial(floodLayer, geometry, 'esriSpatialRelWithin', 'OBJECTID,FLD_ZONE,ZONE_SUBTY,SFHA_TF', fetcher),
    ]),
  ])
  if (slopeResult.status === 'rejected') checks.push(check('slope', 'Mapped 25 percent slope', 'error', 'City slope layer did not return a complete result.', at, slopeLayer))
  else if (slopeResult.value.some(item => !['YES', 'NO'].includes(featureCode(item.slope25)))) checks.push(check('slope', 'Mapped 25 percent slope', 'unknown', 'Intersecting City slope feature has an unrecognized flag.', at, slopeLayer))
  else if (slopeResult.value.some(item => featureCode(item.slope25) === 'YES')) {
    const reason = input.proposal.groundDisturbance === 'yes'
      ? 'The parcel intersects mapped steep slope and proposed ground disturbance is yes, adding mapped site friction. A survey and work-location review remain needed.'
      : input.proposal.groundDisturbance === 'no'
        ? 'The parcel intersects mapped steep slope and proposed ground disturbance is no. The mapped condition still needs survey and work-location review.'
        : 'The parcel intersects mapped steep slope and proposed ground disturbance is unknown. A survey and work-location review remain needed.'
    checks.push(check('slope', 'Mapped 25 percent slope', 'mapped_flag', reason, at, slopeLayer))
  } else checks.push(check('slope', 'Mapped 25 percent slope', 'screened_low_friction', 'No City 25 percent slope feature was returned for the full parcel. This does not establish actual grade.', at, slopeLayer))

  if (floodResult.status === 'rejected') checks.push(check('flood', 'FEMA mapped flood zone', 'error', 'FEMA flood layer did not return a complete result.', at, floodLayer))
  else {
    const [zones, coveringZones] = floodResult.value
    if (!zones.length || zones.some(item => !featureCode(item.FLD_ZONE))) checks.push(check('flood', 'FEMA mapped flood zone', 'unknown', 'No interpretable FEMA zone returned; map coverage or panel must be checked.', at, floodLayer))
    else if (zones.some(item => /^(A|V)/.test(featureCode(item.FLD_ZONE)) && featureCode(item.SFHA_TF) && featureCode(item.SFHA_TF) !== 'T')) checks.push(check('flood', 'FEMA mapped flood zone', 'unknown', 'FEMA A/V zone and special flood hazard flag conflict in the returned feature. Confirm the effective panel and source attributes before scoring.', at, floodLayer))
    else if (zones.some(item => featureCode(item.SFHA_TF) === 'T' || /^(A|V)/.test(featureCode(item.FLD_ZONE)))) checks.push(check('flood', 'FEMA mapped flood zone', 'mapped_flag', 'FEMA maps a special flood hazard or A/V zone intersecting the parcel. Confirm panel and effective date.', at, floodLayer, null, zones.some(item => /^(A|V)/.test(featureCode(item.FLD_ZONE))) ? { value: 0, max: 2, scope: 'An explicit FEMA A/V hazard zone intersects the parcel', rule: 'Intersecting FEMA A/V zone is a mapped hazard flag' } : null))
    else if (zones.length === 1 && coveringZones.length === 1 && Number.isSafeInteger(zones[0].OBJECTID) && zones[0].OBJECTID > 0 && featureCode(zones[0].FLD_ZONE) === 'X' && featureCode(zones[0].ZONE_SUBTY) === 'AREA OF MINIMAL FLOOD HAZARD' && zones[0].OBJECTID === coveringZones[0].OBJECTID) checks.push(check('flood', 'FEMA mapped flood zone', 'screened_low_friction', 'One returned FEMA minimal-hazard zone contains the whole parcel. This is a map screen, not a flood determination.', at, floodLayer, null, { value: 2, max: 2, scope: 'One FEMA minimal-hazard X zone covers the whole parcel', rule: 'Whole-parcel FEMA X minimal-hazard map coverage' }))
    else checks.push(check('flood', 'FEMA mapped flood zone', 'unknown', 'Returned FEMA zone details require panel review before scoring.', at, floodLayer))
  }
  const sourceObservations = await sourceObservationsPromise
  const mapped = id => sourceObservations.find(item => item.id === id)
  const undermining = mapped('mapped-undermining')
  checks.push(check('undermining', 'Mapped undermining', undermining.status === 'mapped_flag' ? 'mapped_flag' : undermining.status === 'error' ? 'error' : 'unknown', underminingReason(undermining.status), at, undermining.sourceUrl))
  checks.push(check('process', 'Proposal review path', 'unknown', 'The parcel-specific review path and required permits for this work combination have not been confirmed.', at))
  checks.push(check('infrastructure', 'Infrastructure and access', 'unknown', 'Parcel-specific utility capacity and access have not been confirmed.', at))
  if (checks.some(item => item.id === 'slope' && item.status === 'mapped_flag')) actions.push('Review the mapped slope and proposed disturbance with a surveyor and the City.')
  if (checks.some(item => item.id === 'flood' && item.status === 'mapped_flag')) actions.push('Confirm the FEMA panel and applicable flood requirements with the local floodplain administrator.')
  if (undermining.status === 'mapped_flag') actions.push('Review mapped undermining and site conditions with a qualified professional and the City.')
  if (mapped('mapped-landslide').status === 'mapped_flag') actions.push('Review mapped landslide-prone area and proposed ground work with a qualified professional and the City.')
  if (sourceObservations.some(item => !['mapped-undermining', 'mapped-landslide'].includes(item.id) && item.coverage === 'mapped_intersection_only' && item.status === 'mapped_flag')) actions.push('Confirm mapped City overlays and their current applicability to this proposal.')
  if (mapped('pli-permits').status === 'available') actions.push('Review matching historical permit records with the City for relevance to the proposed work and lawful baseline.')
  const oneHomeAssessment = await oneHomeAssessmentPromise
  if (oneHomeAssessment.applicability === 'applicable') actions.push(...oneHomeAssessment.nextActions)
  else {
    actions.push('Review zoning overlays, dimensions, lawful baseline and applicable City process for this proposal.')
    actions.push('Confirm utility capacity and access with the relevant providers before relying on development feasibility.')
  }
  actions.push('Establish project budget, rents or sales assumptions, and funding path; financial feasibility is unassessed.')
  return pending(input, checks, 'Pittsburgh', actions, at, sourceObservations, oneHomeAssessment)
}
import { collectSourceObservations } from './observations.mjs'
import { assessOneHome } from './one-home.mjs'
