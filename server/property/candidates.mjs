const datastore = 'https://data.wprdc.org/api/3/action/datastore_search'
const sourceUrl = 'https://data.wprdc.org/dataset/property-assessments'
const resource = 'property_assessments_table'
const fields = 'PARID,PROPERTYHOUSENUM,PROPERTYFRACTION,PROPERTYADDRESS,PROPERTYCITY,PROPERTYZIP,MUNIDESC,USEDESC,ASOFDATE'
const useValues = { vacant_land: 'VACANT LAND', single_family: 'SINGLE FAMILY', any: null }
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }

function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9 -]+$/.test(value) }
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null
}

async function requestRows(url, fetcher) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetcher(url.toString(), { signal: controller.signal })
    if (!response.ok) throw new Error('source_http_error')
    const text = await response.text()
    if (text.length > 2_000_000) throw new Error('source_response_too_large')
    const body = JSON.parse(text)
    if (body?.success !== true || !Array.isArray(body?.result?.records) || !Number.isSafeInteger(body?.result?.total)) throw new Error('source_invalid_response')
    if (body.result.records.length > 21 || body.result.total < body.result.records.length) throw new Error('source_invalid_count')
    return body.result
  } finally { clearTimeout(timer) }
}

function normalizeRow(row, expectedUse, zip) {
  if (!validId(row?.PARID) || typeof row.MUNIDESC !== 'string' || !/^(?:PITTSBURGH|\d{1,2}(?:ST|ND|RD|TH) WARD\s*-\s*PITTSBURGH)$/i.test(row.MUNIDESC.trim()) || expectedUse && row.USEDESC !== expectedUse || zip && row.PROPERTYZIP !== zip) throw new Error('source_mismatched_row')
  return {
    parcelId: row.PARID,
    address: [row.PROPERTYHOUSENUM, row.PROPERTYFRACTION, row.PROPERTYADDRESS].filter(part => typeof part === 'string' && part.trim()).join(' ').replace(/\s+/g, ' ').trim(),
    city: typeof row.PROPERTYCITY === 'string' ? row.PROPERTYCITY : null,
    municipality: row.MUNIDESC,
    zip: typeof row.PROPERTYZIP === 'string' ? row.PROPERTYZIP : null,
    recordedUse: typeof row.USEDESC === 'string' && row.USEDESC.trim() ? row.USEDESC : null,
    sourceDate: validDate(row.ASOFDATE),
    matched: `${expectedUse ? `Assessment recorded use: ${expectedUse}; ` : ''}Pittsburgh-labeled assessment municipality${zip ? `; postal ZIP ${zip}` : ''}`,
  }
}

export async function handleCandidates(request, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  if (request.method !== 'GET') return json({ status: 'invalid_request', message: 'GET required.' }, 405)
  const url = new URL(request.url)
  const use = url.searchParams.get('use')
  const zip = url.searchParams.get('zip')
  if (url.pathname !== '/api/property/candidates' || !Object.hasOwn(useValues, use) || zip !== null && !/^\d{5}$/.test(zip) || [...url.searchParams.keys()].some(key => !['use', 'zip'].includes(key))) return json({ status: 'invalid_request', message: 'Unsupported search criteria.' }, 400)
  const recordedUse = useValues[use]
  const filters = { ...(recordedUse ? { USEDESC: recordedUse } : {}), ...(zip ? { PROPERTYZIP: zip } : {}) }
  const query = new URL(datastore)
  query.searchParams.set('resource_id', resource)
  query.searchParams.set('filters', JSON.stringify(filters))
  query.searchParams.set('q', JSON.stringify({ MUNIDESC: 'PITTSBURGH' }))
  query.searchParams.set('fields', fields)
  query.searchParams.set('limit', '21')
  try {
    const result = await requestRows(query, fetcher)
    const candidates = result.records.map(row => normalizeRow(row, recordedUse, zip))
    if (new Set(candidates.map(item => item.parcelId)).size !== candidates.length) throw new Error('source_duplicate_identifier')
    const shown = candidates.slice(0, 20)
    const sourceDate = shown.length && shown.every(item => item.sourceDate && item.sourceDate === shown[0].sourceDate) ? shown[0].sourceDate : null
    const retrievedAt = now()
    return json({
      status: shown.length ? 'candidates' : 'no_match', candidates: shown,
      truncated: result.total > 20 || candidates.length > 20, retrievedAt, sourceUrl, sourceDate,
      coverage: `Allegheny County assessment records with a Pittsburgh-labeled municipality${recordedUse ? ` and recorded use ${recordedUse}` : ''}${zip ? ` and postal ZIP ${zip}` : ''}. First 20 returned records only.`,
      unknowns: ['Confirmed City jurisdiction', 'Proposal suitability', 'Current physical condition', 'Lawful use', 'Availability or control', 'Zoning and site hazards', 'Lot-area suitability'],
    })
  } catch {
    return json({ status: 'error', candidates: [], truncated: false, retrievedAt: now(), sourceUrl, sourceDate: null, message: 'Assessment candidate search is unavailable. Retry later.' }, 502)
  }
}
