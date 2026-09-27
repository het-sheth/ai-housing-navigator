import { describe, expect, it, vi } from 'vitest'
import { queryRegionalSource } from './regional.mjs'

const retrievedAt = '2026-09-26T20:00:00.000Z'
const now = () => retrievedAt
const response = (body: string, status = 200) => new Response(body, { status })

describe('regional and financial source queries', () => {
  it('keeps unowned catalog IDs outside this adapter', async () => {
    expect(await queryRegionalSource(1, {}, { now })).toBeNull()
  })

  it('returns a county QCEW total with disclosed annual geography and wage units', async () => {
    const csv = '"area_fips","own_code","industry_code","agglvl_code","size_code","year","qtr","disclosure_code","annual_avg_estabs","annual_avg_emplvl","total_annual_wages","taxable_annual_wages","annual_contributions","annual_avg_wkly_wage","avg_annual_pay"\n"42003","0","10","70","0","2024","A","",36316,670637,52508635103,5978900274,209787598,1506,78297\n'
    const fetcher = vi.fn(async () => response(csv, 206))
    const result = await queryRegionalSource(29, { countyFips: '42003', year: 2024 }, { fetcher, now })
    expect(result).toMatchObject({ catalogId: 29, status: 'available', coverage: { geography: 'county', matchMethod: 'exact_county_fips' }, sourceDate: '2024', retrievedAt, records: [{ countyFips: '42003', year: 2024, annualAverageEmployment: 670637, annualAverageWeeklyWage: 1506, averageAnnualPay: 78297 }] })
    expect(String(fetcher.mock.calls[0][0])).toBe('https://data.bls.gov/cew/data/api/2024/a/area/42003.csv')
  })

  it('does not convert a truncated QCEW response into an empty result', async () => {
    const fetcher = vi.fn(async () => response('"area_fips","own_code","industry_code","agglvl_code","size_code","year","qtr","disclosure_code","annual_avg_estabs","annual_avg_emplvl","total_annual_wages","taxable_annual_wages","annual_contributions","annual_avg_wkly_wage","avg_annual_pay"\n"42003","1","10","70","0","2024","A","",176,13717,1318536215,0,0,1849,96124\n', 206))
    const result = await queryRegionalSource(29, { countyFips: '42003', year: 2024 }, { fetcher, now })
    expect(result).toMatchObject({ status: 'incomplete', records: [] })
  })

  it('ignores a QCEW row that is not the county total aggregation level', async () => {
    const csv = 'area_fips,own_code,industry_code,agglvl_code,size_code,year,qtr,disclosure_code,annual_avg_estabs,annual_avg_emplvl,annual_avg_wkly_wage,avg_annual_pay\n42003,0,10,99,0,2024,A,,1,2,3,4\n42003,0,10,70,0,2024,A,,36316,670637,1506,78297\n'
    const result = await queryRegionalSource(29, { countyFips: '42003', year: 2024 }, { fetcher: vi.fn(async () => response(csv)), now })
    expect(result).toMatchObject({ status: 'available', records: [{ annualAverageEmployment: 670637 }] })
  })

  it('returns a national PPI observation without describing it as parcel cost', async () => {
    const fetcher = vi.fn(async () => response(JSON.stringify({ status: 'REQUEST_SUCCEEDED', Results: { series: [{ seriesID: 'WPU00000000', data: [{ year: '2026', period: 'M08', value: '287.928', footnotes: [{ code: 'P', text: 'Preliminary.' }] }] }] } })))
    const result = await queryRegionalSource(30, { parcelId: '0046R00029000000' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'United States', matchMethod: 'national_series_no_parcel_join' }, sourceDate: '2026-08', records: [{ seriesId: 'WPU00000000', period: '2026-08', value: 287.928, unit: 'index', preliminary: true }] })
    expect(result.summary).toMatch(/not a parcel construction cost/i)
  })

  it('selects the latest Freddie Mac PMMS week and keeps it national', async () => {
    const csv = 'date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread\n9/17/2026,6.95,,6.26,,,,,\n9/24/2026,7.03,,6.42,,,,,\n'
    const result = await queryRegionalSource(50, { countyFips: '42003' }, { fetcher: vi.fn(async () => response(csv)), now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'United States', matchMethod: 'national_series_no_parcel_join' }, sourceDate: '2026-09-24', records: [{ date: '2026-09-24', thirtyYearFixedRatePercent: 7.03, fifteenYearFixedRatePercent: 6.42 }] })
  })

  it('selects the latest Pennsylvania FHFA state index without claiming a county match', async () => {
    const csv = 'AK,2026,1,123.45\nPA,2025,4,310.50\nPA,2026,2,321.20\n'
    const result = await queryRegionalSource(51, { countyFips: '42003' }, { fetcher: vi.fn(async () => response(csv)), now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'state', matchMethod: 'state_derived_from_county_fips' }, sourceDate: '2026-Q2', records: [{ state: 'PA', year: 2026, quarter: 2, value: 321.2, unit: 'index' }] })
  })

  it('requires explicit geography and records source-specific token barriers', async () => {
    expect(await queryRegionalSource(29, {}, { now })).toMatchObject({ status: 'needs_input', records: [] })
    expect(await queryRegionalSource(22, { countyFips: '42003' }, { now })).toMatchObject({ status: 'needs_input', records: [], sourceUrl: 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Fair_Market_Rents/FeatureServer/0' })
    expect(await queryRegionalSource(17, { countyFips: '42003' }, { now })).toMatchObject({ status: 'unavailable', records: [], sourceUrl: 'https://api.census.gov/data/2024/acs/acs5' })
  })

  it('queries the official HUD LAI layer by exact tract and retains its old source vintage', async () => {
    const fetcher = vi.fn(async () => response(JSON.stringify({ features: [{ attributes: { GEOID: '42003050900', median_gross_rent: 745, median_hh_income: 49710, hh1_ht_renters: 0.42 } }] })))
    const result = await queryRegionalSource(21, { tract: '42003050900' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', sourceDate: '2012-2016', coverage: { geography: 'census tract', matchMethod: 'exact_tract_geoid' }, records: [{ tract: '42003050900', medianGrossRent: 745, medianHouseholdIncome: 49710, modeledRenterHousingTransportationPercent: 0.42, householdProfile: 'profile_1' }] })
    expect(String(fetcher.mock.calls[0][0])).toContain('GEOID%3D%2742003050900%27')
  })

  it('rejects contradictory supplied geographies before binding tract or state data', async () => {
    const fetcher = vi.fn()
    expect(await queryRegionalSource(21, { tract: '42003050900', countyFips: '36061' }, { fetcher, now })).toMatchObject({ status: 'needs_input', records: [] })
    expect(await queryRegionalSource(51, { stateFips: '42', countyFips: '36061' }, { fetcher, now })).toMatchObject({ status: 'needs_input', records: [] })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns only the key-free 2020 Decennial tract counts exposed by TIGERweb', async () => {
    const fetcher = vi.fn(async () => response(JSON.stringify({ features: [{ attributes: { GEOID: '42003565300', POP100: 1238, HU100: 579 } }] })))
    const result = await queryRegionalSource(18, { tract: '42003565300', countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', sourceDate: '2020', coverage: { geography: 'census tract', matchMethod: 'exact_tract_geoid' }, records: [{ tract: '42003565300', population: 1238, housingUnits: 579 }] })
    expect(result.summary).toMatch(/limited.*counts/i)
  })

  it('returns the exact Realtor county listing aggregate with its quality flag', async () => {
    const csv = 'month_date_yyyymm,county_fips,county_name,median_listing_price,active_listing_count,median_days_on_market,quality_flag\n202608,42001,"adams, pa",250000,100,30,0\n202608,42003,"allegheny, pa",255000,3386,53,0\n'
    const result = await queryRegionalSource(49, { countyFips: '42003' }, { fetcher: vi.fn(async () => response(csv)), now })
    expect(result).toMatchObject({ status: 'available', sourceDate: '2026-08', coverage: { geography: 'county', matchMethod: 'exact_county_fips' }, records: [{ countyFips: '42003', month: '2026-08', medianListingPriceUsd: 255000, activeListingCount: 3386, medianDaysOnMarket: 53, qualityFlag: false }] })
    expect(result.summary).toMatch(/not sale comparables/i)
  })

  it('does not report Realtor flagged values as reliable observations', async () => {
    const csv = 'month_date_yyyymm,county_fips,county_name,median_listing_price,active_listing_count,median_days_on_market,quality_flag\n202608,42003,"allegheny, pa",255000,3386,53,1\n'
    const result = await queryRegionalSource(49, { countyFips: '42003' }, { fetcher: vi.fn(async () => response(csv)), now })
    expect(result).toMatchObject({ status: 'incomplete', records: [], sourceDate: '2026-08' })
  })

  it('reads an exact Zillow county home value from a bounded prefix', async () => {
    const csv = 'RegionID,SizeRank,RegionName,RegionType,StateName,State,Metro,StateCodeFIPS,MunicipalCodeFIPS,2026-07-31,2026-08-31\n2614,35,Allegheny County,county,PA,PA,"Pittsburgh, PA",42,003,240000,241653.1335\n'
    const fetcher = vi.fn(async () => response(csv, 206))
    const result = await queryRegionalSource(46, { countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', sourceDate: '2026-08-31', coverage: { geography: 'county', matchMethod: 'exact_county_fips' }, records: [{ countyFips: '42003', date: '2026-08-31', typicalHomeValueUsd: 241653.1335, measure: 'zhvi_all_homes_mid_tier_smoothed_seasonally_adjusted' }] })
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ Range: 'bytes=0-999999' })
  })

  it('treats a missing Zillow county in a truncated prefix as incomplete', async () => {
    const csv = 'RegionID,SizeRank,RegionName,RegionType,StateName,State,Metro,StateCodeFIPS,MunicipalCodeFIPS,2026-08-31\n100,1,Adams County,county,PA,PA,"Gettysburg, PA",42,001,250000\n'
    const result = await queryRegionalSource(46, { countyFips: '42003' }, { fetcher: vi.fn(async () => response(csv, 206)), now })
    expect(result).toMatchObject({ status: 'incomplete', records: [] })
  })

  it('returns a bounded 2010 tract Opportunity Atlas mobility observation without a parcel claim', async () => {
    const header = 'state,county,tract,cz,czname,kfr_pooled_pooled_p25\n'
    const window = 'partial-first-line\n42,1,100,,Harrisburg,0.40\n42,3,50900,16300,Pittsburgh,.31969893\n42,5,100,,Somewhere,0.50\n'
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => (options.headers as Record<string, string>).Range === 'bytes=0-8191'
      ? response(header, 206)
      : new Response(window, { status: 206, headers: { 'Content-Range': 'bytes 31400000-31699999/41362318' } }))
    const result = await queryRegionalSource(52, { tract: '42003050900', countyFips: '42003' }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: '2010 census tract', matchMethod: 'matching_2010_tract_identifier_no_parcel_join' }, sourceDate: '2014-2015', records: [{ tract: '42003050900', tractVintage: '2010', birthCohort: '1984-1989', meanHouseholdIncomeRankAtParentP25: 0.31969893 }] })
  })

  it('returns only an HMDA county aggregate, never loan-level records', async () => {
    const fetcher = vi.fn(async () => response(JSON.stringify({ parameters: { county: '42003', actions_taken: '1' }, aggregations: [{ count: 26766, sum: 6247350000, actions_taken: '1' }] })))
    const result = await queryRegionalSource(27, { countyFips: '42003', year: 2025 }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'county', matchMethod: 'exact_county_fips' }, sourceDate: '2025', records: [{ countyFips: '42003', year: 2025, actionTaken: 'originated', applicationCount: 26766, reportedLoanAmountUsd: 6247350000 }] })
    expect(String(fetcher.mock.calls[0][0])).toContain('counties=42003')
  })

  it('returns a coordinate-matched historic HUD FMR area without claiming current rent', async () => {
    const fetcher = vi.fn(async () => response(JSON.stringify({ features: [{ attributes: { FMR_CODE: 'METRO38300M38300', FMR_AREANAME: 'Pittsburgh, PA HUD Metro FMR Area', FMR_0BDR: 1001, FMR_1BDR: 1077, FMR_2BDR: 1299, FMR_3BDR: 1661, FMR_4BDR: 1789 } }] })))
    const result = await queryRegionalSource(22, { latitude: 40.44, longitude: -79.9 }, { fetcher, now })
    expect(result).toMatchObject({ status: 'available', coverage: { geography: 'HUD FMR area', matchMethod: 'coordinate_intersection' }, sourceDate: '2024', records: [{ areaCode: 'METRO38300M38300', monthlyFmrTwoBedroomUsd: 1299 }] })
    expect(result.summary).toMatch(/FY2024/)
  })
})
