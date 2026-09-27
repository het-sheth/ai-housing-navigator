import { exactParcel, spatial } from '../screening/run.mjs'

const parcelLayer = 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0'
const municipalityLayer = 'https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0'
const zoningLayer = 'https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0'
const floodLayer = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28'
const slopeLayer = 'https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebSlope25/FeatureServer/0'
const underminingLayer = 'https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebUndermined/FeatureServer/0'
const portal = 'https://onestoppgh.pittsburghpa.gov/'
const sourceUrls = { 3: parcelLayer, 4: municipalityLayer, 9: zoningLayer, 13: portal, 38: floodLayer, 40: slopeLayer, 41: underminingLayer }

function base(catalogId, sourceUrl, retrievedAt) {
  return { catalogId, status: 'needs_input', coverage: { geography: 'parcel', matchMethod: 'whole_parcel_polygon' }, sourceUrl, sourceDate: null, retrievedAt, records: [], summary: 'Provide an exact parcelId for this mapped source query.' }
}

function sameFeature(a, b, idField) {
  return a.length === 1 && b.length === 1 && Number.isSafeInteger(a[0][idField]) && a[0][idField] === b[0][idField]
}

export async function queryCoreSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  const sourceUrl = sourceUrls[catalogId]
  if (!sourceUrl) return null
  const result = base(catalogId, sourceUrl, now())
  if (catalogId === 13) return { ...result, status: 'unsupported', coverage: { geography: 'city', matchMethod: 'public_portal_reference' }, summary: 'OneStopPGH is a public portal; an authenticated or stable machine-readable records API and exact parcel join have not been verified.' }
  if (!context.parcelId) return result
  if ((context.countyFips && context.countyFips !== '42003') || (context.stateFips && context.stateFips !== '42')) return { ...result, summary: 'The supplied geography conflicts with the Allegheny County parcel source. Verify the parcel and location before querying.' }
  let geometry
  try { geometry = await exactParcel(context.parcelId, fetcher) }
  catch { return { ...result, status: 'error', summary: 'The exact County parcel boundary could not be verified for this source query.' } }
  if (catalogId === 3) return { ...result, status: 'available', coverage: { geography: 'parcel', matchMethod: 'exact_parcel_id' }, records: [{ parcelId: context.parcelId, geometryType: 'EsriPolygon' }], summary: 'Validated County polygonal geometry was returned. Boundary display is available through the property API; its effective date remains unknown.' }
  try {
    if ([4, 9, 40, 41].includes(catalogId)) {
      const [within, intersects] = await Promise.all([
        spatial(municipalityLayer, geometry, 'esriSpatialRelWithin', 'OBJECTID,NAME,MUNICODE', fetcher),
        spatial(municipalityLayer, geometry, 'esriSpatialRelIntersects', 'OBJECTID,NAME,MUNICODE', fetcher),
      ])
      if (!sameFeature(within, intersects, 'OBJECTID') || String(within[0].MUNICODE) !== String(intersects[0].MUNICODE) || within[0].NAME !== intersects[0].NAME) return { ...result, status: 'incomplete', summary: 'Municipal features do not establish one unambiguous whole-parcel jurisdiction.' }
      if (context.municipality && String(within[0].NAME).trim().toUpperCase() !== context.municipality.trim().toUpperCase()) return { ...result, status: 'incomplete', summary: 'The supplied municipality conflicts with the validated whole-parcel municipality.' }
      if (catalogId === 4) return { ...result, status: 'available', records: [{ name: within[0].NAME, code: String(within[0].MUNICODE) }], summary: 'The County municipality layer returns one consistent whole-parcel municipality. Confirm legal jurisdiction if boundaries conflict with other records.' }
      if (String(within[0].NAME).trim().toUpperCase() !== 'PITTSBURGH' || String(within[0].MUNICODE) !== '100') return { ...result, status: 'unsupported', summary: 'This is a City of Pittsburgh layer and the validated parcel is in another municipality.' }
    }
    if (catalogId === 9) {
      const [within, intersects] = await Promise.all([
        spatial(zoningLayer, geometry, 'esriSpatialRelWithin', 'OBJECTID,zon_new,status', fetcher),
        spatial(zoningLayer, geometry, 'esriSpatialRelIntersects', 'OBJECTID,zon_new,status', fetcher),
      ])
      if (!sameFeature(within, intersects, 'OBJECTID') || typeof within[0].zon_new !== 'string' || !within[0].zon_new.trim() || within[0].zon_new.trim() !== intersects[0].zon_new?.trim() || String(within[0].status).trim().toUpperCase() !== 'APPROVED' || String(intersects[0].status).trim().toUpperCase() !== 'APPROVED') return { ...result, status: 'incomplete', summary: 'Mapped districts do not establish one approved, nonempty full-parcel zone; a split, boundary contact or map status needs review.' }
      return { ...result, status: 'available', records: [{ district: within[0].zon_new, mapStatus: within[0].status ?? null }], summary: 'This is a mapped district observation only. Layer status is not project approval, and the City viewer uses a different zoning endpoint whose equivalence remains unverified.' }
    }
    if (catalogId === 38) {
      const [intersects, within] = await Promise.all([
        spatial(floodLayer, geometry, 'esriSpatialRelIntersects', 'OBJECTID,FLD_ZONE,ZONE_SUBTY,SFHA_TF', fetcher),
        spatial(floodLayer, geometry, 'esriSpatialRelWithin', 'OBJECTID,FLD_ZONE,ZONE_SUBTY,SFHA_TF', fetcher),
      ])
      if (!intersects.length) return { ...result, status: 'incomplete', summary: 'No FEMA feature was returned; flood panel and map coverage need review.' }
      const records = intersects.slice(0, 20).map(item => ({ zone: item.FLD_ZONE ?? null, subtype: item.ZONE_SUBTY ?? null, specialFloodHazardFlag: item.SFHA_TF ?? null, coversParcel: within.some(cover => cover.OBJECTID === item.OBJECTID) }))
      return { ...result, status: intersects.length > 20 ? 'incomplete' : 'available', records, summary: 'FEMA mapped zones are a screening observation, not a flood determination. Confirm panel and effective date.' }
    }
    const layer = catalogId === 40 ? slopeLayer : underminingLayer
    const field = catalogId === 40 ? 'slope25' : 'undermined'
    const rows = await spatial(layer, geometry, 'esriSpatialRelIntersects', catalogId === 40 ? 'objectid_1,slope25' : 'objectid,undermined', fetcher)
    if (!rows.length) return { ...result, status: 'empty', summary: 'No intersecting City feature was returned. This is not a site safety clearance.' }
    const records = rows.slice(0, 20).map(row => ({ flag: typeof row[field] === 'string' ? row[field].trim() : null }))
    return { ...result, status: rows.length > 20 || records.some(row => !['YES', 'NO'].includes(String(row.flag).toUpperCase())) ? 'incomplete' : 'available', records, summary: 'Mapped Yes, No or unknown flags require source and site review; a No flag is not a site safety clearance.' }
  } catch {
    return { ...result, status: 'error', summary: 'The mapped source did not return a complete, verified spatial response.' }
  }
}
