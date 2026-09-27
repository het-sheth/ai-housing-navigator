# Application architecture

This describes the connected application implementation on `feat/connected-live-app`. Production verification is a separate release step: adding code does not establish that Supabase, email delivery or the AI provider is configured.

See [source coverage](source-coverage.md) for the supplied zoning map's additional layers and the unresolved difference between its zoning endpoint and the application's endpoint.

## Current request and data flow

```mermaid
flowchart LR
  subgraph Browser[React application]
    HOME[Home and shared navigation]
    WALK[Assess a property]
    EXP[Explore properties]
    COMP[Compare proposals]
    ACCOUNT[Account and email magic link]
    LOCAL[(Device drafts and archives)]
    MAP[Leaflet site context]
    HOME --> WALK & EXP & COMP & ACCOUNT
    WALK & COMP <--> LOCAL
    WALK & EXP & COMP --> MAP
  end
  subgraph Hosted[Vercel API routes]
    CONFIG[Public runtime configuration]
    PROPERTY[Property search, candidates and parcel lookup]
    SCREEN[Screening and supplementary observations]
    SOURCES[Source catalog and bounded source queries]
    ASSIST[AI intake: origin, payload and bearer validation]
  end
  subgraph Supabase[Supabase]
    AUTH[Auth: email magic links]
    SAVED[(Owned immutable project snapshots)]
    LIMITS[(Atomic AI usage reservations)]
  end
  CONFIG --> Browser
  WALK & EXP & COMP --> PROPERTY
  WALK & COMP --> SCREEN
  PUBLIC[County, City, FEMA and other public sources] --> PROPERTY & SCREEN & SOURCES
  ACCOUNT <--> AUTH
  WALK & COMP & ACCOUNT <-->|User bearer and owner RLS| SAVED
  WALK & EXP --> ASSIST
  ASSIST --> AUTH
  ASSIST --> LIMITS
  ASSIST -->|After authorization and budget checks| AI[OpenRouter intake model]
  OSM[OpenStreetMap tiles] --> MAP
```

The home page is `/`; shared navigation links `/projects/new`, `/explore`, `/compare` and `/account`. `/welcome` aliases home, and `/prototype` retains the historical example. Local development uses Vite and `server/dev.mjs`. Hosted public-source routes delegate to the same handlers and remain available without login.

`GET /api/config` exposes only the Supabase URL, publishable key and AI capability flag. The browser Supabase client handles email magic-link sessions. Magic-link delivery and redirect URLs must be configured in the existing project. A logged-in user explicitly saves a walkthrough draft or comparison snapshot to `saved_projects`. Row-level policies restrict access to its owner. Restoring validates the payload and preserves existing device work. Walkthrough screening results remain session-local and are not part of the draft snapshot; comparison snapshots retain dated results.

Hosted `/api/assist` verifies the Supabase bearer token, reserves a request through a server-only Postgres RPC and checks the existing OpenRouter key budget before requesting intake suggestions. AI only suggests activities from the user's words, which the user reviews. It does not search for suitable properties or determine feasibility. Missing configuration fails closed. Shared usage reservations prevent independent serverless instances from bypassing the app limits. The provider key and `SUPABASE_SECRET_KEY` stay on the server. Only service_role can execute the reservation function; it receives the verified user UUID.

The map loads OpenStreetMap tiles directly in the browser. Basemap context, County parcel geometry and screening evidence retain separate provenance and dates. Property display and screening still make independent source requests.

## Source coverage and limits

| Use | Source | Current behavior |
| --- | --- | --- |
| Address/parcel lookup and assessment observation | [WPRDC property assessments](https://data.wprdc.org/dataset/property-assessments), queried through `https://data.wprdc.org/api/3/action/datastore_search` | Exact parcel ID or house number and street filters. Returned assessment fields are normalized in `server/property/live.mjs`. |
| Parcel boundary | [Allegheny County Web Parcels](https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0) | Exact `PIN` match and validated polygon geometry. Parcel IDs remain strings. |
| Municipality | [Allegheny County Municipal Boundaries](https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0) | Within and intersects results must agree on the full parcel. |
| Pittsburgh zoning | [Pittsburgh zoning layer](https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0) | Whole-parcel within/intersects agreement is required. |
| Mapped steep slope | [Pittsburgh 25 percent slope layer](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebSlope25/FeatureServer/0) | Intersecting features are interpreted as mapped flags, not actual grade. |
| Mapped flood zone | [FEMA National Flood Hazard Layer](https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28) | Intersects and within observations feed a bounded map screen, not a flood determination. |
| Provisional zoning use screen | [Pittsburgh use table](https://ecode360.com/45476538) | Narrow check for one detached home in an R1D district. It does not establish permission. |
| Map basemap | [OpenStreetMap tiles](https://tile.openstreetmap.org/{z}/{x}/{y}.png) | Browser tiles and attribution only, not evidence used by screening. |

`server/screening/run.mjs` currently combines core source requests, geometry normalization, rule evaluation, action generation, score gating and response shaping in one handler. Supplementary acquisition is separated into `server/screening/observations.mjs`, returning `sourceObservations` for exact-parcel PLI permits and 13 City map layers. These observations retain their own status and provenance; a mapped overlap is not a completed regulatory assessment. They do not complete the fixed seven-factor rubric.

Screening only fetches City checks and FEMA data after exact parcel and Pittsburgh municipality checks succeed. Non-Pittsburgh parcels return pending first. The R1D rule remains provisional and narrow. Broader zoning requirements, process, infrastructure and financial feasibility remain unassessed. The complete-coverage gate withholds all score values and ranges whenever any required factor is not assessed; current coverage therefore returns pending.

`GET /api/sources` exposes all 60 organizer catalog entries with per-source runtime status and coverage notes. Catalog discovery is distinct from record ingestion. The local inventory found organizer documents and catalog CSVs, not copies of the underlying 60 datasets. Regional statistics, financial sources and reference-only entries have not become parcel evidence merely by appearing in the registry.

`POST /api/sources/query` accepts a catalog ID and validated source-specific context. It routes to property, regional/financial or spatial/reference adapters and returns bounded records, actual geography and match method, provenance, retrieval time and a source vintage when established. Input requirements, unavailable access, incomplete reads and provider errors are explicit. Catalog-wide dispatch does not mean every provider is fully connected: bulk import gaps and access requirements remain visible. These query results do not feed the screening rubric automatically.

Explorer and comparison are integrated pages. Explorer searches bounded County assessment records using confirmed assessment-use and optional ZIP criteria. Work activities record intent but do not establish site fit or narrow records by feasibility. Multiple manual activities can be selected without a prose description. A search candidate remains unconfirmed until an exact parcel lookup supplies an assessment record or mapped boundary. Comparison runs independent dated screens for two proposals on that parcel. A stable shared snapshot of parcel observations is still absent.

## Code boundaries

| Boundary | Files | Contract |
| --- | --- | --- |
| HTTP routes | `api/property/search.mjs`, `api/property/parcel.mjs`, `api/screening/run.mjs`; local equivalent in `server/dev.mjs` | Thin wrappers delegate to shared handlers. |
| Property data | `server/property/live.mjs` | Normalizes source records into parcel candidates and independent assessment/boundary observations, including status and provenance. |
| Assessment | `server/screening/run.mjs` | Accepts a parcel ID and structured proposal, fetches evidence and returns checks, next actions, rubric version and gated score. |
| Supplementary observations | `server/screening/observations.mjs` | Bounded requests for parcel-linked permits and mapped features, independently preserving errors and incomplete responses. |
| Catalog discovery | `server/sources/registry.mjs`, `api/sources.mjs` | `GET /api/sources` distinguishes connected adapters from catalog references. |
| Source retrieval | `server/sources/query.mjs`, `api/sources/query.mjs` | `POST /api/sources/query` validates source ID and geographic input, then bounds and validates the adapter response. |
| Provider adapters | `server/sources/wprdc.mjs`, `core.mjs`, `regional.mjs`, `spatial-reference.mjs`, `nces.mjs`, `zip-range.mjs` | Separate public records, aggregate/financial metrics, geographic observations and document references. |
| Browser contracts | `src/features/projects/property-client.ts`, `src/features/projects/screening-client.ts` | Same-origin requests; screening validates returned parcel, proposal and result shape. |
| Account and cloud persistence | `src/features/account/`, `supabase/migrations/` | Magic-link sessions, owner-scoped immutable snapshots and validated restore. |
| Hosted AI authorization | `api/assist.mjs`, `server/account/`, `server/ai/` | Verified bearer, atomic usage reservation and provider budget checks. |
| Public configuration | `api/config.mjs`, `server/account/config.mjs` | Publishable configuration only; missing credentials leave features unavailable. |
| Local persistence | `src/features/projects/draft-store.ts` | Device-local draft inputs and archives; walkthrough screening results are transient. |

## Proposed seam, not yet implemented

```mermaid
flowchart LR
  SRC[Source adapters] --> OBS[Normalized observations<br/>source, dates, retrieval time, status, unknowns]
  OBS --> RUB[Separate rubric evaluation<br/>explicit coverage and version]
  RUB --> RESP[Validated API response<br/>checks, findings, next actions, score gate]
  RESP --> CLIENT[React API client and results UI]
```

This separation is a future design direction. The current screening handler has not been split into these layers, and its observation objects are not a persisted or shared parcel snapshot.
