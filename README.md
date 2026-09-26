# Housing Navigator

A local early-diligence prototype for one verified-date Pittsburgh case: 1623 Lanark St. Compare two hypothetical housing scopes and download a source-backed Markdown brief.

## Run

Requires Node 22.12+ (tested with Node 25.2.1) and npm.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Open http://127.0.0.1:5173/. Select Lanark, edit the two proposals, read the changed and unchanged checks, then download the brief. Print / save as PDF uses the browser print dialog. Inputs reset when the page reloads; export to retain a comparison.

```sh
npm test
npm run typecheck
npm run lint
npm run build
node scripts/smoke.mjs
```

The smoke check needs `/usr/bin/chromium` and a running dev server. It writes screenshots, an actual downloaded brief and a print PDF to `/tmp/lanark-*`. It tests a simulated failed request, then tries the real public assessment endpoint. The real endpoint is allowed to be unavailable; that must remain visible.

## Scope and evidence

React + TypeScript + Vite, npm lockfile. Fresh application code written during the event, beginning September 26, 2026. No backend, model credentials, database or remote deployment. Model assistance is unavailable at runtime. Structured proposal fields feed deterministic conditional checks, not AI claims or permission decisions.

The comparison always uses a clearly labeled research snapshot retrieved September 26, 2026. Assessment vintage is September 1. A browser-side, exact-parcel, field-whitelisted CKAN assessment refresh appears as a separate observation and is included in export. It never silently substitutes for the snapshot. CORS, offline, timeout, malformed and empty responses remain unavailable evidence.

Parcel geometry is the recorded EPSG:2272 polygon rendered with equal x/y scale and y-axis inversion for north up. No basemap, fabricated footprint or slope overlay. This is not a survey. Full geometry joins were verified in the research, not recomputed by this app.

See [disclosures](docs/disclosures.md), [implementation plan](docs/implementation-plan.md), and [current handoff](docs/current.md). Research inputs: `../ai-housing-hackathon-wiki/docs/lanark-evidence-2026-09-26.md`, its sanitized evidence manifest and `docs/initial-rule-contract.md`. No research script or previous project code was copied.
