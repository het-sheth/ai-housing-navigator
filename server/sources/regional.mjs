const regionalIds = new Set([17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 59, 60])
const laiLayer = 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Location_Affordability_Index_v3/FeatureServer/0'
const qcewDocs = 'https://www.bls.gov/cew/additional-resources/open-data/csv-data-slices.htm'
const ppiUrl = 'https://api.bls.gov/publicAPI/v1/timeseries/data/WPU00000000'
const pmmsUrl = 'https://www.freddiemac.com/pmms/docs/PMMS_history.csv'
const fhfaUrl = 'https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_state.csv'
const realtorCountyUrl = 'https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_County.csv'
const zillowCountyUrl = 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv'
const decennialTractLayer = 'https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/Tracts_Blocks/MapServer/0'
const opportunityTractUrl = 'https://opportunityinsights.org/wp-content/uploads/2024/08/tract_outcomes_late_simple.csv'
const hmdaAggregationsUrl = 'https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations'
const hudFmrLayer = 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Fair_Market_Rents/FeatureServer/0'

const references = {
  17: ['https://api.census.gov/data/2024/acs/acs5', 'county or tract', 'The ACS API query returned a Missing Key page without a registered key. Public bulk ACS files exist but are not parsed by this adapter; no ACS metric is inferred.'],
  23: ['https://www.huduser.gov/portal/datasets/il/il26/Section8-FY26.xlsx', 'HUD income-limit area', 'The FY2026 Section 8 workbook returned an HTTP 202 access challenge on a bounded HEAD and ranged GET on September 27, 2026. The HUD API requires a bearer token. No area or household-size limit is inferred.'],
  24: ['https://www.huduser.gov/lihtc/', 'project or building', 'HUD offers a selective LIHTC county query and a public project archive, but this adapter has not parsed that query. The direct archive probe received a site challenge. Nearby projects are not a site subsidy determination.'],
  25: ['https://preservationdatabase.org/', 'subsidized property', 'National Housing Preservation Database access requires registration; no public anonymous record query is configured.'],
  26: ['https://www.huduser.gov/portal/datasets/usps.html', 'census tract', 'USPS vacancy data are distributed as tract aggregates through HUD downloads; no verified bounded tract endpoint is configured.'],
  28: ['https://lehd.ces.census.gov/data/', 'census block flow', 'LODES origin-destination files are state bulk block flows. A parcel, tract, or county alone does not specify the commuting statistic or version to retrieve.'],
  42: ['https://www.epa.gov/ejscreen/download-ejscreen-data', 'block group or tract', 'EJScreen provides national indicator downloads; no verified bounded geography endpoint and vintage are configured for this source.'],
  44: ['https://www.ncei.noaa.gov/cdo-web/', 'weather station', 'NOAA Climate Data Online requires a token and an explicit dataset, station, and date range. Weather station data are not parcel climate findings.'],
  45: ['https://resstock.nrel.gov/', 'modeled building stock', 'ResStock publishes modeled scenario datasets, not a verified bounded parcel or county observation endpoint. Scenario and vintage selection are required.'],
  47: ['https://www.redfin.com/news/data-center/downloads/', 'county, ZIP, city, or metro', 'Redfin offers filtered market aggregate CSV downloads in its browser interface. Direct automated access received a robot challenge, and a verified stable bounded CSV query is not configured.'],
  48: ['https://www.redfin.com/news/data-center/migration-patterns/', 'metro origin-destination', 'Redfin migration measures metro search flows, not parcel demand. An origin/destination and period are required.'],
  59: ['https://www.mercatus.org/commuter-market-access-dataset', 'census tract', 'McMADCAT publishes tract accessibility files; the measure and travel-time band must be chosen before a tract value can be interpreted.'],
  60: ['https://access.umn.edu/ao-research/aaa', 'metro or census block', 'Access Across America provides multiple mode, destination, and time measures. No single county or parcel value follows from a parcel ID.'],
}

function result(catalogId, status, geography, matchMethod, sourceUrl, retrievedAt, summary, records = [], sourceDate = null) {
  return { catalogId, status, coverage: { geography, matchMethod }, sourceUrl, sourceDate, retrievedAt, records, summary }
}

async function boundedText(url, fetcher, maximumBytes, range = false) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000), headers: range ? { Range: typeof range === 'string' ? range : `bytes=0-${maximumBytes - 1}` } : undefined })
  if (!response.ok) throw Error('source_http_error')
  if (!response.body) throw Error('source_empty_body')
  const reader = response.body.getReader()
  const chunks = []
  let length = 0
  let complete = false
  while (length <= maximumBytes) {
    const part = await reader.read()
    if (part.done) { complete = true; break }
    if (length + part.value.byteLength > maximumBytes) { await reader.cancel(); break }
    length += part.value.byteLength
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), complete: complete && response.status !== 206, rangeReceived: complete && response.status === 206, contentRange: response.headers.get('content-range') }
}

function csvLine(line) {
  const fields = []
  let field = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') { field += '"'; index++ }
    else if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { fields.push(field); field = '' }
    else field += character
  }
  if (quoted) throw Error('invalid_csv')
  fields.push(field.replace(/\r$/, ''))
  return fields
}

function completeLines(text, complete = false) {
  const lines = text.split('\n')
  if (!complete && !text.endsWith('\n')) lines.pop()
  return lines.filter(Boolean)
}

function finiteNumber(value) {
  const number = Number(value)
  return value !== '' && Number.isFinite(number) ? number : null
}

function conflictsWithGeography(context, fips) {
  return (context.stateFips && context.stateFips !== fips.slice(0, 2)) || (context.countyFips && context.countyFips.slice(0, Math.min(fips.length, 5)) !== fips.slice(0, Math.min(fips.length, 5))) || (context.tract && context.tract.slice(0, Math.min(fips.length, 5)) !== fips.slice(0, Math.min(fips.length, 5)))
}

async function qcew(catalogId, context, fetcher, retrievedAt) {
  const county = context.countyFips
  if (!/^\d{5}$/.test(county ?? '') || !Number.isInteger(context.year) || context.year < 2021 || context.year > 2025) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', qcewDocs, retrievedAt, 'Provide a five-digit county FIPS and a published QCEW annual year from 2021 through 2025.')
  if (conflictsWithGeography(context, county)) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', qcewDocs, retrievedAt, 'The supplied state, county, and tract identifiers conflict; confirm the geography before retrieving county QCEW data.')
  const url = `https://data.bls.gov/cew/data/api/${context.year}/a/area/${county}.csv`
  try {
    const body = await boundedText(url, fetcher, 65_536, true)
    const lines = completeLines(body.text, body.complete)
    if (!lines.length) throw Error('invalid_qcew')
    const header = csvLine(lines.shift())
    const index = Object.fromEntries(header.map((name, position) => [name, position]))
    if (!['area_fips', 'own_code', 'industry_code', 'agglvl_code', 'size_code', 'year', 'qtr', 'disclosure_code', 'annual_avg_estabs', 'annual_avg_emplvl', 'annual_avg_wkly_wage', 'avg_annual_pay'].every(name => Number.isInteger(index[name]))) throw Error('invalid_qcew')
    for (const line of lines) {
      const row = csvLine(line)
      if (row[index.area_fips] !== county || row[index.own_code] !== '0' || row[index.industry_code] !== '10' || row[index.agglvl_code] !== '70' || row[index.size_code] !== '0' || row[index.year] !== String(context.year) || row[index.qtr] !== 'A') continue
      if (row[index.disclosure_code]?.trim()) return result(catalogId, 'unavailable', 'county', 'exact_county_fips', url, retrievedAt, 'The matching QCEW total is suppressed by the source.')
      const annualAverageEstablishments = finiteNumber(row[index.annual_avg_estabs])
      const annualAverageEmployment = finiteNumber(row[index.annual_avg_emplvl])
      const annualAverageWeeklyWage = finiteNumber(row[index.annual_avg_wkly_wage])
      const averageAnnualPay = finiteNumber(row[index.avg_annual_pay])
      if ([annualAverageEstablishments, annualAverageEmployment, annualAverageWeeklyWage, averageAnnualPay].some(value => value === null || value < 0)) throw Error('invalid_qcew')
      return result(catalogId, 'available', 'county', 'exact_county_fips', url, retrievedAt, 'Countywide all-industry, all-ownership annual employment and wages. These are not project jobs or construction costs.', [{ countyFips: county, year: context.year, annualAverageEstablishments, annualAverageEmployment, annualAverageWeeklyWage, averageAnnualPay, wageUnit: 'USD' }], String(context.year))
    }
    return result(catalogId, body.complete ? 'empty' : 'incomplete', 'county', 'exact_county_fips', url, retrievedAt, body.complete ? 'No matching published county total was returned.' : 'The bounded county file scan ended before a matching complete total was found.')
  } catch {
    return result(catalogId, 'error', 'county', 'exact_county_fips', url, retrievedAt, 'The QCEW county slice could not be read or validated.')
  }
}

async function ppi(catalogId, context, fetcher, retrievedAt) {
  try {
    const body = await boundedText(ppiUrl, fetcher, 32_768)
    if (!body.complete) return result(catalogId, 'incomplete', 'United States', 'national_series_no_parcel_join', ppiUrl, retrievedAt, 'The public BLS time-series response exceeded the request bound.')
    const data = JSON.parse(body.text)
    if (data?.status !== 'REQUEST_SUCCEEDED' || data.Results?.series?.length !== 1 || data.Results.series[0]?.seriesID !== 'WPU00000000' || !Array.isArray(data.Results.series[0].data)) throw Error('invalid_ppi')
    const entries = data.Results.series[0].data.filter(item => /^M(?:0[1-9]|1[0-2])$/.test(item?.period ?? '') && /^\d{4}$/.test(item?.year ?? '') && (context.year === undefined || Number(item.year) === context.year) && finiteNumber(item.value) !== null)
    entries.sort((left, right) => `${right.year}${right.period}`.localeCompare(`${left.year}${left.period}`))
    const entry = entries[0]
    if (!entry) return result(catalogId, 'empty', 'United States', 'national_series_no_parcel_join', ppiUrl, retrievedAt, 'No monthly all-commodities PPI observation was returned for the requested year. The anonymous API covers recent years only.')
    const period = `${entry.year}-${entry.period.slice(1)}`
    return result(catalogId, 'available', 'United States', 'national_series_no_parcel_join', ppiUrl, retrievedAt, 'All-commodities producer price index. It is not a parcel construction cost, contractor quote, or financial feasibility estimate.', [{ seriesId: 'WPU00000000', period, value: finiteNumber(entry.value), unit: 'index', preliminary: entry.footnotes?.some(note => note?.code === 'P') === true }], period)
  } catch {
    return result(catalogId, 'error', 'United States', 'national_series_no_parcel_join', ppiUrl, retrievedAt, 'The public BLS series could not be read or validated.')
  }
}

async function pmms(catalogId, context, fetcher, retrievedAt) {
  try {
    const body = await boundedText(pmmsUrl, fetcher, 160_000)
    if (!body.complete) return result(catalogId, 'incomplete', 'United States', 'national_series_no_parcel_join', pmmsUrl, retrievedAt, 'The Freddie Mac history file exceeded the bounded request size.')
    const lines = completeLines(body.text, body.complete)
    if (lines.shift()?.replace(/\r$/, '') !== 'date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread') throw Error('invalid_pmms')
    const entries = lines.map(csvLine).filter(row => row.length === 9 && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(row[0]) && finiteNumber(row[1]) !== null)
    const candidates = entries.map(row => {
      const [month, day, year] = row[0].split('/').map(Number)
      return { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, thirtyYearFixedRatePercent: finiteNumber(row[1]), fifteenYearFixedRatePercent: finiteNumber(row[3]) }
    }).filter(row => context.year === undefined || Number(row.date.slice(0, 4)) === context.year)
    candidates.sort((left, right) => right.date.localeCompare(left.date))
    if (!candidates.length) return result(catalogId, 'empty', 'United States', 'national_series_no_parcel_join', pmmsUrl, retrievedAt, 'No PMMS weekly rate was returned for the requested year.')
    return result(catalogId, 'available', 'United States', 'national_series_no_parcel_join', pmmsUrl, retrievedAt, 'Freddie Mac national weekly mortgage survey rates; actual financing terms and project funding remain unassessed.', [candidates[0]], candidates[0].date)
  } catch {
    return result(catalogId, 'error', 'United States', 'national_series_no_parcel_join', pmmsUrl, retrievedAt, 'Freddie Mac PMMS history could not be read or validated.')
  }
}

async function fhfa(catalogId, context, fetcher, retrievedAt) {
  const stateFips = context.stateFips ?? context.countyFips?.slice(0, 2)
  if (stateFips !== '42') return result(catalogId, 'needs_input', 'state', 'state_derived_from_county_fips', fhfaUrl, retrievedAt, 'Provide Pennsylvania state FIPS 42 or an Allegheny County FIPS to select the state HPI series. This adapter does not infer a state from a parcel identifier.')
  if (conflictsWithGeography(context, stateFips)) return result(catalogId, 'needs_input', 'state', 'state_derived_from_county_fips', fhfaUrl, retrievedAt, 'The supplied state, county, and tract identifiers conflict; confirm the geography before retrieving the state index.')
  try {
    const body = await boundedText(fhfaUrl, fetcher, 250_000)
    if (!body.complete) return result(catalogId, 'incomplete', 'state', 'state_derived_from_county_fips', fhfaUrl, retrievedAt, 'The FHFA state file exceeded the bounded request size.')
    const rows = completeLines(body.text, body.complete).map(csvLine).filter(row => row.length >= 4 && row[0] === 'PA' && /^\d{4}$/.test(row[1]) && /^[1-4]$/.test(row[2]) && finiteNumber(row[3]) !== null && (context.year === undefined || Number(row[1]) === context.year))
    rows.sort((left, right) => Number(right[1]) - Number(left[1]) || Number(right[2]) - Number(left[2]))
    if (!rows.length) return result(catalogId, 'empty', 'state', 'state_derived_from_county_fips', fhfaUrl, retrievedAt, 'No Pennsylvania FHFA state index was returned for the requested year.')
    const row = rows[0]
    const sourceDate = `${row[1]}-Q${row[2]}`
    return result(catalogId, 'available', 'state', 'state_derived_from_county_fips', fhfaUrl, retrievedAt, 'Pennsylvania all-transactions house price index. This is a state trend, not a parcel appraisal or comparable sale.', [{ state: 'PA', year: Number(row[1]), quarter: Number(row[2]), value: finiteNumber(row[3]), unit: 'index' }], sourceDate)
  } catch {
    return result(catalogId, 'error', 'state', 'state_derived_from_county_fips', fhfaUrl, retrievedAt, 'The FHFA state index file could not be read or validated.')
  }
}

async function lai(catalogId, context, fetcher, retrievedAt) {
  if (!/^\d{11}$/.test(context.tract ?? '')) return result(catalogId, 'needs_input', 'census tract', 'exact_tract_geoid', laiLayer, retrievedAt, 'Provide an independently confirmed eleven-digit Census tract GEOID. A parcel ID does not establish its tract.')
  if (conflictsWithGeography(context, context.tract.slice(0, 5))) return result(catalogId, 'needs_input', 'census tract', 'exact_tract_geoid', laiLayer, retrievedAt, 'The supplied tract conflicts with the state or county FIPS; confirm its geography before retrieving HUD LAI data.')
  const url = new URL(`${laiLayer}/query`)
  for (const [key, value] of Object.entries({ where: `GEOID='${context.tract}'`, outFields: 'GEOID,median_gross_rent,median_hh_income,hh1_ht_renters', returnGeometry: 'false', f: 'json' })) url.searchParams.set(key, value)
  try {
    const body = await boundedText(url.toString(), fetcher, 32_768)
    if (!body.complete) return result(catalogId, 'incomplete', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'The HUD map response exceeded the bounded request size.')
    const data = JSON.parse(body.text)
    if (data?.error || !Array.isArray(data?.features) || data.exceededTransferLimit || data.features.length > 1) throw Error('invalid_lai')
    if (!data.features.length) return result(catalogId, 'empty', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'No matching HUD LAI v3 tract record was returned; check tract vintage and coverage.', [], '2012-2016')
    const fields = data.features[0]?.attributes
    if (fields?.GEOID !== context.tract || !Number.isFinite(fields.median_gross_rent) || !Number.isFinite(fields.median_hh_income) || !Number.isFinite(fields.hh1_ht_renters)) throw Error('invalid_lai')
    return result(catalogId, 'available', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'HUD LAI v3 uses 2012-2016 inputs. Profile 1 renter housing and transportation cost is modeled as a percent of income; it does not describe an actual household or parcel feasibility.', [{ tract: context.tract, medianGrossRent: fields.median_gross_rent, medianHouseholdIncome: fields.median_hh_income, modeledRenterHousingTransportationPercent: fields.hh1_ht_renters, householdProfile: 'profile_1' }], '2012-2016')
  } catch {
    return result(catalogId, 'error', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'The HUD LAI tract record could not be read or validated.')
  }
}

async function decennialTract(catalogId, context, fetcher, retrievedAt) {
  if (!/^\d{11}$/.test(context.tract ?? '') || (context.year !== undefined && context.year !== 2020)) return result(catalogId, 'needs_input', 'census tract', 'exact_tract_geoid', decennialTractLayer, retrievedAt, 'Provide an independently confirmed eleven-digit Census tract GEOID for 2020. This key-free TIGERweb layer exposes only 2020 tract population and housing-unit counts.')
  if (conflictsWithGeography(context, context.tract.slice(0, 5))) return result(catalogId, 'needs_input', 'census tract', 'exact_tract_geoid', decennialTractLayer, retrievedAt, 'The supplied tract conflicts with state or county FIPS; confirm the geography before retrieving 2020 counts.')
  const url = new URL(`${decennialTractLayer}/query`)
  for (const [key, value] of Object.entries({ where: `GEOID='${context.tract}'`, outFields: 'GEOID,POP100,HU100', returnGeometry: 'false', f: 'json' })) url.searchParams.set(key, value)
  try {
    const body = await boundedText(url.toString(), fetcher, 32_768)
    if (!body.complete) return result(catalogId, 'incomplete', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'The Census TIGERweb tract response exceeded the bounded request size.')
    const data = JSON.parse(body.text)
    if (data?.error || !Array.isArray(data?.features) || data.exceededTransferLimit || data.features.length > 1) throw Error('invalid_decennial_tract')
    if (!data.features.length) return result(catalogId, 'empty', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'No matching 2020 Census tract counts were returned. Check the tract GEOID and vintage.', [], '2020')
    const fields = data.features[0]?.attributes
    if (fields?.GEOID !== context.tract || !Number.isInteger(fields.POP100) || fields.POP100 < 0 || !Number.isInteger(fields.HU100) || fields.HU100 < 0) throw Error('invalid_decennial_tract')
    return result(catalogId, 'available', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'Limited 2020 Decennial tract population and housing-unit counts from Census TIGERweb. Other Decennial tables are not retrieved, and these are not parcel occupants or project units.', [{ tract: context.tract, population: fields.POP100, housingUnits: fields.HU100 }], '2020')
  } catch {
    return result(catalogId, 'error', 'census tract', 'exact_tract_geoid', url.toString(), retrievedAt, 'The 2020 Census tract count response could not be read or validated.')
  }
}

async function realtorCounty(catalogId, context, fetcher, retrievedAt) {
  const county = context.countyFips
  if (!/^\d{5}$/.test(county ?? '')) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'Provide a five-digit county FIPS for the current-month Realtor.com county listing aggregate. A ZIP or parcel identifier is not a county match.')
  if (conflictsWithGeography(context, county)) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'The supplied state, county, and tract identifiers conflict; confirm the geography before retrieving county listings.')
  try {
    const body = await boundedText(realtorCountyUrl, fetcher, 1_200_000)
    if (!body.complete) return result(catalogId, 'incomplete', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'The Realtor.com current-month county file exceeded the bounded request size.')
    const lines = completeLines(body.text, body.complete)
    const header = csvLine(lines.shift() ?? '')
    const index = Object.fromEntries(header.map((name, position) => [name, position]))
    if (!['month_date_yyyymm', 'county_fips', 'median_listing_price', 'active_listing_count', 'median_days_on_market', 'quality_flag'].every(name => Number.isInteger(index[name]))) throw Error('invalid_realtor_county')
    const matching = lines.map(csvLine).filter(row => row[index.county_fips] === county && (context.year === undefined || Number(row[index.month_date_yyyymm].slice(0, 4)) === context.year))
    if (matching.length > 1) throw Error('duplicate_realtor_county')
    if (!matching.length) return result(catalogId, 'empty', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'No matching county row exists in the current-month Realtor.com listing file. This file does not contain historical months.')
    const row = matching[0]
    const monthValue = row[index.month_date_yyyymm]
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(monthValue)) throw Error('invalid_realtor_month')
    const sourceDate = `${monthValue.slice(0, 4)}-${monthValue.slice(4, 6)}`
    if (row[index.quality_flag] === '1') return result(catalogId, 'incomplete', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'Realtor.com flags this county row as outside its typical range; review it at the source before reporting its values.', [], sourceDate)
    if (row[index.quality_flag] !== '0') throw Error('invalid_realtor_flag')
    const medianListingPriceUsd = finiteNumber(row[index.median_listing_price])
    const activeListingCount = finiteNumber(row[index.active_listing_count])
    const medianDaysOnMarket = finiteNumber(row[index.median_days_on_market])
    if ([medianListingPriceUsd, activeListingCount, medianDaysOnMarket].some(value => value === null || value < 0)) throw Error('invalid_realtor_metric')
    return result(catalogId, 'available', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'Realtor.com Economic Research countywide MLS-listed for-sale inventory. Listing prices are asking prices, not sale comparables, rents, or a project appraisal.', [{ countyFips: county, month: sourceDate, medianListingPriceUsd, activeListingCount, medianDaysOnMarket, qualityFlag: false }], sourceDate)
  } catch {
    return result(catalogId, 'error', 'county', 'exact_county_fips', realtorCountyUrl, retrievedAt, 'The Realtor.com county listing file could not be read or validated.')
  }
}

async function zillowCounty(catalogId, context, fetcher, retrievedAt) {
  const county = context.countyFips
  if (!/^\d{5}$/.test(county ?? '')) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, 'Provide a five-digit county FIPS for the Zillow county home value index. A parcel or ZIP identifier does not establish a county match.')
  if (conflictsWithGeography(context, county)) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, 'The supplied state, county, and tract identifiers conflict; confirm the geography before retrieving county home values.')
  try {
    const body = await boundedText(zillowCountyUrl, fetcher, 1_000_000, true)
    const lines = completeLines(body.text, body.complete)
    const header = csvLine(lines.shift() ?? '')
    const index = Object.fromEntries(header.map((name, position) => [name, position]))
    if (!['RegionType', 'StateCodeFIPS', 'MunicipalCodeFIPS'].every(name => Number.isInteger(index[name]))) throw Error('invalid_zillow_header')
    const dates = header.map((value, position) => ({ value, position })).filter(column => /^\d{4}-\d{2}-\d{2}$/.test(column.value) && (context.year === undefined || Number(column.value.slice(0, 4)) === context.year))
    if (!dates.length) return result(catalogId, 'empty', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, 'The requested year has no column in the published Zillow ZHVI county series.')
    const latest = dates.at(-1)
    for (const line of lines) {
      const row = csvLine(line)
      if (row[index.RegionType] !== 'county' || `${row[index.StateCodeFIPS]}${row[index.MunicipalCodeFIPS]}` !== county) continue
      if (row.length !== header.length) throw Error('invalid_zillow_row')
      const typicalHomeValueUsd = finiteNumber(row[latest.position])
      if (typicalHomeValueUsd === null || typicalHomeValueUsd <= 0) return result(catalogId, 'empty', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, 'The published Zillow county ZHVI row has no value for the selected month.', [], latest.value)
      return result(catalogId, 'available', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, 'Zillow ZHVI smoothed, seasonally adjusted mid-tier typical home value for all county homes. This is a modeled county trend, not a sale comparable, appraisal, or project revenue forecast.', [{ countyFips: county, date: latest.value, typicalHomeValueUsd, measure: 'zhvi_all_homes_mid_tier_smoothed_seasonally_adjusted' }], latest.value)
    }
    return result(catalogId, body.complete ? 'empty' : 'incomplete', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, body.complete ? 'No matching county row exists in the Zillow ZHVI file.' : 'The one-megabyte bounded Zillow file scan ended before a matching county row was found.')
  } catch {
    return result(catalogId, 'error', 'county', 'exact_county_fips', zillowCountyUrl, retrievedAt, 'The Zillow county ZHVI series could not be read or validated.')
  }
}

async function opportunityTract(catalogId, context, fetcher, retrievedAt) {
  const tract = context.tract
  if (!/^42003\d{6}$/.test(tract ?? '')) return result(catalogId, 'needs_input', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'Provide an eleven-digit Allegheny County tract identifier. This bounded archive extract covers 2010 tract IDs in Allegheny County only; confirm tract vintage independently.')
  if (conflictsWithGeography(context, tract.slice(0, 5))) return result(catalogId, 'needs_input', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'The supplied tract conflicts with state or county FIPS; confirm its geography before retrieving the historical outcome.')
  try {
    const headerBody = await boundedText(opportunityTractUrl, fetcher, 8192, true)
    const header = csvLine(completeLines(headerBody.text)[0] ?? '')
    const index = Object.fromEntries(header.map((name, position) => [name, position]))
    if (!['state', 'county', 'tract', 'kfr_pooled_pooled_p25'].every(name => Number.isInteger(index[name]))) throw Error('invalid_opportunity_header')
    const window = await boundedText(opportunityTractUrl, fetcher, 300_000, 'bytes=31400000-31699999')
    if (!window.rangeReceived || window.contentRange !== 'bytes 31400000-31699999/41362318') return result(catalogId, 'incomplete', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'The versioned Opportunity Atlas archive changed or did not serve the validated bounded county range.')
    const rows = completeLines(window.text).slice(1).map(csvLine).filter(row => row.length === header.length && /^\d+$/.test(row[index.state]) && /^\d+$/.test(row[index.county]))
    const countyRows = rows.filter(row => row[index.state] === '42' && row[index.county] === '3')
    if (!countyRows.length || !rows.some(row => row[index.state] === '42' && row[index.county] === '1') || !rows.some(row => row[index.state] === '42' && Number(row[index.county]) > 3)) return result(catalogId, 'incomplete', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'The bounded archive range did not contain the complete Allegheny County segment.')
    const matching = countyRows.filter(row => row[index.tract].padStart(6, '0') === tract.slice(5))
    if (matching.length > 1) throw Error('duplicate_opportunity_tract')
    if (!matching.length) return result(catalogId, 'empty', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'The supplied tract identifier has no matching 2010 Allegheny County row. A 2020 tract may differ from the 2010 Atlas geography.')
    const rank = finiteNumber(matching[0][index.kfr_pooled_pooled_p25])
    if (rank === null) return result(catalogId, 'empty', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'The matching historical tract has no reported pooled mobility estimate.', [], '2014-2015')
    if (rank < 0 || rank > 1) throw Error('invalid_opportunity_rank')
    return result(catalogId, 'available', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'Opportunity Atlas modeled mean adult household-income rank for children born 1984-1989 to parents at the 25th income percentile; child income measured in 2014-2015. Source tract boundaries are 2010, caller tract vintage is unverified, and this is not a parcel outcome or development score.', [{ tract, tractVintage: '2010', birthCohort: '1984-1989', meanHouseholdIncomeRankAtParentP25: rank }], '2014-2015')
  } catch {
    return result(catalogId, 'error', '2010 census tract', 'matching_2010_tract_identifier_no_parcel_join', opportunityTractUrl, retrievedAt, 'The Opportunity Atlas tract archive could not be read or validated.')
  }
}

async function hmdaCounty(catalogId, context, fetcher, retrievedAt) {
  const county = context.countyFips
  const year = context.year ?? 2025
  if (!/^\d{5}$/.test(county ?? '') || !Number.isInteger(year) || year < 2018 || year > 2025) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', hmdaAggregationsUrl, retrievedAt, 'Provide a five-digit county FIPS and HMDA data year from 2018 through 2025. Only an aggregate is retrieved.')
  if (conflictsWithGeography(context, county)) return result(catalogId, 'needs_input', 'county', 'exact_county_fips', hmdaAggregationsUrl, retrievedAt, 'The supplied state, county, and tract identifiers conflict; confirm the geography before retrieving HMDA aggregates.')
  const url = new URL(hmdaAggregationsUrl)
  for (const [key, value] of Object.entries({ years: year, counties: county, actions_taken: 1 })) url.searchParams.set(key, String(value))
  try {
    const body = await boundedText(url.toString(), fetcher, 32_768)
    if (!body.complete) return result(catalogId, 'incomplete', 'county', 'exact_county_fips', url.toString(), retrievedAt, 'The HMDA county aggregation exceeded the bounded response size.')
    const data = JSON.parse(body.text)
    if (data?.parameters?.county !== county || data.parameters.actions_taken !== '1' || !Array.isArray(data.aggregations) || data.aggregations.length > 1) throw Error('invalid_hmda_aggregate')
    if (!data.aggregations.length) return result(catalogId, 'empty', 'county', 'exact_county_fips', url.toString(), retrievedAt, 'The HMDA data browser returned no originated-loan aggregate for this county and year.', [], String(year))
    const row = data.aggregations[0]
    if (row.actions_taken !== '1' || !Number.isInteger(row.count) || row.count < 0 || !Number.isFinite(row.sum) || row.sum < 0) throw Error('invalid_hmda_aggregate')
    return result(catalogId, 'available', 'county', 'exact_county_fips', url.toString(), retrievedAt, 'HMDA county aggregate for originated loans across all reported loan purposes and dwelling categories. It does not expose application rows, identify a parcel, or establish available project financing.', [{ countyFips: county, year, actionTaken: 'originated', applicationCount: row.count, reportedLoanAmountUsd: row.sum }], String(year))
  } catch {
    return result(catalogId, 'error', 'county', 'exact_county_fips', url.toString(), retrievedAt, 'The public HMDA county aggregate could not be read or validated.')
  }
}

async function hudFmr(catalogId, context, fetcher, retrievedAt) {
  const { longitude, latitude } = context
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || (context.year !== undefined && context.year !== 2024)) return result(catalogId, 'needs_input', 'HUD FMR area', 'coordinate_intersection', hudFmrLayer, retrievedAt, 'Provide a verified site coordinate for the published FY2024 HUD FMR area layer. This map layer does not contain the latest FY2026 rents.')
  const url = new URL(`${hudFmrLayer}/query`)
  for (const [key, value] of Object.entries({ geometry: `${longitude},${latitude}`, geometryType: 'esriGeometryPoint', spatialRel: 'esriSpatialRelIntersects', inSR: 4326, outFields: 'FMR_CODE,FMR_AREANAME,FMR_0BDR,FMR_1BDR,FMR_2BDR,FMR_3BDR,FMR_4BDR', returnGeometry: 'false', f: 'json' })) url.searchParams.set(key, String(value))
  try {
    const body = await boundedText(url.toString(), fetcher, 32_768)
    if (!body.complete) return result(catalogId, 'incomplete', 'HUD FMR area', 'coordinate_intersection', url.toString(), retrievedAt, 'The HUD FMR map response exceeded the bounded request size.')
    const data = JSON.parse(body.text)
    if (data?.error || !Array.isArray(data?.features) || data.exceededTransferLimit || data.features.length > 1) throw Error('invalid_fmr')
    if (!data.features.length) return result(catalogId, 'empty', 'HUD FMR area', 'coordinate_intersection', url.toString(), retrievedAt, 'No FY2024 HUD FMR area polygon intersected the supplied coordinate.', [], '2024')
    const fields = data.features[0]?.attributes
    if (typeof fields?.FMR_CODE !== 'string' || !/^[-\w]+$/.test(fields.FMR_CODE) || typeof fields.FMR_AREANAME !== 'string' || fields.FMR_AREANAME.length > 120 || !['FMR_0BDR', 'FMR_1BDR', 'FMR_2BDR', 'FMR_3BDR', 'FMR_4BDR'].every(key => Number.isInteger(fields[key]) && fields[key] >= 0)) throw Error('invalid_fmr')
    return result(catalogId, 'available', 'HUD FMR area', 'coordinate_intersection', url.toString(), retrievedAt, 'FY2024 HUD program Fair Market Rents include rent plus essential utilities for the intersected area. These are historical payment-standard inputs, not current FY2026 rents, market rent comparables, or project revenue.', [{ areaCode: fields.FMR_CODE, areaName: fields.FMR_AREANAME, monthlyFmrStudioUsd: fields.FMR_0BDR, monthlyFmrOneBedroomUsd: fields.FMR_1BDR, monthlyFmrTwoBedroomUsd: fields.FMR_2BDR, monthlyFmrThreeBedroomUsd: fields.FMR_3BDR, monthlyFmrFourBedroomUsd: fields.FMR_4BDR }], '2024')
  } catch {
    return result(catalogId, 'error', 'HUD FMR area', 'coordinate_intersection', url.toString(), retrievedAt, 'The HUD FY2024 FMR area response could not be read or validated.')
  }
}

export async function queryRegionalSource(catalogId, context, { fetcher = fetch, now = () => new Date().toISOString() } = {}) {
  if (!regionalIds.has(catalogId)) return null
  const retrievedAt = now()
  if (catalogId === 23) {
    if (!/^\d{5}$/.test(context.countyFips ?? '') || context.year === undefined) return result(23, 'needs_input', 'HUD income-limit area', 'catalog_scope_only_no_record_join', 'https://www.huduser.gov/portal/datasets/il.html', retrievedAt, 'Provide a five-digit county FIPS and fiscal year. A HUD income-limit area, household size and program must also be selected before a limit can be reported.')
    if (context.year !== 2026) return result(23, 'unsupported', 'HUD income-limit area', 'catalog_scope_only_no_record_join', 'https://www.huduser.gov/portal/datasets/il.html', retrievedAt, 'This adapter has not verified a bounded official workbook path for the requested year or parsed an applicable area and household-size limit.')
    return result(23, 'unavailable', 'HUD income-limit area', 'catalog_scope_only_no_record_join', references[23][0], retrievedAt, references[23][2], [], '2026')
  }
  if (catalogId === 21) return lai(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 18) return decennialTract(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 29) return qcew(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 30) return ppi(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 50) return pmms(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 51) return fhfa(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 49) return realtorCounty(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 46) return zillowCounty(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 52) return opportunityTract(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 27) return hmdaCounty(catalogId, context, fetcher, retrievedAt)
  if (catalogId === 22) return hudFmr(catalogId, context, fetcher, retrievedAt)
  const [sourceUrl, geography, summary] = references[catalogId]
  const blockedByAccess = [17, 25, 44].includes(catalogId)
  const requiredField = [26, 42, 59].includes(catalogId) ? 'tract' : [47].includes(catalogId) ? 'countyFips or zip' : null
  const hasField = requiredField === 'tract' ? /^\d{11}$/.test(context.tract ?? '') : requiredField === 'countyFips or zip' ? /^\d{5}$/.test(context.countyFips ?? '') || /^\d{5}$/.test(context.zip ?? '') : true
  const status = blockedByAccess ? 'unavailable' : requiredField && !hasField ? 'needs_input' : 'unsupported'
  return result(catalogId, status, geography, 'catalog_scope_only_no_record_join', sourceUrl, retrievedAt, summary)
}
