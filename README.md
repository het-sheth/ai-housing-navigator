# Housing Navigator

A published, bounded early-diligence prototype for one verified-date Pittsburgh case: 1623 Lanark St. The current interface compares two hypothetical housing scopes and downloads a source-backed Markdown brief. The accepted v1 product direction leads with a proposal-specific assessment and prioritized next actions; comparison is secondary. The expanded workflow is specified in the [research wiki](https://github.com/het-sheth/ai-housing-hackathon-wiki/tree/docs/technical-design-v1) and is not implemented here.

## Run

Requires Node 22.12+ (tested with Node 25.2.1) and npm.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Open http://127.0.0.1:5173/. Lanark is already selected. Edit the two visible proposals, compare explanation/status/action differences, then export the brief. The default isolates repair versus expansion; its next action remains the same. A separate ground-disturbance example shows a narrower changed diligence task. Print / save as PDF uses the browser print dialog. Inputs reset when the page reloads; export to retain a comparison.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:browser
npm run test:design-system
```

The smoke check needs `/usr/bin/chromium` and a running dev server. It writes screenshots, an actual downloaded brief and a print PDF to `/tmp/lanark-*`. It tests a simulated failed request, then tries the real public assessment endpoint. The real endpoint is allowed to be unavailable; that must remain visible.

## Design and research

Open http://127.0.0.1:5173/design-system for shared visual tokens, reusable controls, evidence states and an interactive four-screen walkthrough preview. This is a design preview, not the full intake or rule engine. The full guided-intake specification is documented separately and is not yet integrated.

See [design system](docs/design-system.md), [guided intake](docs/research/guided-intake-and-rule-scope.md), [live data and deployment](docs/research/live-data-and-deployment.md), and [comparison value test](docs/research/comparison-value-test.md) for the prototype's design and historical research. The accepted [product specification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/product-spec-v1-2026-09-26.md) and [dated decisions](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/product-decisions-2026-09-26.md) govern the expanded direction. The [technical design](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/technical-design-v1-2026-09-26.md), [source verification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/source-adapter-verification-2026-09-26.md) and [implementation plan](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/implementation-plan-v1-2026-09-26.md) are proposed engineering guidance on that branch while wiki publication is in progress.

## Scope and evidence

React + TypeScript + Vite, npm lockfile. Fresh application code written during the event, beginning September 26, 2026. The public [feature branch](https://github.com/het-sheth/ai-housing-navigator/tree/feat/first-prototype) has [open PR #1](https://github.com/het-sheth/ai-housing-navigator/pull/1); main remains a GitHub-generated README baseline. No backend, model credentials, database or hosted deployment. Model assistance is unavailable at runtime. Structured proposal fields feed deterministic conditional checks, not AI claims or permission decisions. Supabase Postgres/Auth is selected for the expanded product, with Vercel planned; neither is provisioned for it.

The comparison always uses a clearly labeled research snapshot retrieved September 26, 2026. Assessment vintage is September 1. A browser-side, exact-parcel, field-whitelisted CKAN assessment refresh appears as a separate observation and is included in export. It never silently substitutes for the snapshot. CORS, offline, timeout, malformed and empty responses remain unavailable evidence.

Parcel geometry is the recorded EPSG:2272 polygon rendered with equal x/y scale and y-axis inversion for north up. No basemap, fabricated footprint or slope overlay. This is not a survey. Full geometry joins were verified in the research, not recomputed by this app.

The accepted expanded scope includes countywide parcel and jurisdiction intake, all housing work activities and combinations, explicit bounded coverage, named statuses and an evidence/action checklist without an overall score, and useful 2D site context. This prototype does not yet deliver that scope. See [disclosures](docs/disclosures.md), [prototype implementation plan](docs/implementation-plan.md), and [current handoff](docs/current.md). Research inputs: `../ai-housing-hackathon-wiki/docs/lanark-evidence-2026-09-26.md`, its sanitized evidence manifest and `docs/initial-rule-contract.md`. No research script or previous project code was copied.
