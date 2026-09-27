import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

const fileUrl = 'https://lehd.ces.census.gov/data/lodes/LODES8/pa/wac/pa_wac_S000_JT00_2023.csv.gz'
const maximumCompressedBytes = 4_000_000
const maximumInflatedBytes = 32_000_000
const maximumRows = 150_000
const maximumLineLength = 4_096

function result(status, geography, matchMethod, retrievedAt, summary, records = [], sourceDate = null) {
  return { catalogId: 28, status, coverage: { geography, matchMethod }, sourceUrl: fileUrl, sourceDate, retrievedAt, records, summary }
}

function selection(context) {
  if (context?.year !== undefined && context.year !== 2023) return null
  const tract = context?.tract
  const county = context?.countyFips
  if (tract !== undefined && !/^42\d{9}$/.test(tract)) return null
  if (county !== undefined && !/^42\d{3}$/.test(county)) return null
  if (context?.stateFips !== undefined && context.stateFips !== '42') return null
  if (tract && county && !tract.startsWith(county)) return null
  if (context?.parcelId || context?.latitude !== undefined || context?.metroCode || context?.zip || context?.municipality) return null
  if (tract) return { code: tract, key: 'tract', geography: 'Pennsylvania 2020 Census tract', matchMethod: 'exact_tract_geoid_2020_block_prefix' }
  if (county) return { code: county, key: 'countyFips', geography: 'Pennsylvania county', matchMethod: 'exact_county_fips_2020_block_prefix' }
  return null
}

async function sumFile(response, prefix) {
  let compressedBytes = 0
  let inflatedBytes = 0
  let rowCount = 0
  let workplaceJobs = 0
  let workplaceBlockCount = 0
  let header = null
  let carry = ''
  const matched = new Set()
  const source = Readable.fromWeb(response.body)
  async function* boundedCompressed() {
    for await (const part of source) {
      compressedBytes += part.byteLength
      if (compressedBytes > maximumCompressedBytes) throw Error('source_limit')
      yield part
    }
  }
  function line(value) {
    if (value.length > maximumLineLength) throw Error('source_limit')
    const fields = value.replace(/\r$/, '').split(',')
    if (header === null) {
      if (new Set(fields).size !== fields.length || fields[0] !== 'w_geocode' || fields[1] !== 'C000' || fields.at(-1) !== 'createdate') throw Error('invalid_lodes_schema')
      header = fields
      return
    }
    rowCount++
    if (rowCount > maximumRows) throw Error('source_limit')
    if (fields.length !== header.length || !/^42\d{13}$/.test(fields[0]) || !/^\d{1,10}$/.test(fields[1]) || !/^\d{8}$/.test(fields.at(-1))) throw Error('invalid_lodes_row')
    if (!fields[0].startsWith(prefix)) return
    if (matched.has(fields[0])) throw Error('duplicate_lodes_block')
    matched.add(fields[0])
    const jobs = Number(fields[1])
    if (!Number.isSafeInteger(jobs) || !Number.isSafeInteger(workplaceJobs + jobs)) throw Error('invalid_lodes_count')
    workplaceJobs += jobs
    workplaceBlockCount++
  }
  const input = Readable.from(boundedCompressed())
  const inflated = input.pipe(createGunzip())
  try {
    for await (const part of inflated) {
      inflatedBytes += part.byteLength
      if (inflatedBytes > maximumInflatedBytes) throw Error('source_limit')
      const lines = (carry + part.toString('utf8')).split('\n')
      carry = lines.pop()
      if (carry.length > maximumLineLength) throw Error('source_limit')
      for (const value of lines) line(value)
    }
  } finally {
    inflated.destroy()
    input.destroy()
    source.destroy()
  }
  if (carry) line(carry)
  if (!header || rowCount === 0) throw Error('invalid_lodes_empty_file')
  return { workplaceJobs, workplaceBlockCount }
}

export async function queryEmploymentSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  if (catalogId !== 28) return null
  const retrievedAt = now()
  const selected = selection(context)
  if (!selected) return result('needs_input', 'Pennsylvania county or 2020 Census tract', 'explicit_pa_county_or_2020_tract', retrievedAt, 'Provide an exact Pennsylvania county FIPS or independently confirmed 2020 Census tract GEOID. This adapter uses only the published 2023 workplace all-jobs file.')
  const reply = (status, summary, records = [], sourceDate = null) => result(status, selected.geography, selected.matchMethod, retrievedAt, summary, records, sourceDate)
  try {
    const response = await fetcher(fileUrl, { headers: { 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(12_000) })
    if ([404, 410].includes(response.status)) return reply('unavailable', 'The published 2023 Pennsylvania WAC file is unavailable at the fixed Census URL.')
    if (response.status !== 200 || !response.body) throw Error('source_http_error')
    const declaredLength = response.headers.get('content-length')
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumCompressedBytes)) return reply('incomplete', 'The official compressed file exceeds the bounded source-read limit.')
    const totals = await sumFile(response, selected.code)
    const record = { [selected.key]: selected.code, year: 2023, workplaceJobs: totals.workplaceJobs, workplaceBlockCount: totals.workplaceBlockCount, jobType: 'all_jobs', sourceFileType: 'WAC' }
    const summary = '2023 LODES8 Pennsylvania WAC S000/JT00 workplace all-jobs count, summed from complete 2020 Census block records. This is not a commuting origin-destination flow, resident employment count, parcel finding, or development score.'
    return reply(totals.workplaceBlockCount ? 'available' : 'empty', summary, [record], '2023')
  } catch (error) {
    if (error?.message === 'source_limit' || error?.code === 'Z_BUF_ERROR') return reply('incomplete', 'The Pennsylvania WAC archive was truncated or exceeded a source-read limit; no employment total is reported.')
    return reply('error', 'The Pennsylvania WAC archive could not be read and validated as a complete published file.')
  }
}
