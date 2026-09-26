const datastore = 'https://data.wprdc.org/api/3/action/datastore_search'
const countyParcelLayer = 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0'
const assessmentResource = 'property_assessments_table'
const assessmentFields = 'PARID,PROPERTYHOUSENUM,PROPERTYFRACTION,PROPERTYADDRESS,PROPERTYCITY,PROPERTYSTATE,PROPERTYZIP,MUNICODE,MUNIDESC,CLASSDESC,USEDESC,LOTAREA,YEARBLT,ASOFDATE'
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }

function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
function stamp(now) { return now() }
function identifier(value) { return typeof value === 'string' && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9 -]+$/.test(value) }
function sourceDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

async function requestJson(url, fetcher, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetcher(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error('source_http_error')
    const body = await response.text()
    if (body.length > 2_000_000) throw new Error('source_response_too_large')
    return JSON.parse(body)
  } finally { clearTimeout(timer) }
}

async function rows(resource, filters, fields, limit, fetcher) {
  const url = new URL(datastore)
  url.searchParams.set('resource_id', resource)
  url.searchParams.set('filters', JSON.stringify(filters))
  url.searchParams.set('fields', fields)
  url.searchParams.set('limit', String(limit))
  const body = await requestJson(url.toString(), fetcher)
  if (body?.success !== true || !Array.isArray(body?.result?.records) || !Number.isSafeInteger(body?.result?.total)) throw new Error('source_invalid_response')
  return body.result
}

function candidate(row) {
  if (!identifier(row?.PARID)) throw new Error('source_invalid_identifier')
  return {
    parcelId: row.PARID,
    address: [row.PROPERTYHOUSENUM, row.PROPERTYFRACTION, row.PROPERTYADDRESS].filter(value => typeof value === 'string' && value.trim()).join(' ').replace(/\s+/g, ' ').trim(),
    city: typeof row.PROPERTYCITY === 'string' ? row.PROPERTYCITY : null,
    municipality: typeof row.MUNIDESC === 'string' ? row.MUNIDESC : null,
    zip: typeof row.PROPERTYZIP === 'string' ? row.PROPERTYZIP : null,
  }
}

function validGeometry(geometry) {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return false
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return Array.isArray(polygons) && polygons.length > 0 && polygons.every(polygon => Array.isArray(polygon) && polygon.length > 0 && polygon.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.every(point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[0] > -81 && point[0] < -79 && point[1] > 39 && point[1] < 41) && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] && new Set(ring.map(point => `${point[0]},${point[1]}`)).size >= 3))
}

async function countyBoundary(pin, fetcher) {
  const url = new URL(`${countyParcelLayer}/query`)
  url.searchParams.set('where', `PIN='${pin}'`)
  url.searchParams.set('outFields', 'PIN,MAPBLOCKLOT,MODIFIEDON')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('outSR', '4326')
  url.searchParams.set('f', 'geojson')
  const body = await requestJson(url.toString(), fetcher)
  if (body?.error || body?.type !== 'FeatureCollection' || !Array.isArray(body.features) || body.features.length > 1 || body.exceededTransferLimit) throw new Error('boundary_invalid_response')
  if (!body.features.length) return null
  const feature = body.features[0]
  if (feature?.properties?.PIN !== pin || !validGeometry(feature.geometry)) throw new Error('boundary_invalid_geometry')
  return { geometry: feature.geometry, modifiedOn: typeof feature.properties.MODIFIEDON === 'string' ? feature.properties.MODIFIEDON : null }
}

async function search(query, fetcher, now) {
  const value = query.trim().replace(/\s+/g, ' ')
  if (!value || value.length > 100) return json({ status: 'invalid_query', candidates: [], retrievedAt: stamp(now) }, 400)
  let filters
  if (identifier(value) && !value.includes(' ')) filters = { PARID: value }
  else {
    const match = /^(\d+[A-Za-z]?)\s+(.+)$/.exec(value)
    if (!match) return json({ status: 'invalid_query', candidates: [], retrievedAt: stamp(now) }, 400)
    filters = { PROPERTYHOUSENUM: match[1].toUpperCase(), PROPERTYADDRESS: match[2].toUpperCase() }
  }
  try {
    const result = await rows(assessmentResource, filters, assessmentFields, 21, fetcher)
    if (result.records.some(row => Object.entries(filters).some(([key, expected]) => typeof row[key] !== 'string' || row[key].trim().toUpperCase() !== expected))) throw new Error('source_mismatched_row')
    const candidates = result.records.slice(0, 20).map(candidate)
    return json({ status: candidates.length ? 'candidates' : 'no_match', candidates, truncated: result.total > 20, retrievedAt: stamp(now), source: 'Allegheny County property assessments via WPRDC', sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', sourceDate: null })
  } catch { return json({ status: 'error', candidates: [], retrievedAt: stamp(now), message: 'Property search is unavailable. Try again or enter a parcel ID.' }, 502) }
}

async function parcel(pin, fetcher, now) {
  if (!identifier(pin)) return json({ error: 'invalid_parcel_id' }, 400)
  const retrievedAt = stamp(now)
  const assessment = { status: 'unavailable', sourceDate: null, retrievedAt, sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', record: null }
  const boundary = { status: 'unavailable', sourceDate: null, retrievedAt, sourceUrl: countyParcelLayer, geometry: null, sourceCrs: 'EPSG:2272', displayCrs: 'EPSG:4326', modifiedOn: null }
  const [assessmentResult, boundaryResult] = await Promise.allSettled([
    rows(assessmentResource, { PARID: pin }, assessmentFields, 2, fetcher),
    countyBoundary(pin, fetcher),
  ])
  if (assessmentResult.status === 'rejected') assessment.status = 'error'
  else {
    const found = assessmentResult.value
    if (found.total > 1 || found.records.some(row => row.PARID !== pin)) assessment.status = 'error'
    else if (found.total === 1 && found.records.length === 1) {
      const row = found.records[0]
      assessment.status = 'available'
      assessment.sourceDate = sourceDate(row.ASOFDATE)
      assessment.record = { ...candidate(row), classification: typeof row.CLASSDESC === 'string' ? row.CLASSDESC : null, useDescription: typeof row.USEDESC === 'string' ? row.USEDESC : null, lotAreaSqFt: typeof row.LOTAREA === 'number' && Number.isFinite(row.LOTAREA) ? row.LOTAREA : null, yearBuilt: Number.isSafeInteger(row.YEARBLT) ? row.YEARBLT : null }
    }
  }
  if (boundaryResult.status === 'rejected') boundary.status = 'error'
  else {
    const found = boundaryResult.value
    if (found) { boundary.geometry = found.geometry; boundary.modifiedOn = found.modifiedOn; boundary.status = 'available' }
  }
  return json({ parcelId: pin, assessment, boundary })
}

export function handleProperty(request, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  const url = new URL(request.url)
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  if (url.pathname === '/api/property/search') return search(url.searchParams.get('q') ?? '', fetcher, now)
  if (url.pathname === '/api/property/parcel') return parcel(url.searchParams.get('pin') ?? '', fetcher, now)
  return json({ error: 'not_found' }, 404)
}
