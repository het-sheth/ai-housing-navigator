const tractLayer = 'https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/Tracts_Blocks/MapServer/0'
const trafficLayer = 'https://gis.penndot.gov/arcgis/rest/services/opendata/roadwaytraffic/MapServer/0'
const elevationEndpoint = 'https://epqs.nationalmap.gov/v1/json'
const amlLayer = 'https://gis.dep.pa.gov/depgisprd/rest/services/emappa/eMapPA_External/FeatureServer/36'
const nlcdLayer = 'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover/ImageServer'

const documents = new Map([
  [10, ['https://ecode360.com/45474054', 'Pittsburgh Title 9 Zoning Code', 'City of Pittsburgh', 'legal text']],
  [11, ['https://www.pittsburghpa.gov/Training/DCP-BC-Archive/Zoning-Board-of-Adjustment', 'Pittsburgh Zoning Board archive', 'City of Pittsburgh', 'decision index']],
  [12, ['https://www.generalcode.com/text-library/?clbc=true', 'Pennsylvania municipal code library', 'Pennsylvania municipalities', 'code index']],
  [16, ['https://www.alleghenycounty.us/Services/Housing/Housing-Needs-Assessment', 'Allegheny County Housing Needs Assessment', 'Allegheny County', 'report']],
  [33, ['https://www.openstreetmap.org/', 'OpenStreetMap', 'Global', 'map data portal']],
  [34, ['https://openaddresses.io/', 'OpenAddresses', 'Global', 'bulk address portal']],
  [35, ['https://www.pasda.psu.edu/', 'Pennsylvania Spatial Data Access', 'Pennsylvania', 'data portal']],
  [37, ['https://www.pasda.psu.edu/uci/SearchResults.aspx?Keyword=Allegheny%20County%20Imagery', 'Allegheny County orthoimagery search', 'Allegheny County', 'imagery catalog']],
])
const documentLinkTerms = new Map([
  [10, /zoning|chapter|section|title 9/i], [11, /zba|zoning|appeal/i],
  [12, /municipal|code|ordinance/i],
  [33, /map|data/i], [34, /address|download|data/i],
  [35, /catalog|dataset|data/i], [37, /imagery|ortho/i],
])
const owned = new Set([...documents.keys(), 19, 32, 36, 39, 43])
const landCoverLabels = new Map([
  [11, 'Open water'], [12, 'Perennial ice or snow'], [21, 'Developed open space'],
  [22, 'Developed low intensity'], [23, 'Developed medium intensity'], [24, 'Developed high intensity'],
  [31, 'Barren land'], [41, 'Deciduous forest'], [42, 'Evergreen forest'], [43, 'Mixed forest'],
  [52, 'Shrub or scrub'], [71, 'Grassland or herbaceous'], [81, 'Pasture or hay'],
  [82, 'Cultivated crops'], [90, 'Woody wetlands'], [95, 'Emergent herbaceous wetlands'],
])

function shape(catalogId, status, geography, matchMethod, sourceUrl, retrievedAt, summary, records = [], sourceDate = null) {
  return { catalogId, status, coverage: { geography, matchMethod }, sourceUrl, sourceDate, retrievedAt, records, summary }
}

function withParams(base, params) {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  return url.toString()
}

function validPoint(context, broadPaBounds = false) {
  const latitude = context?.latitude
  const longitude = context?.longitude
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (broadPaBounds && (latitude < 39.5 || latitude > 42.5 || longitude < -80.7 || longitude > -74.5)) return null
  if (latitude < 24 || latitude > 50 || longitude < -125 || longitude > -66) return null
  return { latitude, longitude }
}

async function boundedJson(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw Error('source_http_error')
  const reader = response.body?.getReader()
  if (!reader) throw Error('source_empty_body')
  const chunks = []
  let length = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > 1_000_000) {
      await reader.cancel()
      throw Error('source_too_large')
    }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (!data || typeof data !== 'object' || data.error) throw Error('source_application_error')
  return data
}

async function boundedDocument(url, fetcher) {
  const response = await fetcher(url, { method: 'GET', headers: { Range: 'bytes=0-131071', Accept: 'text/html,text/plain' }, signal: AbortSignal.timeout(8000) })
  if (response.status === 404 || response.status === 410) return { status: 'unavailable' }
  if (!response.ok) return { status: 'error' }
  if (!/^(text\/html|text\/plain)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) return { status: 'incomplete' }
  const reader = response.body?.getReader()
  if (!reader) return { status: 'incomplete' }
  const chunks = []
  let length = 0
  let complete = false
  while (length < 131_072) {
    const part = await reader.read()
    if (part.done) { complete = true; break }
    const allowed = Math.min(part.value.byteLength, 131_072 - length)
    chunks.push(part.value.subarray(0, allowed))
    length += allowed
    if (allowed < part.value.byteLength) break
  }
  if (!complete) await reader.cancel()
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return { status: 'available', html: new TextDecoder('utf-8', { fatal: true }).decode(bytes), complete: complete && response.status !== 206 }
}

function cleanHtmlText(value, limit) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi, entity => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' })[entity.toLowerCase()] ?? ' ').replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Math.min(Number(digits), 0x10ffff))).replace(/\s+/g, ' ').trim().slice(0, limit)
}

function documentMetadata(catalogId, html, url, fallbackTitle) {
  const title = cleanHtmlText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? fallbackTitle, 160)
  const meta = html.match(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])(?=[^>]*\bcontent\s*=\s*["']([^"']*)["'])[^>]*>/i)
  const description = meta ? cleanHtmlText(meta[1], 300) : ''
  const link = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].find(([, href, label]) => {
    if (!documentLinkTerms.get(catalogId)?.test(cleanHtmlText(label, 100))) return false
    try { const target = new URL(href, url); return target.protocol === 'https:' && target.hostname === new URL(url).hostname && target.pathname !== new URL(url).pathname && !/(contact|login|sign.?in)/i.test(target.pathname) } catch { return false }
  })
  const sectionUrl = link ? new URL(link[1], url).toString() : null
  return { kind: 'public_document', title, ...(description ? { description } : {}), ...(sectionUrl ? { sectionUrl } : {}) }
}

async function documentIndex(catalogId, fetcher, retrievedAt) {
  const [url, title, geography, kind] = documents.get(catalogId)
  const reply = (status, summary, records = []) => shape(catalogId, status, geography, 'public document or catalog index only', url, retrievedAt, summary, records)
  try {
    await Promise.resolve().then(() => fetcher(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })).catch(() => null)
    const page = await boundedDocument(url, fetcher)
    if (page.status === 'unavailable') return reply('unavailable', 'The catalog target for ' + title + ' is unavailable. No source document or site observation was retrieved.')
    if (page.status === 'error') return reply('error', 'The ' + title + ' page denied or failed a bounded GET. No site observation was retrieved.')
    if (page.status === 'incomplete') return reply('incomplete', 'The ' + title + ' page did not return bounded public text metadata.')
    const metadata = documentMetadata(catalogId, page.html, url, title)
    return reply(page.complete ? 'available' : 'incomplete', title + ' returned public ' + kind + ' metadata. This is not a parcel observation or permission finding.', [metadata])
  } catch {
    return reply('error', 'The ' + title + ' page could not be read within the bounded request.')
  }
}

async function tract(context, fetcher, retrievedAt) {
  const reply = (status, url, summary, records = []) => shape(19, status, 'United States, 2020 Census tracts', 'exact 11-digit tract GEOID', url, retrievedAt, summary, records, status === 'available' ? '2020' : null)
  if (!/^\d{11}$/.test(context?.tract ?? '')) return reply('needs_input', tractLayer, 'An 11-digit Census tract GEOID is needed. A parcel ID is not a tract.')
  if (context.countyFips && !context.tract.startsWith(context.countyFips)) return reply('incomplete', tractLayer, 'The supplied tract and county FIPS conflict. No tract observation was attached to this site.')
  if (context.stateFips && !context.tract.startsWith(context.stateFips)) return reply('incomplete', tractLayer, 'The supplied tract and state FIPS conflict. No tract observation was attached to this site.')
  const url = withParams(tractLayer + '/query', { where: "GEOID='" + context.tract + "'", outFields: 'GEOID,NAME,POP100,HU100', returnGeometry: 'false', f: 'json' })
  try {
    const data = await boundedJson(url, fetcher)
    if (!Array.isArray(data.features) || data.exceededTransferLimit || data.features.length > 1) return reply('incomplete', url, 'The exact tract response was incomplete or ambiguous.')
    if (!data.features.length) return reply('empty', url, 'No 2020 Census tract matched the supplied GEOID.')
    const fields = data.features[0]?.attributes
    if (fields?.GEOID !== context.tract || !Number.isSafeInteger(fields.POP100) || !Number.isSafeInteger(fields.HU100) || fields.POP100 < 0 || fields.HU100 < 0) return reply('incomplete', url, 'The tract response lacked validated 2020 population or housing-unit fields.')
    return reply('available', url, 'Matching 2020 Census tract counts are context, not parcel feasibility.', [{ tract: context.tract, population2020: fields.POP100, housingUnits2020: fields.HU100 }])
  } catch {
    return reply('error', url, 'The Census tract layer could not be checked.')
  }
}

async function nearbyCount(catalogId, context, fetcher, retrievedAt) {
  const traffic = catalogId === 32
  const layer = traffic ? trafficLayer : amlLayer
  const radiusMeters = traffic ? 100 : 250
  const geography = traffic ? 'PennDOT roadway layer near supplied point; point state not verified' : 'PA DEP abandoned mine land layer near supplied point; point state not verified'
  const reply = (status, url, summary, records = []) => shape(catalogId, status, geography, String(radiusMeters) + '-meter radius around supplied point', url, retrievedAt, summary, records)
  const site = validPoint(context, true)
  if (!site) return reply('needs_input', layer, 'A latitude and longitude within the broad source-region bounds are required. These bounds do not verify Pennsylvania jurisdiction.')
  const url = withParams(layer + '/query', { where: '1=1', geometry: String(site.longitude) + ',' + String(site.latitude), geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', distance: radiusMeters, units: 'esriSRUnit_Meter', returnCountOnly: 'true', f: 'json' })
  try {
    const data = await boundedJson(url, fetcher)
    if (!Number.isSafeInteger(data.count) || data.count < 0 || data.exceededTransferLimit === true) return reply('incomplete', url, 'The map layer did not return a complete bounded feature count.')
    if (traffic) return reply(data.count ? 'available' : 'incomplete', url, data.count ? 'Nearby PennDOT traffic segments are point context, not proof of road access or capacity.' : 'No nearby traffic segment was returned, but point jurisdiction and provider coverage are not verified; road access remains unassessed.', [{ nearbyTrafficSegments: data.count, radiusMeters }])
    return reply(data.count ? 'available' : 'incomplete', url, data.count ? 'Nearby mapped abandoned mine land points are context, not a site condition finding.' : 'No nearby abandoned mine land point was returned, but point jurisdiction and provider coverage are not verified; site risk remains unassessed.', [{ nearbyAmlPointFeatures: data.count, radiusMeters }])
  } catch {
    return reply('error', url, 'The bounded public map query could not be completed.')
  }
}

async function elevation(context, fetcher, retrievedAt) {
  const reply = (status, url, summary, records = []) => shape(36, status, 'United States elevation at supplied point', 'single coordinate sample', url, retrievedAt, summary, records)
  const site = validPoint(context)
  if (!site) return reply('needs_input', elevationEndpoint, 'A valid latitude and longitude are required for one elevation point.')
  const url = withParams(elevationEndpoint, { x: site.longitude, y: site.latitude, units: 'Meters', output: 'json' })
  try {
    const data = await boundedJson(url, fetcher)
    const value = typeof data.value === 'string' && data.value.trim() ? Number(data.value) : data.value
    if (!Number.isFinite(value) || value < -500 || value > 9000) return reply('incomplete', url, 'The elevation service did not return a valid meter value.')
    return reply('available', url, 'USGS elevation in meters at one point is not a parcel slope or buildable-area finding.', [{ elevationMeters: value }])
  } catch {
    return reply('error', url, 'The USGS elevation point service could not be checked.')
  }
}

async function landCover(context, fetcher, retrievedAt) {
  const reply = (status, url, summary, records = [], sourceDate = null) => shape(43, status, 'Contiguous United States land cover at supplied point', 'single 30-meter raster pixel', url, retrievedAt, summary, records, sourceDate)
  const site = validPoint(context)
  if (!site) return reply('needs_input', nlcdLayer, 'A valid latitude and longitude are required for a land-cover pixel.')
  const geometry = JSON.stringify({ x: site.longitude, y: site.latitude, spatialReference: { wkid: 4326 } })
  const url = withParams(nlcdLayer + '/identify', { geometry, geometryType: 'esriGeometryPoint', returnGeometry: 'false', returnCatalogItems: 'true', maxItemCount: '1', f: 'json' })
  try {
    const data = await boundedJson(url, fetcher)
    const code = Number(data.value)
    const year = data.catalogItems?.features?.[0]?.attributes?.Year
    if (!Number.isSafeInteger(code) || !landCoverLabels.has(code) || !Number.isSafeInteger(year) || year < 1985 || year > 2100) return reply('incomplete', url, 'The image service did not return a recognized class and annual vintage.')
    return reply('available', url, 'One annual NLCD pixel is context, not a parcel-wide condition or development permission.', [{ year, classCode: code, classLabel: landCoverLabels.get(code), pixelSizeMeters: 30 }], String(year))
  } catch {
    return reply('error', url, 'The NLCD point sample could not be checked.')
  }
}

export async function querySpatialReferenceSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  if (!owned.has(catalogId)) return null
  const retrievedAt = now()
  if (catalogId === 19) return tract(context, fetcher, retrievedAt)
  if (catalogId === 32 || catalogId === 39) return nearbyCount(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 36) return elevation(context, fetcher, retrievedAt)
  if (catalogId === 43) return landCover(context, fetcher, retrievedAt)
  return documentIndex(catalogId, fetcher, retrievedAt)
}
