const chasLayer = 'https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/ACS_5YR_CHAS_Estimate_Data_by_County/FeatureServer/4'

function result(status, retrievedAt, summary, records = []) {
  return {
    catalogId: 20,
    status,
    coverage: { geography: 'county', matchMethod: 'exact_county_fips' },
    sourceUrl: chasLayer,
    sourceDate: '2013-2017',
    retrievedAt,
    records,
    summary,
  }
}

async function boundedJson(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000) })
  if (response.status !== 200 || !response.body || Number(response.headers.get('content-length')) > 16_384) throw Error('chas_response_unavailable')
  const reader = response.body.getReader()
  const parts = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > 16_384) { await reader.cancel(); throw Error('chas_response_too_large') }
    parts.push(part.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

export async function queryHudSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  if (catalogId !== 20) return null
  const retrievedAt = now()
  const countyFips = context.countyFips
  if (!/^\d{5}$/.test(countyFips ?? '') || Object.keys(context).some(key => key !== 'countyFips')) return result('needs_input', retrievedAt, 'Provide only an exact five-digit county FIPS. This layer covers 2013-2017 only; a single requested year cannot select another CHAS vintage.')
  const url = new URL(`${chasLayer}/query`)
  url.searchParams.set('where', `GEOID='${countyFips}'`)
  url.searchParams.set('outFields', 'GEOID,NAME,T2_EST1,T8_EST69')
  url.searchParams.set('returnGeometry', 'false')
  url.searchParams.set('f', 'json')
  try {
    const payload = await boundedJson(url, fetcher)
    if (!payload || payload.error || !Array.isArray(payload.features) || payload.exceededTransferLimit || payload.features.length > 1) throw Error('invalid_chas_payload')
    if (!payload.features.length) return result('empty', retrievedAt, 'The 2013-2017 HUD county CHAS layer returned no exact county match. This does not establish that housing need is absent.')
    const attributes = payload.features[0]?.attributes
    if (!attributes || attributes.GEOID !== countyFips || typeof attributes.NAME !== 'string' || !attributes.NAME || attributes.NAME.length > 100) throw Error('invalid_chas_county')
    const values = [attributes.T2_EST1, attributes.T8_EST69]
    if (values.some(value => value === null || value === undefined)) return result('incomplete', retrievedAt, 'A selected 2013-2017 CHAS count is missing or suppressed. No household count is reported.')
    if (values.some(value => !Number.isSafeInteger(value) || value < 0)) throw Error('invalid_chas_count')
    return result('available', retrievedAt, 'Historical 2013-2017 county CHAS special-tabulation counts. T2_EST1 is occupied housing units; T8_EST69 is renter households at or below 30% of HUD area median family income. Counts describe the county, not this parcel or project, and newer CHAS vintages exist.', [{ countyFips, countyName: attributes.NAME, occupiedHousingUnits: values[0], renterHouseholdsAtOrBelow30PercentHamfi: values[1] }])
  } catch {
    return result('error', retrievedAt, 'The bounded HUD county CHAS response could not be retrieved or validated. No household count is reported.')
  }
}
