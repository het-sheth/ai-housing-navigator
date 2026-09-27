import { queryWprdcSource } from './wprdc.mjs'
import { queryCoreSource } from './core.mjs'
import { querySpatialReferenceSource } from './spatial-reference.mjs'
import { queryNcesSource } from './nces.mjs'
import { queryEmploymentSource } from './employment.mjs'

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
const contextKeys = new Set(['parcelId', 'municipality', 'zip', 'tract', 'countyFips', 'stateFips', 'year', 'metroCode', 'latitude', 'longitude'])
const statuses = new Set(['available', 'empty', 'needs_input', 'unsupported', 'unavailable', 'incomplete', 'error'])
const personalField = /^(?:owner(?:name|address|email|phone|mail(?:ing)?|info|contact)?|contact(?:name|address|email|phone|info)?|email|phone|plaintiff|borrower|mortgagee|mailingaddress)(?:[_ -].*)?$/i
const contributionField = /^(points|score|probability|easeScore)$/i
const envelopeKeys = new Set(['catalogId', 'status', 'coverage', 'sourceUrl', 'sourceDate', 'retrievedAt', 'records', 'summary'])

function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers }) }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }

function validContext(value) {
  if (!record(value) || Object.keys(value).some(key => !contextKeys.has(key))) return false
  if (value.parcelId !== undefined && (typeof value.parcelId !== 'string' || !/^[A-Za-z0-9 -]{1,64}$/.test(value.parcelId))) return false
  if (value.municipality !== undefined && (typeof value.municipality !== 'string' || !/^[A-Za-z0-9 .'-]{1,80}$/.test(value.municipality))) return false
  if (value.zip !== undefined && (typeof value.zip !== 'string' || !/^\d{5}$/.test(value.zip))) return false
  if (value.tract !== undefined && (typeof value.tract !== 'string' || !/^\d{11}$/.test(value.tract))) return false
  if (value.countyFips !== undefined && (typeof value.countyFips !== 'string' || !/^\d{5}$/.test(value.countyFips))) return false
  if (value.stateFips !== undefined && (typeof value.stateFips !== 'string' || !/^\d{2}$/.test(value.stateFips))) return false
  if (value.metroCode !== undefined && (typeof value.metroCode !== 'string' || !/^\d{1,10}$/.test(value.metroCode))) return false
  if (value.year !== undefined && (!Number.isSafeInteger(value.year) || value.year < 1900 || value.year > 2100)) return false
  if ((value.latitude === undefined) !== (value.longitude === undefined)) return false
  if (value.latitude !== undefined && (typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || value.latitude < 24 || value.latitude > 50 || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || value.longitude < -125 || value.longitude > -66)) return false
  const geographyCount = ['parcelId', 'municipality', 'zip', 'tract', 'countyFips', 'stateFips', 'metroCode'].filter(key => value[key] !== undefined).length + (value.latitude === undefined ? 0 : 1)
  if (geographyCount > 1) return false
  return true
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 4096) throw Error('too_large')
  const reader = request.body?.getReader()
  if (!reader) throw Error('missing_body')
  const chunks = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > 4096) { await reader.cancel(); throw Error('too_large') }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

export function validEnvelope(value, catalogId) {
  if (!record(value) || Object.keys(value).length !== envelopeKeys.size || Object.keys(value).some(key => !envelopeKeys.has(key)) || value.catalogId !== catalogId || !statuses.has(value.status) || !record(value.coverage) || Object.keys(value.coverage).length !== 2 || Object.keys(value.coverage).some(key => !['geography', 'matchMethod'].includes(key)) || typeof value.coverage.geography !== 'string' || !value.coverage.geography || typeof value.coverage.matchMethod !== 'string' || !value.coverage.matchMethod || typeof value.sourceUrl !== 'string' || !value.sourceUrl.startsWith('https://') || !(value.sourceDate === null || typeof value.sourceDate === 'string') || typeof value.retrievedAt !== 'string' || !Number.isFinite(Date.parse(value.retrievedAt)) || !Array.isArray(value.records) || value.records.length > 20 || typeof value.summary !== 'string' || value.summary.length > 5000) return false
  if (value.records.some(row => !record(row) || Object.keys(row).length > 20 || Object.entries(row).some(([key, field]) => personalField.test(key) || contributionField.test(key) || !/^[A-Za-z_][A-Za-z0-9_ -]{0,63}$/.test(key) || !(field === null || typeof field === 'string' || typeof field === 'boolean' || typeof field === 'number' && Number.isFinite(field))))) return false
  return JSON.stringify(value).length <= 100_000
}

export async function querySource(catalogId, context, options = {}) {
  const direct = await queryWprdcSource(catalogId, context, options) ?? await queryCoreSource(catalogId, context, options)
  if (direct) return direct
  const employment = await queryEmploymentSource(catalogId, context, options)
  if (employment) return employment
  const { queryRegionalSource } = await import('./regional.mjs')
  const regional = await queryRegionalSource(catalogId, context, options)
  if (regional) return regional
  return await querySpatialReferenceSource(catalogId, context, options) ?? queryNcesSource(catalogId, context, options)
}

export async function handleSourceQuery(request, { fetcher = fetch, now = () => new Date().toISOString(), trustedOrigin = 'http://127.0.0.1:5173' } = {}) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const url = new URL(request.url)
  if (url.pathname !== '/api/sources/query') return json({ error: 'not_found' }, 404)
  const correctRequestHost = trustedOrigin === 'http://127.0.0.1:5173' ? ['127.0.0.1', 'localhost'].includes(url.hostname) : url.origin === trustedOrigin
  if (!correctRequestHost || request.headers.get('origin') !== trustedOrigin) return json({ error: 'origin_denied' }, 403)
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'json_required' }, 415)
  let input
  try { input = await readBody(request) } catch { return json({ error: 'invalid_or_large_body' }, 413) }
  if (!record(input) || Object.keys(input).length !== 2 || !Object.hasOwn(input, 'catalogId') || !Object.hasOwn(input, 'context') || !Number.isSafeInteger(input.catalogId) || input.catalogId < 1 || input.catalogId > 60 || !validContext(input.context)) return json({ error: 'invalid_request' }, 422)
  try {
    const result = await querySource(input.catalogId, input.context, { fetcher, now })
    if (!result) return json({ error: 'adapter_not_connected' }, 501)
    if (!validEnvelope(result, input.catalogId)) return json({ error: 'source_contract_error' }, 502)
    return json(result)
  } catch { return json({ error: 'source_unavailable' }, 502) }
}
