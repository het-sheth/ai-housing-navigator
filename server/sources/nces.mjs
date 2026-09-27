const layer = 'https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2324/MapServer/0'
const vintage = '2023-2024'

function envelope(status, geography, matchMethod, sourceUrl, retrievedAt, summary, records = []) {
  return { catalogId: 54, status, coverage: { geography, matchMethod }, sourceUrl, sourceDate: records.length ? vintage : null, retrievedAt, records, summary }
}

async function boundedJson(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok || !response.body) throw Error('source_http_error')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > 262_144) { await reader.cancel(); throw Error('source_too_large') }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (value?.error) throw Error('source_application_error')
  return value
}

function queryUrl(params) {
  const url = new URL(layer + '/query')
  for (const [key, value] of Object.entries({ ...params, f: 'json' })) url.searchParams.set(key, String(value))
  return url.toString()
}

export async function queryNcesSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  if (catalogId !== 54) return null
  const retrievedAt = now()
  const county = context?.countyFips
  const state = context?.stateFips
  const point = Number.isFinite(context?.latitude) && Number.isFinite(context?.longitude) && context.latitude >= 24 && context.latitude <= 50 && context.longitude >= -125 && context.longitude <= -66
  if (county && state && county.slice(0, 2) !== state) return envelope('incomplete', 'county', 'exact_county_fips', layer, retrievedAt, 'Supplied county and state FIPS conflict. No school records were attached.')
  let where
  let geography
  let matchMethod
  const extras = {}
  if (/^\d{5}$/.test(county ?? '')) { where = `CNTY='${county}'`; geography = 'county'; matchMethod = 'exact_county_fips' }
  else if (point) {
    where = /^\d{2}$/.test(state ?? '') ? `STFIP='${state}'` : '1=1'
    geography = '3-kilometer radius around supplied point'
    matchMethod = 'point_radius_3000m'
    Object.assign(extras, { geometry: `${context.longitude},${context.latitude}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', distance: '3000', units: 'esriSRUnit_Meter' })
  } else if (/^\d{2}$/.test(state ?? '')) { where = `STFIP='${state}'`; geography = 'state'; matchMethod = 'exact_state_fips' }
  else return envelope('needs_input', 'school locations', 'explicit_county_state_or_point', layer, retrievedAt, 'Provide an exact five-digit county FIPS, two-digit state FIPS, or a valid latitude and longitude. A parcel ID alone does not identify nearby schools.')
  const countUrl = queryUrl({ where, ...extras, returnCountOnly: 'true' })
  try {
    const countResult = await boundedJson(countUrl, fetcher)
    if (!Number.isSafeInteger(countResult?.count) || countResult.count < 0) throw Error('invalid_count')
    if (countResult.exceededTransferLimit === true) return envelope('incomplete', geography, matchMethod, countUrl, retrievedAt, 'The NCES count response indicated a transfer limit, so school coverage could not be established.')
    const countRecord = { ...(county ? { countyFips: county } : state ? { stateFips: state } : {}), schoolCount: countResult.count }
    if (!countResult.count) return envelope('empty', geography, matchMethod, countUrl, retrievedAt, 'No 2023-24 public school location matched this supplied geography. This does not establish school assignment.', [countRecord])
    const recordsUrl = queryUrl({ where, ...extras, outFields: 'NCESSCH,NAME,CNTY,STFIP,CITY,SCHOOLYEAR', returnGeometry: 'false', orderByFields: 'NCESSCH ASC', resultRecordCount: '19' })
    const data = await boundedJson(recordsUrl, fetcher)
    if (!Array.isArray(data?.features) || !data.features.length || data.features.length > 19 || data.features.length > countResult.count) throw Error('invalid_features')
    const schools = data.features.map(feature => {
      const attributes = feature?.attributes
      if (!/^\d{12}$/.test(attributes?.NCESSCH ?? '') || typeof attributes?.NAME !== 'string' || !attributes.NAME.trim() || typeof attributes?.CITY !== 'string' || attributes.SCHOOLYEAR !== vintage || county && attributes.CNTY !== county || state && attributes.STFIP !== state) throw Error('invalid_school')
      return { schoolId: attributes.NCESSCH, name: attributes.NAME.slice(0, 100), city: attributes.CITY.slice(0, 80) }
    })
    if (new Set(schools.map(school => school.schoolId)).size !== schools.length) throw Error('duplicate_school')
    const incomplete = countResult.count > schools.length || data.exceededTransferLimit === true
    return envelope(incomplete ? 'incomplete' : 'available', geography, matchMethod, recordsUrl, retrievedAt, `NCES EDGE ${vintage} public school locations: ${countResult.count} matched. ${incomplete ? 'Only the first 19 institution records are shown. ' : ''}Locations do not establish attendance boundaries, school assignment, or parcel feasibility.`, [countRecord, ...schools])
  } catch {
    return envelope('error', geography, matchMethod, countUrl, retrievedAt, 'The NCES public school layer did not return a complete, validated bounded response.')
  }
}
