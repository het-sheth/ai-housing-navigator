# Current source coverage

This inventory distinguishes runtime inputs from catalog entries and research references. It describes local application code as of September 26, 2026; the hosted checkpoint is older. Metadata availability does not establish successful feature retrieval for every parcel. A returned record or mapped intersection does not establish project permission, site feasibility, ownership or financial viability.

| Source or topic | Current application use | Evidence |
| --- | --- | --- |
| Allegheny County assessments via WPRDC | Runtime exact parcel ID or house number and street search, capped at 20 returned candidates. Selected parcel details retain assessment file date and retrieval time. This is not a countywide search for parcels matching a housing idea. | [`server/property/live.mjs`](../server/property/live.mjs), [`property-client.ts`](../src/features/projects/property-client.ts) |
| Allegheny County Web_Parcels | Runtime exact PIN boundary request for selected parcels. The geometry can be displayed in the 2D map; dataset effective date remains unknown. | [`server/property/live.mjs`](../server/property/live.mjs), [`SiteContextMap.tsx`](../src/features/projects/SiteContextMap.tsx) |
| County municipal boundaries | Runtime whole-parcel municipality resolution before City rules are considered. Ambiguous or failed resolution stays unresolved. | [`server/screening/run.mjs`](../server/screening/run.mjs) |
| Pittsburgh zoning map and code | Runtime whole-parcel district query uses a City GIS layer. A narrow, provisional one-detached-home R1D use-table check cites [eCode360 section 45476538](https://ecode360.com/45476538). The suggested [zoning code page 45474054](https://ecode360.com/45474054), [City zoning map viewer](https://pittsburghpa.maps.arcgis.com/apps/instant/sidebar/index.html?appid=4bb79ea64bf848b3a0560e3856efeccb) and [City zoning guidance](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning) have not been integrated or evaluated as complete rule sources. The viewer uses a different zoning endpoint; equivalence is unverified (see the configuration audit below). Selected overlays are now queried as supplementary mapped observations; dimensions, nonconformity and regulatory interpretation remain unassessed. | [`server/screening/run.mjs`](../server/screening/run.mjs), [source adapter verification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/source-adapter-verification-2026-09-26.md) |
| Pittsburgh mapped 25 percent slope and FEMA flood layer | Runtime spatial flags. They are map screens, not a grade survey or final flood determination. | [`server/screening/run.mjs`](../server/screening/run.mjs) |
| OpenStreetMap | Runtime street map tiles for context. Tiles do not supply parcel or feasibility findings. | [`SiteContextMap.tsx`](../src/features/projects/SiteContextMap.tsx) |
| Sales, regional housing and financial context | The source-query API supports exact-parcel County sales, historical HUD FY2024 FMRs, Zillow county trends, Realtor.com listing aggregates, national PPI and mortgage rates, PA FHFA indexes, HMDA aggregates and historical tract context. These do not feed the project score or establish comparable values. Redfin retrieval remains unfinished. | [Per-source outcomes](source-integration-status.md), `server/sources/regional.mjs`, `server/sources/wprdc.mjs` |
| Elevation, environmental, transit and school context | Source queries return bounded point samples, mapped features, PRT GTFS routes/stops and NCES institution locations. They do not establish surveyed topography, transit accessibility or school assignment. | [Per-source outcomes](source-integration-status.md), `server/sources/spatial-reference.mjs`, `server/sources/nces.mjs` |
| Nearby rent and sale comparables, hard and soft construction costs, surveyed parcel topography, utilities and proposal review path | No runtime evidence or reviewed financial method. The screening API can flag mapped undermining but leaves site conditions, infrastructure and process unassessed, asks for financial assumptions, and withholds every numeric score until all required rubric factors are assessed. | [`server/screening/run.mjs`](../server/screening/run.mjs), [score design](score-design-proposal.md) |
| PHP YCBTH article, Rescope California example, James Eash video and ShurSave/WESA case | References for product or case research, not live parcel evidence or application inputs. The ShurSave case is a historical stress fixture. | [Technical design](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/technical-design-v1-2026-09-26.md) |

Jev is not integrated. The optional local intake handler uses the configured DeepSeek V4 Flash model through OpenRouter to suggest work activities for user confirmation, not to fetch property facts or calculate screening results ([`server/ai/intake.mjs`](../server/ai/intake.mjs)). The hosted assist endpoint returns `ai_not_configured` ([`api/assist.mjs`](../api/assist.mjs)). No paid model request was made for this audit.

Four referenced attachments were not supplied with the source feedback. Their contents cannot be classified or checked against this inventory.

## Supplied zoning map configuration, checked September 26, 2026

The public [app configuration](https://www.arcgis.com/sharing/rest/content/items/4bb79ea64bf848b3a0560e3856efeccb/data?f=json) points to [web map ee49e1c537fc4c458b087356d2104f4c](https://www.arcgis.com/sharing/rest/content/items/ee49e1c537fc4c458b087356d2104f4c/data?f=json). Reading this configuration verifies endpoint identity only, not source completeness or legal currency.

| Layer | Supplied viewer versus application |
| --- | --- |
| Zoning districts | Viewer: `https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebZoning/FeatureServer/0`. Application: `https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0`. These are different endpoints; equivalence and update cadence have not been established. |
| Parcels and potential steep slopes | Viewer uses the same Web_Parcels and PGHWebSlope25 endpoints as the application. |
| Floodplain | Viewer uses the City's `FEMA_2026/FeatureServer/0`; application queries FEMA's national `NFHL/MapServer/28`. Reconcile dates and coverage before claiming equivalence. |
| Other available layers | Viewer includes undermined areas, landslide-prone areas, riparian buffers, historic designations, inclusionary housing, parking and height overlays. The supplementary collector now queries 13 hazard and overlay layers, including these categories. Observations do not constitute a regulatory assessment; the original seven required rubric checks remain separate. |

The City's [zoning guidance page](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning) also identifies certificates of occupancy as evidence of legally allowed property use. The application does not retrieve these records. Assessment use descriptions should not substitute for that evidence.

## Backend integration boundary

`GET /api/sources` lists all 60 organizer catalog rows with runtime status, source URL, geography, granularity and coverage notes. It is a discovery endpoint, not evidence that all 60 underlying datasets have been ingested. The repository inventory found duplicate catalog CSVs and organizer/research documents, with no complete underlying dataset downloads in either repository.

`POST /api/screening/run` can return a separate `sourceObservations` array for Pittsburgh parcels:

- Exact-parcel PLI permit-record lookup, with incomplete pages and source errors disclosed. Historical permits do not establish lawful use or the current review path.
- Mapped undermining and landslide observations, interpreting the source's Yes/No/unknown attributes.
- Stormwater and river riparian buffers, historic districts and designated properties, inclusionary housing, Baum Centre, North Side parking, parking reduction, major transit buffers, height reduction and riverfront height layers.

Each observation carries an identifier, status, coverage, source URL, unknown source date when not established, retrieval time, bounded count and explanation. Data acquisition has bounded concurrency and a deadline. A failed, incomplete or uninterpretable response remains distinct from an empty mapped result. Metadata edit timestamps are not presented as legal effective dates. Supplementary evidence does not create a numeric score or complete a rubric factor by itself.

The browser response contract validates these supplementary observations. The current results screen does not yet render this separate array. Core named checks and next actions continue to display as before. Neither Jev nor another AI model participates in these adapters.

## All-catalog verification checkpoint

A bounded live probe exercised all 60 source-query routes: 35 returned bounded observations or aggregate/point context, seven returned reference metadata, and 18 returned no data with explicit reasons. Empty spatial or exact-ID matches are included in the scoped-query category, not counted as positive findings. Six responses were incomplete. HTTP 200 indicates a valid response envelope, not successful data retrieval. See the [complete outcome table](source-integration-status.md).

The housing files identified in Downloads were two duplicate 60-row catalog CSVs. They are metadata, not the underlying datasets. Unrelated or ambiguously named personal downloads were not opened. Provider access restrictions and unfinished public bulk parsers are listed separately in the outcome table; neither is described as completed integration.

## Hosted latency follow-up

The supplemental collector has a 10-second budget, but the inherited sequential base screening requests can approach 48 seconds under repeated 12-second timeouts. Hosted maximum duration has not been verified for this stack. Successful local checks do not establish worst-case deployment readiness.
