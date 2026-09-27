# Housing Navigator

Housing Navigator helps an Allegheny County housing project lead check a proposed project against bounded public evidence, see what remains unknown, and leave with prioritized questions for the right reviewers. It is a decision support prototype for the AI for Housing Hackathon's Development Feasibility Navigator track. It does not grant permission, establish financial feasibility, or calculate an approval probability.

**Public app:** https://ai-housing-navigator.vercel.app

**Public code:** https://github.com/het-sheth/ai-housing-navigator

**Demo video:** Pending public recording. The hackathon submission requires a 3 to 5 minute video of the working tool with functional and mocked parts identified. Team and member details, affiliations, and attestations belong in the submission form.

The deployed app is the merged [PR #24](https://github.com/het-sheth/ai-housing-navigator/pull/24) build. Its Home page offers three paths:

1. **Assess a property** (`/projects/new`): confirm one County parcel, describe the work, enter relevant proposal assumptions, run named checks, and export a brief with findings and next actions.
2. **Explore properties** (`/explore`): search up to 20 County assessment candidates by recorded use and optional ZIP. Work activities and other needs are retained as notes; they are not site-fit filters. A candidate becomes an assessment parcel only after confirmation.
3. **Compare proposals** (`/compare`): compare two proposals for the same confirmed parcel. Shared source facts and proposal-specific results stay distinct.

The historical Lanark example remains at `/prototype`. The home illustration is illustrative, while parcel evidence uses a 2D map and cited records.

## What is live and what is limited

The deployed PR #24 build has public guest access, device drafts, owner-scoped cloud snapshots, exact-parcel County lookup, bounded Pittsburgh screens, and optional AI suggestions for work activities. AI suggestions require a signed-in session, an enabled hosted service, and available usage allowance; the user reviews and applies them. Public-record checks work without AI. Guests can use cloud snapshots, but a guest account cannot be recovered after sign-out or clearing browser data. General public email delivery is not configured; email links are limited to approved team addresses.

Results show sources, dates when known, named check statuses, missing evidence, and next actions. Narrow individual 0/2 or 2/2 scores appear only where a defined zoning-use or FEMA map rule has enough evidence. There is no combined Development Ease Score. Other zoning requirements, site conditions, review process, infrastructure capacity, and financial feasibility remain unscored. A record lookup, map intersection, or AI classification is not a full feasibility assessment. See [assessment metrics](docs/assessment-metrics.md) and the [demo runbook](docs/video-demo-runbook.md).

**Branch work, not deployed:** The current one-home source branch adds Development requirements for one new detached home on a parcel wholly mapped Pittsburgh R1D-L or R1D-H. It compares exact-parcel County recorded lot area to curated base minimums of 3,000 and 1,200 square feet, respectively, and lists published dimensional references and review/utility next steps. The comparison is arithmetic on recorded area, not a surveyed-dimension, exception, utility-capacity, or zoning-compliance determination. This addition uses the existing assessment flow. It must not be presented as a production feature. See [source coverage](docs/source-coverage.md).

## Run locally

Requires Node 22.12+ and npm. Run the public-data API and Vite in separate terminals:

```sh
npm ci
node server/dev.mjs
```

```sh
npm run dev -- --port 5173 --strictPort
```

Open http://127.0.0.1:5173/. Vite proxies `/api` to the local API on port 5175. The public-record paths need no local credentials. Without hosted account and AI configuration, guest cloud saving and AI suggestions are unavailable; device drafts, manual work selection, and public-data checks remain available. `npm run api:dev` is the configured-environment variant; it expects a local environment file that is not part of this repository. Do not put keys in source control. Hosted AI also requires server-side authentication, an atomic usage reservation, and a restricted provider key budget.

Run the project checks after changes:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Browser smoke scripts are also available in `package.json`. The [architecture](docs/architecture.md) and [current handoff](docs/current.md) describe code boundaries and release evidence.

## Software, data, and API disclosure

The application uses React and React DOM, TypeScript, Vite and its React plugin, Leaflet for the parcel map, Three.js for the Home illustration, IBM Plex fonts through Fontsource, and Supabase JavaScript, Auth, and Postgres for account-owned snapshots. Development and validation use npm, ESLint, Vitest, and Playwright. These are third-party open-source packages; exact versions are in `package.json` and `package-lock.json`. Hosting uses Vercel.

| Public data or reference | Application use and boundary |
| --- | --- |
| [Allegheny County property assessments via WPRDC](https://data.wprdc.org/dataset/property-assessments) and its CKAN API | Candidate search and exact-parcel recorded fields, including lot area when available. Recorded use and area do not establish current occupancy or surveyed dimensions. |
| [Allegheny County parcel GIS](https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0) and [municipal boundaries](https://services1.arcgis.com/vdNDkVykv9vEWFX4/arcgis/rest/services/AlleghenyCountyMunicipalBoundaries/FeatureServer/0) | Parcel outline and municipality resolution for the geographic scope of City checks. |
| [Pittsburgh zoning map](https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0), [R1D use table](https://ecode360.com/45476538), [R1D dimensional table](https://ecode360.com/45474194), and [lot exceptions](https://ecode360.com/45479734) | Mapped district and narrow one-detached-home use screen. The dimensional and exception references support the branch-only one-home supplement; they do not settle parcel compliance. |
| [Pittsburgh mapped 25 percent slopes](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebSlope25/FeatureServer/0), [mapped undermining](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebUndermined/FeatureServer/0), and [FEMA National Flood Hazard Layer](https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28) | Bounded map screens. They do not replace a survey, engineering review, or official flood determination. |
| [Pittsburgh permit records via WPRDC](https://data.wprdc.org/dataset/pli-permits) and other City map layers | Supplementary observations with disclosed count and coverage limits, not complete permit history or automatic regulatory findings. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles | Street context only; map tiles are not assessment evidence. |
| [City Building & Development Application guidance](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Building-Development-Application) and [Pittsburgh Water tap-review guidance](https://www.pgh2o.com/developers-contractors-vendors/permits/water-and-sewer-tap-plan-review) | Branch-only process and utility next-action references, not parcel-specific approval or capacity evidence. |

The separate source-query registry describes a 60-entry organizer catalog and additional bounded public context routes. Catalog inclusion is not ingestion of every underlying dataset, and those routes do not complete the parcel assessment. The screening path requests source data live and does not keep a source-data cache. These public endpoints currently need no app-held API key or per-request payment, but upstream rates and availability can still affect a run. The [source inventory](docs/source-coverage.md) documents coverage and known source differences.

**AI tools and use:** The optional runtime intake calls `deepseek/deepseek-v4-flash-0731` through the OpenRouter API to suggest work activities from the user's description. It does not retrieve parcel facts, set check results, or calculate scores. The project used Codex coding assistance, including Sol for code review and Astra for visual inspection. Generated and assisted work was reviewed with tests and live or clearly labeled synthetic checks. A mocked model response in a test verifies the API contract, not model interpretation quality. Jev / TypeSafe AI is not integrated.

This public repository preserves the project commit history. For the hackathon video and submission, describe the actual recording origin and distinguish live public-source results from synthetic test fixtures, prior staged AI evidence, and any branch-only work.
