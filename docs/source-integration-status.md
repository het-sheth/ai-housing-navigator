# All 60 public source query outcomes

## Follow-on LODES workplace integration, September 27, 2026

Source 28 now has a bounded query of the complete Pennsylvania 2023 LODES workplace all-jobs file. It sums matched blocks for an exact county FIPS or 2020 Census tract. The result is historical employment context, not commuting flows, parcel evidence or development feasibility. If no blocks match, the adapter returns `incomplete` without a numeric total. The table below records an earlier probe of backend commit `e2d91aa`; its source 28 row is historical. The full 60-source probe has not been rerun after HUD and LODES integration.

## Follow-on HUD county integration, September 27, 2026

Source 20 now has a bounded, exact county query against [HUD's CHAS county layer](https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/ACS_5YR_CHAS_Estimate_Data_by_County/FeatureServer/4). A live query for county FIPS `42003` returned one matching Allegheny record: 545,695 occupied housing units (T2_EST1) and 53,055 renter households at or below 30% of HUD area median family income (T8_EST69). These are 2013-2017 special-tabulation county counts, not parcel findings or current housing demand. [HUD's CHAS page](https://www.huduser.gov/portal/datasets/cp.html) describes a newer 2018-2022 release, which this adapter does not parse. The original 60-source table below remains the recorded probe of backend commit `e2d91aa`, before this integration.

Source 23 remains without an income-limit value. HUD lists the [FY2026 Section 8 workbook](https://www.huduser.gov/portal/datasets/il/il26/Section8-FY26.xlsx), effective May 1, 2026. On September 27, 2026, both a HEAD request and a 1 KiB ranged GET to that exact URL returned HTTP 202 with `x-amzn-waf-action: challenge` and no file bytes. The [HUD income limits API](https://www.huduser.gov/portal/dataset/fmr-api.html) requires a bearer token. This is a verified access barrier for that workbook from the current runtime, not evidence that other public years or routes are unavailable. A fiscal year, applicable HUD income-limit area, household size and program remain required before reporting a limit. No limit was inferred.

Tested backend commit: `e2d91aaccf9c4d6af618386048049edbb80700c9`.

Probe timestamp: `2026-09-27T03:33:31.498Z`. This is a bounded sample of the reviewed backend stack, not exhaustive dataset coverage.

The probe returned 35 scoped source/context outcomes, 7 reference-metadata outcomes and 18 no-data outcomes. Empty matches are not positive findings. A valid HTTP envelope does not establish successful retrieval.

Response statuses: `available`: 29, `empty`: 7, `error`: 2, `incomplete`: 6, `needs_input`: 4, `unavailable`: 4, `unsupported`: 8.

| ID | Source | Category | Query mode | Live status | Coverage |
| --- | --- | --- | --- | --- | --- |
| 1 | Allegheny County Property Assessments | bounded_source_observation | live_exact_parcel | available | exact_parcel_id |
| 2 | Allegheny County Property Sale Transactions | bounded_source_observation | live_exact_parcel | empty | exact_parcel_id |
| 3 | Allegheny County Parcel Boundaries | bounded_source_observation | live_exact_parcel | available | exact_parcel_id |
| 4 | Allegheny County GIS Open Data Portal | bounded_source_observation | live_exact_parcel | available | whole_parcel_polygon |
| 5 | PLI Permits | bounded_source_observation | live_exact_parcel | empty | exact_parcel_id |
| 6 | Historical PLI Permits | reference_metadata_only | live_archive_index | available | archive_index_only |
| 7 | PLI / DOMI / Environmental Services Violations | bounded_source_observation | live_exact_parcel | available | exact_parcel_id |
| 8 | Condemned and Dead-End Properties | bounded_source_observation | live_exact_parcel | empty | exact_parcel_id |
| 9 | Pittsburgh Zoning Districts | bounded_source_observation | live_exact_parcel | available | whole_parcel_polygon |
| 10 | Pittsburgh Zoning Code | no_data_returned | document_index | error | public document or catalog index only |
| 11 | Pittsburgh Zoning Board of Adjustment Decisions | reference_metadata_only | document_index | available | public document or catalog index only |
| 12 | Pennsylvania Municipal Codes | reference_metadata_only | document_index | incomplete | public document or catalog index only |
| 13 | Pittsburgh Development / Permit Records via OneStopPGH | no_data_returned | unverified_record_access | unsupported | public_portal_reference |
| 14 | City-Owned Properties | bounded_source_observation | live_exact_parcel | empty | exact_parcel_id |
| 15 | City of Pittsburgh Property Tax Abatements | bounded_source_observation | live_exact_parcel | empty | exact_parcel_id |
| 16 | Allegheny County Housing Needs Assessment | no_data_returned | unavailable_reference | unavailable | public document or catalog index only |
| 17 | American Community Survey 5-Year | no_data_returned | access_required | unavailable | catalog_scope_only_no_record_join |
| 18 | Decennial Census | aggregate_context | live_tract | available | exact_tract_geoid |
| 19 | TIGER/Line Shapefiles | aggregate_context | live_tract | available | exact 11-digit tract GEOID |
| 20 | Comprehensive Housing Affordability Strategy (CHAS) | no_data_returned | public_bulk_not_parsed | unsupported | catalog_scope_only_no_record_join |
| 21 | Location Affordability Index | aggregate_context | live_tract | available | exact_tract_geoid |
| 22 | Fair Market Rents and Small Area FMRs | aggregate_context | live_point | available | coordinate_intersection |
| 23 | HUD Income Limits | no_data_returned | public_bulk_not_parsed | unsupported | catalog_scope_only_no_record_join |
| 24 | Low-Income Housing Tax Credit Database | no_data_returned | catalog_reference | unsupported | catalog_scope_only_no_record_join |
| 25 | National Housing Preservation Database | no_data_returned | access_required | unavailable | catalog_scope_only_no_record_join |
| 26 | USPS Vacancy Data | no_data_returned | catalog_reference | needs_input | catalog_scope_only_no_record_join |
| 27 | Home Mortgage Disclosure Act Data | aggregate_context | live_county_aggregate | available | exact_county_fips |
| 28 | LEHD Origin-Destination Employment Statistics (LODES) | no_data_returned | catalog_reference | unsupported | catalog_scope_only_no_record_join |
| 29 | Quarterly Census of Employment and Wages | aggregate_context | live_regional | available | exact_county_fips |
| 30 | Producer Price Index | aggregate_context | live_regional | available | national_series_no_parcel_join |
| 31 | Pittsburgh Regional Transit GTFS | point_context | live_gtfs_feed_or_point | available | point_radius_500m |
| 32 | PennDOT Open Data | point_context | live_point | incomplete | 100-meter radius around supplied point |
| 33 | OpenStreetMap | reference_metadata_only | document_index | available | public document or catalog index only |
| 34 | OpenAddresses | reference_metadata_only | document_index | available | public document or catalog index only |
| 35 | Pennsylvania Spatial Data Access (PASDA) | reference_metadata_only | document_index | incomplete | public document or catalog index only |
| 36 | USGS 3D Elevation Program | no_data_returned | live_point | error | single coordinate sample |
| 37 | Allegheny County Orthoimagery | reference_metadata_only | document_index | incomplete | public document or catalog index only |
| 38 | FEMA National Flood Hazard Layer | bounded_source_observation | live_exact_parcel | available | whole_parcel_polygon |
| 39 | PA DEP eMapPA | point_context | live_point | incomplete | 250-meter radius around supplied point |
| 40 | Pittsburgh Steep Slopes (25% or greater) | bounded_source_observation | live_exact_parcel | available | whole_parcel_polygon |
| 41 | Pittsburgh Undermined Areas | bounded_source_observation | live_exact_parcel | empty | whole_parcel_polygon |
| 42 | EPA EJScreen | no_data_returned | catalog_reference | needs_input | catalog_scope_only_no_record_join |
| 43 | National Land Cover Database | point_context | live_point | available | single 30-meter raster pixel |
| 44 | NOAA Climate Data Online | no_data_returned | access_required | unavailable | catalog_scope_only_no_record_join |
| 45 | ResStock Public Data | no_data_returned | catalog_reference | unsupported | catalog_scope_only_no_record_join |
| 46 | Zillow Research Housing Data | aggregate_context | live_regional | available | exact_county_fips |
| 47 | Redfin Housing Market Data Center | no_data_returned | catalog_reference | needs_input | catalog_scope_only_no_record_join |
| 48 | Redfin Migration Patterns | no_data_returned | catalog_reference | unsupported | catalog_scope_only_no_record_join |
| 49 | Realtor.com Residential Real Estate Data Library | aggregate_context | live_regional | available | exact_county_fips |
| 50 | Primary Mortgage Market Survey | aggregate_context | live_regional | available | national_series_no_parcel_join |
| 51 | FHFA House Price Index | aggregate_context | live_regional | available | state_derived_from_county_fips |
| 52 | Opportunity Atlas | aggregate_context | live_2010_tract_context | available | matching_2010_tract_identifier_no_parcel_join |
| 53 | Allegheny County 311 / Pittsburgh 311 Requests | aggregate_context | aggregate_only | available | dataset_record_count |
| 54 | NCES School Locations and Characteristics | point_context | live_school_location_context | incomplete | point_radius_3000m |
| 55 | Allegheny County Real Estate Tax Delinquency | aggregate_context | aggregate_only | available | dataset_record_count |
| 56 | City of Pittsburgh and School District Property Tax Delinquency | aggregate_context | aggregate_only | available | dataset_record_count |
| 57 | Mortgage Foreclosures | aggregate_context | aggregate_only | available | dataset_record_count |
| 58 | City-owned property | bounded_source_observation | live_exact_parcel | empty | exact_parcel_id |
| 59 | Mercatus Commuter Market Access Dataset for Congested Auto Travel (McMADCAT) | no_data_returned | catalog_reference | needs_input | catalog_scope_only_no_record_join |
| 60 | Access Across America | no_data_returned | catalog_reference | unsupported | catalog_scope_only_no_record_join |

The primary probe recorded a USGS elevation error for ID 36. One separate bounded retry succeeded; the table preserves the original error. The official zoning-code page (ID 10) returned HTTP 403.

## Interpretation and remaining work

Reference metadata does not mean a document was fully read or its rules implemented. Incomplete responses disclose sampling, coverage or response limits. At the recorded probe, public bulk paths still needed parser or selector work, including CHAS, income limits, LIHTC, LODES, ResStock and Access Across America. The follow-on sections above describe the narrower CHAS and LODES adapters now integrated. Other entries need explicit geography or dataset selection. Access requirements and provider failures are described below; they do not imply a source does not exist.

Historical HUD FY2024 rents and historical Opportunity Atlas cohorts are not current market estimates. Supplementary observations and catalog query results are not automatically scored. Financial feasibility, site investigation, infrastructure and the reviewed proposal process remain incomplete.

## Source-specific scope and reasons

| ID | Verified source | Scope or remaining limitation |
| --- | --- | --- |
| 1 | [Allegheny County Property Assessments](https://data.wprdc.org/api/3/action/datastore_search?resource_id=property_assessments_table) | Assessment classification and value are not current physical condition, lawful use or market value. |
| 2 | [Allegheny County Property Sale Transactions](https://data.wprdc.org/api/3/action/datastore_search?resource_id=5bbe6c55-bce6-4edb-9d04-68edeb6bf7b1) | These are transactions for the selected parcel, not a nearby comparable set or a validated market estimate. |
| 3 | [Allegheny County Parcel Boundaries](https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0) | Validated County polygonal geometry was returned. Boundary display is available through the property API; its effective date remains unknown. |
| 4 | [Allegheny County GIS Open Data Portal](https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0) | The County municipality layer returns one consistent whole-parcel municipality. Confirm legal jurisdiction if boundaries conflict with other records. |
| 5 | [PLI Permits](https://data.wprdc.org/api/3/action/datastore_search?resource_id=f4d1177a-f597-4c32-8cbf-7885f56253f6) | Historical City permit records do not establish lawful use or the current review path. |
| 6 | [Historical PLI Permits](https://data.wprdc.org/api/3/action/package_show?id=city-of-pittsburgh-building-permit-summary) | Official historical permit summary tables are indexed. No parcel records were queried; archive coverage and a cross-table exact parcel join remain unverified. |
| 7 | [PLI / DOMI / Environmental Services Violations](https://data.wprdc.org/api/3/action/datastore_search?resource_id=70c06278-92c5-4040-ab28-17671866f81c) | City violation records require status and applicability review; this search is not a current condition or compliance finding. |
| 8 | [Condemned and Dead-End Properties](https://data.wprdc.org/api/3/action/datastore_search?resource_id=0a963f26-eb4b-4325-bbbc-3ddf6a871410) | City condemned-property records are historical observations and need current City verification. |
| 9 | [Pittsburgh Zoning Districts](https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0) | This is a mapped district observation only. Layer status is not project approval, and the City viewer uses a different zoning endpoint whose equivalence remains unverified. |
| 10 | [Pittsburgh Zoning Code](https://ecode360.com/45474054) | The Pittsburgh Title 9 Zoning Code page denied or failed a bounded GET. No site observation was retrieved. |
| 11 | [Pittsburgh Zoning Board of Adjustment Decisions](https://www.pittsburghpa.gov/Training/DCP-BC-Archive/Zoning-Board-of-Adjustment) | Pittsburgh Zoning Board archive returned public decision index metadata. This is not a parcel observation or permission finding. |
| 12 | [Pennsylvania Municipal Codes](https://www.generalcode.com/text-library/?clbc=true) | Pennsylvania municipal code library returned public code index metadata. This is not a parcel observation or permission finding. |
| 13 | [Pittsburgh Development / Permit Records via OneStopPGH](https://onestoppgh.pittsburghpa.gov/) | OneStopPGH is a public portal; an authenticated or stable machine-readable records API and exact parcel join have not been verified. |
| 14 | [City-Owned Properties](https://data.wprdc.org/api/3/action/datastore_search?resource_id=e1dcee82-9179-4306-8167-5891915b62a7) | A City inventory record does not establish current title, control or transfer availability. |
| 15 | [City of Pittsburgh Property Tax Abatements](https://data.wprdc.org/api/3/action/datastore_search?resource_id=fd924520-d568-4da2-967c-60b3a305e681) | A recorded abatement is not an eligibility or financing determination for this proposal. |
| 16 | [Allegheny County Housing Needs Assessment](https://www.alleghenycounty.us/Services/Housing/Housing-Needs-Assessment) | The catalog target for Allegheny County Housing Needs Assessment is unavailable. No source document or site observation was retrieved. |
| 17 | [American Community Survey 5-Year](https://api.census.gov/data/2024/acs/acs5) | The ACS API query returned a Missing Key page without a registered key. Public bulk ACS files exist but are not parsed by this adapter; no ACS metric is inferred. |
| 18 | [Decennial Census](https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/Tracts_Blocks/MapServer/0/query?where=GEOID%3D%2742003050900%27&outFields=GEOID%2CPOP100%2CHU100&returnGeometry=false&f=json) | Limited 2020 Decennial tract population and housing-unit counts from Census TIGERweb. Other Decennial tables are not retrieved, and these are not parcel occupants or project units. |
| 19 | [TIGER/Line Shapefiles](https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/Tracts_Blocks/MapServer/0/query?where=GEOID%3D%2742003050900%27&outFields=GEOID%2CNAME%2CPOP100%2CHU100&returnGeometry=false&f=json) | Matching 2020 Census tract counts are context, not parcel feasibility. |
| 20 | [Comprehensive Housing Affordability Strategy (CHAS)](https://www.huduser.gov/portal/datasets/cp.html) | The CHAS API needs a bearer token, while public Pennsylvania bulk files are available. This adapter has not parsed their table-specific special-tabulation geographies or selected a CHAS metric. |
| 21 | [Location Affordability Index](https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Location_Affordability_Index_v3/FeatureServer/0/query?where=GEOID%3D%2742003050900%27&outFields=GEOID%2Cmedian_gross_rent%2Cmedian_hh_income%2Chh1_ht_renters&returnGeometry=false&f=json) | HUD LAI v3 uses 2012-2016 inputs. Profile 1 renter housing and transportation cost is modeled as a percent of income; it does not describe an actual household or parcel feasibility. |
| 22 | [Fair Market Rents and Small Area FMRs](https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Fair_Market_Rents/FeatureServer/0/query?geometry=-80.01%2C40.46&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&outFields=FMR_CODE%2CFMR_AREANAME%2CFMR_0BDR%2CFMR_1BDR%2CFMR_2BDR%2CFMR_3BDR%2CFMR_4BDR&returnGeometry=false&f=json) | FY2024 HUD program Fair Market Rents include rent plus essential utilities for the intersected area. These are historical payment-standard inputs, not current FY2026 rents, market rent comparables, or project revenue. |
| 23 | [HUD Income Limits](https://www.huduser.gov/portal/dataset/fmr-api.html) | The HUD Income Limits API needs a bearer token. Public files require fiscal year, HUD income-limit area, and household size before an applicable limit can be reported. |
| 24 | [Low-Income Housing Tax Credit Database](https://www.huduser.gov/lihtc/) | HUD offers a selective LIHTC county query and a public project archive, but this adapter has not parsed that query. The direct archive probe received a site challenge. Nearby projects are not a site subsidy determination. |
| 25 | [National Housing Preservation Database](https://preservationdatabase.org/) | National Housing Preservation Database access requires registration; no public anonymous record query is configured. |
| 26 | [USPS Vacancy Data](https://www.huduser.gov/portal/datasets/usps.html) | USPS vacancy data are distributed as tract aggregates through HUD downloads; no verified bounded tract endpoint is configured. |
| 27 | [Home Mortgage Disclosure Act Data](https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?years=2025&counties=42003&actions_taken=1) | HMDA county aggregate for originated loans across all reported loan purposes and dwelling categories. It does not expose application rows, identify a parcel, or establish available project financing. |
| 28 | [LEHD Origin-Destination Employment Statistics (LODES)](https://lehd.ces.census.gov/data/) | LODES origin-destination files are state bulk block flows. A parcel, tract, or county alone does not specify the commuting statistic or version to retrieve. |
| 29 | [Quarterly Census of Employment and Wages](https://data.bls.gov/cew/data/api/2024/a/area/42003.csv) | Countywide all-industry, all-ownership annual employment and wages. These are not project jobs or construction costs. |
| 30 | [Producer Price Index](https://api.bls.gov/publicAPI/v1/timeseries/data/WPU00000000) | All-commodities producer price index. It is not a parcel construction cost, contractor quote, or financial feasibility estimate. |
| 31 | [Pittsburgh Regional Transit GTFS](https://www.rideprt.org/developerresources/GTFS.zip) | Official static PRT GTFS route and stop location records. Straight-line proximity is not route service, schedule availability, accessible travel, or an accessibility score. |
| 32 | [PennDOT Open Data](https://gis.penndot.gov/arcgis/rest/services/opendata/roadwaytraffic/MapServer/0/query?where=1%3D1&geometry=-80.01%2C40.46&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=100&units=esriSRUnit_Meter&returnCountOnly=true&f=json) | No nearby traffic segment was returned, but point jurisdiction and provider coverage are not verified; road access remains unassessed. |
| 33 | [OpenStreetMap](https://www.openstreetmap.org/) | OpenStreetMap returned public map data portal metadata. This is not a parcel observation or permission finding. |
| 34 | [OpenAddresses](https://openaddresses.io/) | OpenAddresses returned public bulk address portal metadata. This is not a parcel observation or permission finding. |
| 35 | [Pennsylvania Spatial Data Access (PASDA)](https://www.pasda.psu.edu/) | Pennsylvania Spatial Data Access returned public data portal metadata. This is not a parcel observation or permission finding. |
| 36 | [USGS 3D Elevation Program](https://epqs.nationalmap.gov/v1/json?x=-80.01&y=40.46&units=Meters&output=json) | The USGS elevation point service could not be checked. |
| 37 | [Allegheny County Orthoimagery](https://www.pasda.psu.edu/uci/SearchResults.aspx?Keyword=Allegheny%20County%20Imagery) | Allegheny County orthoimagery search returned public imagery catalog metadata. This is not a parcel observation or permission finding. |
| 38 | [FEMA National Flood Hazard Layer](https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28) | FEMA mapped zones are a screening observation, not a flood determination. Confirm panel and effective date. |
| 39 | [PA DEP eMapPA](https://gis.dep.pa.gov/depgisprd/rest/services/emappa/eMapPA_External/FeatureServer/36/query?where=1%3D1&geometry=-80.01%2C40.46&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=250&units=esriSRUnit_Meter&returnCountOnly=true&f=json) | No nearby abandoned mine land point was returned, but point jurisdiction and provider coverage are not verified; site risk remains unassessed. |
| 40 | [Pittsburgh Steep Slopes (25% or greater)](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebSlope25/FeatureServer/0) | Mapped Yes, No or unknown flags require source and site review; a No flag is not a site safety clearance. |
| 41 | [Pittsburgh Undermined Areas](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebUndermined/FeatureServer/0) | No intersecting City feature was returned. This is not a site safety clearance. |
| 42 | [EPA EJScreen](https://www.epa.gov/ejscreen/download-ejscreen-data) | EJScreen provides national indicator downloads; no verified bounded geography endpoint and vintage are configured for this source. |
| 43 | [National Land Cover Database](https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover/ImageServer/identify?geometry=%7B%22x%22%3A-80.01%2C%22y%22%3A40.46%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&geometryType=esriGeometryPoint&returnGeometry=false&returnCatalogItems=true&maxItemCount=1&f=json) | One annual NLCD pixel is context, not a parcel-wide condition or development permission. |
| 44 | [NOAA Climate Data Online](https://www.ncei.noaa.gov/cdo-web/) | NOAA Climate Data Online requires a token and an explicit dataset, station, and date range. Weather station data are not parcel climate findings. |
| 45 | [ResStock Public Data](https://resstock.nrel.gov/) | ResStock publishes modeled scenario datasets, not a verified bounded parcel or county observation endpoint. Scenario and vintage selection are required. |
| 46 | [Zillow Research Housing Data](https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv) | Zillow ZHVI smoothed, seasonally adjusted mid-tier typical home value for all county homes. This is a modeled county trend, not a sale comparable, appraisal, or project revenue forecast. |
| 47 | [Redfin Housing Market Data Center](https://www.redfin.com/news/data-center/downloads/) | Redfin offers filtered market aggregate CSV downloads in its browser interface. Direct automated access received a robot challenge, and a verified stable bounded CSV query is not configured. |
| 48 | [Redfin Migration Patterns](https://www.redfin.com/news/data-center/migration-patterns/) | Redfin migration measures metro search flows, not parcel demand. An origin/destination and period are required. |
| 49 | [Realtor.com Residential Real Estate Data Library](https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_County.csv) | Realtor.com Economic Research countywide MLS-listed for-sale inventory. Listing prices are asking prices, not sale comparables, rents, or a project appraisal. |
| 50 | [Primary Mortgage Market Survey](https://www.freddiemac.com/pmms/docs/PMMS_history.csv) | Freddie Mac national weekly mortgage survey rates; actual financing terms and project funding remain unassessed. |
| 51 | [FHFA House Price Index](https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_state.csv) | Pennsylvania all-transactions house price index. This is a state trend, not a parcel appraisal or comparable sale. |
| 52 | [Opportunity Atlas](https://opportunityinsights.org/wp-content/uploads/2024/08/tract_outcomes_late_simple.csv) | Opportunity Atlas modeled mean adult household-income rank for children born 1984-1989 to parents at the 25th income percentile; child income measured in 2014-2015. Source tract boundaries are 2010, caller tract vintage is unverified, and this is not a parcel outcome or development score. |
| 53 | [Allegheny County 311 / Pittsburgh 311 Requests](https://data.wprdc.org/api/3/action/datastore_search?resource_id=29462525-62a6-45bf-9b5e-ad2e1c06348d) | The 311 dataset record count is not parcel evidence. The source tract field is not reliable enough for a tract-level absence claim. |
| 54 | [NCES School Locations and Characteristics](https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2324/MapServer/0/query?where=1%3D1&geometry=-80.01%2C40.46&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=3000&units=esriSRUnit_Meter&outFields=NCESSCH%2CNAME%2CCNTY%2CSTFIP%2CCITY%2CSCHOOLYEAR&returnGeometry=false&orderByFields=NCESSCH+ASC&resultRecordCount=19&f=json) | NCES EDGE 2023-2024 public school locations: 20 matched. Only the first 19 institution records are shown. Locations do not establish attendance boundaries, school assignment, or parcel feasibility. |
| 55 | [Allegheny County Real Estate Tax Delinquency](https://data.wprdc.org/api/3/action/datastore_search?resource_id=96e9d6b2-3e1a-4a0c-8ef6-23a049c263d8) | This is the public dataset record count, not parcel evidence or a financial assessment. Individual personal financial records are not queried. |
| 56 | [City of Pittsburgh and School District Property Tax Delinquency](https://data.wprdc.org/api/3/action/datastore_search?resource_id=ed0d1550-c300-4114-865c-82dc7c23235b) | This is the public dataset record count, not parcel evidence or a financial assessment. Individual personal financial records are not queried. |
| 57 | [Mortgage Foreclosures](https://data.wprdc.org/api/3/action/datastore_search?resource_id=859bccfd-0e12-4161-a348-313d734f25fd) | This is the public dataset record count, not parcel evidence or a financial assessment. Individual personal financial records are not queried. |
| 58 | [City-owned property](https://data.wprdc.org/api/3/action/datastore_search?resource_id=e1dcee82-9179-4306-8167-5891915b62a7) | This catalog row duplicates the City-owned properties source. A City inventory record does not establish current title or availability. |
| 59 | [Mercatus Commuter Market Access Dataset for Congested Auto Travel (McMADCAT)](https://www.mercatus.org/commuter-market-access-dataset) | McMADCAT publishes tract accessibility files; the measure and travel-time band must be chosen before a tract value can be interpreted. |
| 60 | [Access Across America](https://access.umn.edu/ao-research/aaa) | Access Across America provides multiple mode, destination, and time measures. No single county or parcel value follows from a parcel ID. |
