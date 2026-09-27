const datastore = 'https://data.wprdc.org/api/3/action/datastore_search'
const permitResource = 'f4d1177a-f597-4c32-8cbf-7885f56253f6'
const permitSource = 'https://data.wprdc.org/dataset/pli-permits'
const cityLayers = [
  ['mapped-undermining', 'PGHWebUndermined'],
  ['mapped-landslide', 'PGHWebLandslideProne'],
  ['riparian-stormwater', 'Stormwater_Riparian_Buffers'],
  ['riparian-river', 'RIV_Riparian_Buffers'],
  ['historic-district', 'PGHWebCHDHistoricDistricts'],
  ['historic-property', 'PGHWEBCHDIndividialProperties'],
  ['inclusionary-housing', 'InclusionaryHousingOverlayDistrict'],
  ['baum-centre-overlay', 'PGHWebBaumCentreOverlay'],
  ['north-side-parking', 'PGHWEBNorthSideCommercialParkingOverlay'],
  ['parking-reduction', 'PGHWebParkingReductionOverlay'],
  ['major-transit-buffer', 'PGHWebMajorTransitBuffer'],
  ['height-reduction', 'HeightReductionZone_ZoningOverlay'],
  ['riverfront-height', 'PGHZoningRiverfrontHeightOverlay'],
]

async function requestJson(url, fetcher, deadline) {
  const response = await fetcher(url, { signal: AbortSignal.any([AbortSignal.timeout(5000), deadline]) })
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
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (data?.error) throw Error('source_application_error')
  return data
}

async function permitObservation(parcelId, fetcher, retrievedAt, deadline) {
  const base = { id: 'pli-permits', coverage: 'exact_parcel_record_search', sourceUrl: permitSource, sourceDate: null, retrievedAt }
  try {
    const url = new URL(datastore)
    url.searchParams.set('resource_id', permitResource)
    url.searchParams.set('filters', JSON.stringify({ parcel_num: parcelId }))
    url.searchParams.set('fields', 'parcel_num,permit_id,permit_type,work_type,issue_date,status')
    url.searchParams.set('limit', '100')
    const data = await requestJson(url.toString(), fetcher, deadline)
    const result = data?.result
    if (data?.success !== true || !Number.isSafeInteger(result?.total) || result.total < 0 || !Array.isArray(result.records) || result.records.length > 100 || result.records.length > result.total || result.records.some(row => row?.parcel_num !== parcelId)) throw Error('invalid_permits')
    if (result.total > result.records.length) return { ...base, status: 'incomplete', count: null, summary: 'The exact-parcel permit search returned an incomplete page. Confirm permit history in City records.' }
    return { ...base, status: result.total ? 'available' : 'empty', count: result.total, summary: result.total ? 'Matching City permit records were returned. Historical permits do not establish the current review path or lawful use.' : 'The exact-parcel City permit search returned no records. Other permit history or requirements may still exist.' }
  } catch {
    return { ...base, status: 'error', count: null, summary: 'City permit records could not be checked.' }
  }
}

async function mappedObservation(id, layerName, geometry, fetcher, retrievedAt, deadline) {
  const sourceUrl = `https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/${layerName}/FeatureServer/0`
  const base = { id, coverage: 'mapped_intersection_only', sourceUrl, sourceDate: null, retrievedAt }
  try {
    const url = new URL(`${sourceUrl}/query`)
    const hazardField = id === 'mapped-undermining' ? 'undermined' : id === 'mapped-landslide' ? 'landslideprone' : null
    const query = { where: '1=1', geometry: JSON.stringify(geometry), geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', returnGeometry: 'false', f: 'json' }
    if (hazardField) query.outFields = `objectid,${hazardField}`
    else query.returnCountOnly = 'true'
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    const data = await requestJson(url.toString(), fetcher, deadline)
    if (hazardField) {
      if (!Array.isArray(data?.features) || data.exceededTransferLimit || data.features.length > 100 || data.features.some(feature => !Number.isSafeInteger(feature?.attributes?.objectid) || feature.attributes.objectid < 1)) throw Error('invalid_hazard_features')
      const flags = data.features.map(feature => typeof feature.attributes[hazardField] === 'string' ? feature.attributes[hazardField].trim().toUpperCase() : '')
      if (flags.some(flag => flag === 'YES')) return { ...base, status: 'mapped_flag', count: flags.length, summary: flags.some(flag => !['YES', 'NO'].includes(flag)) ? 'At least one intersecting City map feature carries a Yes flag; other returned flags are unrecognized. Confirm map accuracy and site conditions with a qualified professional.' : 'At least one intersecting or touching City map feature carries a Yes flag. Confirm map accuracy and site conditions with a qualified professional.' }
      if (flags.some(flag => !['YES', 'NO'].includes(flag))) return { ...base, status: 'unknown', count: flags.length, summary: 'Intersecting City map features include an unrecognized hazard flag. Verify the layer and site conditions.' }
      return { ...base, status: flags.length ? 'mapped_no_flag' : 'no_intersection', count: flags.length, summary: flags.length ? 'Intersecting City map features carry No flags. This is not a site safety clearance.' : 'No intersecting feature was returned from this map layer. This does not clear site risk.' }
    }
    if (data?.exceededTransferLimit || !Number.isSafeInteger(data?.count) || data.count < 0) throw Error('invalid_map_count')
    return { ...base, status: data.count ? 'mapped_flag' : 'no_intersection', count: data.count, summary: data.count ? 'The parcel intersects or touches a mapped feature. Confirm the current layer and project-specific requirements with the City.' : 'No intersecting feature was returned from this map layer. This does not clear site or regulatory risk.' }
  } catch {
    return { ...base, status: 'error', count: null, summary: 'The City map layer could not be checked.' }
  }
}

export async function collectSourceObservations(parcelId, geometry, fetcher, retrievedAt) {
  const deadline = AbortSignal.timeout(10000)
  const tasks = [() => permitObservation(parcelId, fetcher, retrievedAt, deadline), ...cityLayers.map(([id, layer]) => () => mappedObservation(id, layer, geometry, fetcher, retrievedAt, deadline))]
  const observations = new Array(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const index = next++
      observations[index] = await tasks[index]()
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return observations
}
