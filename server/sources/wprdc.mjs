import { queryCoreSource } from './core.mjs'

const endpoint = 'https://data.wprdc.org/api/3/action/datastore_search'
const historicalArchive = 'https://data.wprdc.org/api/3/action/package_show?id=city-of-pittsburgh-building-permit-summary'
const sources = {
  1: { resource: 'property_assessments_table', field: 'PARID', input: 'parcelId', fields: ['PARID', 'CLASSDESC', 'USEDESC', 'LOTAREA', 'YEARBLT', 'ASOFDATE'], summary: 'Assessment classification and value are not current physical condition, lawful use or market value.' },
  2: { resource: '5bbe6c55-bce6-4edb-9d04-68edeb6bf7b1', field: 'PARID', input: 'parcelId', fields: ['PARID', 'SALEDATE', 'PRICE', 'SALECODE', 'SALEDESC'], summary: 'These are transactions for the selected parcel, not a nearby comparable set or a validated market estimate.' },
  5: { resource: 'f4d1177a-f597-4c32-8cbf-7885f56253f6', field: 'parcel_num', input: 'parcelId', fields: ['parcel_num', 'permit_id', 'permit_type', 'work_type', 'issue_date', 'status'], summary: 'Historical City permit records do not establish lawful use or the current review path.' },
  7: { resource: '70c06278-92c5-4040-ab28-17671866f81c', field: 'parcel_id', input: 'parcelId', fields: ['parcel_id', 'status', 'case_file_type', 'investigation_date', 'violation_code_section_title'], summary: 'City violation records require status and applicability review; this search is not a current condition or compliance finding.' },
  8: { resource: '0a963f26-eb4b-4325-bbbc-3ddf6a871410', field: 'parcel_id', input: 'parcelId', fields: ['parcel_id', 'property_type', 'create_date', 'latest_inspection_result', 'inspection_status'], summary: 'City condemned-property records are historical observations and need current City verification.' },
  14: { resource: 'e1dcee82-9179-4306-8167-5891915b62a7', field: 'pin', input: 'parcelId', fields: ['pin', 'inventory_type', 'current_status', 'acquisition_date', 'last_updated'], summary: 'A City inventory record does not establish current title, control or transfer availability.' },
  15: { resource: 'fd924520-d568-4da2-967c-60b3a305e681', field: 'pin', input: 'parcelId', fields: ['pin', 'start_year', 'approved_date', 'program_name', 'num_years', 'abatement_amount'], summary: 'A recorded abatement is not an eligibility or financing determination for this proposal.' },
  58: { resource: 'e1dcee82-9179-4306-8167-5891915b62a7', field: 'pin', input: 'parcelId', fields: ['pin', 'inventory_type', 'current_status', 'acquisition_date', 'last_updated'], summary: 'This catalog row duplicates the City-owned properties source. A City inventory record does not establish current title or availability.' },
}
const aggregateOnly = { 53: '29462525-62a6-45bf-9b5e-ad2e1c06348d', 55: '96e9d6b2-3e1a-4a0c-8ef6-23a049c263d8', 56: 'ed0d1550-c300-4114-865c-82dc7c23235b', 57: '859bccfd-0e12-4161-a348-313d734f25fd' }
const cityOnly = new Set([5, 7, 8, 14, 15, 58])
function resourceUrl(resource) { return `${endpoint}?resource_id=${encodeURIComponent(resource)}` }

async function readJson(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw Error('source_http_error')
  const reader = response.body?.getReader()
  if (!reader) throw Error('source_empty_body')
  const chunks = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > 2_000_000) { await reader.cancel(); throw Error('source_too_large') }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (data?.error) throw Error('source_application_error')
  return data
}

function envelope(catalogId, retrievedAt, input, resource) {
  return { catalogId, status: 'needs_input', coverage: { geography: input === 'tract' ? 'tract' : 'parcel', matchMethod: input === 'tract' ? 'exact_tract' : 'exact_parcel_id' }, sourceUrl: resourceUrl(resource), sourceDate: null, retrievedAt, records: [], summary: `Provide ${input} for this source query.` }
}

function cleanRecord(row, fields) {
  return Object.fromEntries(fields.map(field => {
    const value = row[field]
    return [field, value === null || ['string', 'number', 'boolean'].includes(typeof value) ? value ?? null : null]
  }))
}

export async function queryWprdcSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString(), municipalityQuery = queryCoreSource } = {}) {
  const config = sources[catalogId]
  if (!config && !aggregateOnly[catalogId] && catalogId !== 6) return null
  const retrievedAt = now()
  if (catalogId === 6) {
    const result = { catalogId, status: 'error', coverage: { geography: 'dataset', matchMethod: 'archive_index_only' }, sourceUrl: historicalArchive, sourceDate: null, retrievedAt, records: [], summary: 'The historical permit archive index could not be verified. No parcel records were queried.' }
    try {
      const data = await readJson(historicalArchive, fetcher)
      if (data?.success !== true || !Array.isArray(data?.result?.resources)) throw Error('invalid_archive_index')
      const indexedTables = data.result.resources.filter(resource => resource?.datastore_active === true && typeof resource.name === 'string' && /permit summary/i.test(resource.name)).length
      if (!indexedTables) throw Error('empty_archive_index')
      return { ...result, status: 'available', records: [{ indexedTables }], summary: 'Official historical permit summary tables are indexed. No parcel records were queried; archive coverage and a cross-table exact parcel join remain unverified.' }
    } catch { return result }
  }
  if (aggregateOnly[catalogId]) {
    const result = { catalogId, status: 'error', coverage: { geography: 'dataset', matchMethod: 'dataset_record_count' }, sourceUrl: resourceUrl(aggregateOnly[catalogId]), sourceDate: null, retrievedAt, records: [], summary: catalogId === 53 ? 'The public 311 dataset count is unavailable. No reliable tract or parcel join is claimed.' : 'The public dataset count is unavailable. Individual personal financial records are not queried.' }
    try {
      const url = new URL(endpoint)
      url.searchParams.set('resource_id', aggregateOnly[catalogId])
      url.searchParams.set('limit', '0')
      const data = await readJson(url.toString(), fetcher)
      if (data?.success !== true || !Number.isSafeInteger(data?.result?.total) || data.result.total < 0) throw Error('invalid_total')
      return { ...result, status: 'available', records: [{ recordCount: data.result.total }], summary: catalogId === 53 ? 'The 311 dataset record count is not parcel evidence. The source tract field is not reliable enough for a tract-level absence claim.' : 'This is the public dataset record count, not parcel evidence or a financial assessment. Individual personal financial records are not queried.' }
    } catch { return result }
  }
  const result = envelope(catalogId, retrievedAt, config.input, config.resource)
  const value = context[config.input]
  if (!value) return result
  if (cityOnly.has(catalogId)) {
    try {
      const location = await municipalityQuery(4, { parcelId: value }, { fetcher, now })
      const coverage = { geography: 'parcel', matchMethod: 'verified_city_scope' }
      const scoped = { ...result, coverage, sourceUrl: location?.sourceUrl ?? result.sourceUrl }
      if (location?.status !== 'available' || location.records?.length !== 1) return { ...scoped, status: 'incomplete', summary: 'The County parcel municipality could not be confirmed, so this City-only record source was not queried.' }
      if (String(location.records[0].name).trim().toUpperCase() !== 'PITTSBURGH' || String(location.records[0].code) !== '100') return { ...scoped, status: 'unsupported', summary: 'The County municipality layer places this parcel outside Pittsburgh, so this City-only record source was not queried.' }
    } catch { return { ...result, status: 'incomplete', coverage: { geography: 'parcel', matchMethod: 'verified_city_scope' }, summary: 'The County parcel municipality could not be confirmed, so this City-only record source was not queried.' } }
  }
  try {
    const url = new URL(endpoint)
    url.searchParams.set('resource_id', config.resource)
    url.searchParams.set('filters', JSON.stringify({ [config.field]: value }))
    url.searchParams.set('fields', config.fields.join(','))
    url.searchParams.set('limit', '20')
    const data = await readJson(url.toString(), fetcher)
    const found = data?.result
    if (data?.success !== true || !Number.isSafeInteger(found?.total) || found.total < 0 || !Array.isArray(found.records) || found.records.length > 20 || found.records.length > found.total || found.records.some(row => row?.[config.field] !== value)) throw Error('source_invalid_records')
    const records = found.records.map(row => cleanRecord(row, config.fields))
    const sourceDate = catalogId === 1 && records.length === 1 && typeof records[0].ASOFDATE === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(records[0].ASOFDATE) ? records[0].ASOFDATE : null
    return { ...result, status: found.total > records.length ? 'incomplete' : found.total ? 'available' : 'empty', sourceDate, records, summary: found.total > records.length ? `${config.summary} More matching records exist than this bounded page returns.` : config.summary }
  } catch {
    return { ...result, status: 'error', records: [], summary: 'The public source did not return a complete, verified response.' }
  }
}
