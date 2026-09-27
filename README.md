# Housing Navigator

A guided housing proposal workspace with live public-record lookup and bounded Pittsburgh screening. The user confirms a parcel, describes work and runs source checks to see findings, missing evidence and next actions. Numeric scoring is withheld until every required rubric factor is assessed. Current coverage does not meet that gate.

Start with [flow.md](flow.md), [architecture](docs/architecture.md), [source coverage](docs/source-coverage.md) and the [current handoff](docs/current.md). The [all-source integration plan](docs/source-integration-plan.md) distinguishes the 60-entry catalog from working source retrieval. [Chrome DevTools MCP notes](docs/browser-debugging.md) describe the CLI registration, native launch limitation and verified isolated stdio workaround.

## Run

Requires Node 22.12+ (tested with Node 25.2.1) and npm.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Run `npm run api:dev` in a second terminal using the existing local server configuration. Open http://127.0.0.1:5173/projects/new for the guided workspace. Drafts and archives remain on the device; source checks are transient. The root route preserves the historical Lanark proposal-comparison prototype. The new explorer and comparison pages remain unfinished in separate worktrees.

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

Open http://127.0.0.1:5173/design-system for shared visual tokens, reusable controls, evidence states and the original walkthrough design preview. The implemented guided workspace is at `/projects/new`.

See [design system](docs/design-system.md), [guided intake](docs/research/guided-intake-and-rule-scope.md), [live data and deployment](docs/research/live-data-and-deployment.md), and [comparison value test](docs/research/comparison-value-test.md) for the prototype's design and historical research. The accepted [product specification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/product-spec-v1-2026-09-26.md) and [dated decisions](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/product-decisions-2026-09-26.md) govern the expanded direction. The [technical design](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/technical-design-v1-2026-09-26.md), [source verification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/source-adapter-verification-2026-09-26.md) and [implementation plan](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/implementation-plan-v1-2026-09-26.md) are proposed engineering guidance on that branch while wiki amendments are in [finance PR #5](https://github.com/het-sheth/ai-housing-hackathon-wiki/pull/5) and [scoring-policy PR #6](https://github.com/het-sheth/ai-housing-hackathon-wiki/pull/6).

## Scope and evidence

React, TypeScript, Vite and npm, with shared local/Vercel API handlers. PRs #1 and #2 are merged; the published checkpoint is draft PR #3, and the independently verified recovery changes are [draft PR #5](https://github.com/het-sheth/ai-housing-navigator/pull/5). See the [focused PR stack](docs/pr-stack.md) for source integrations. A prior checkpoint is [deployed on Vercel](https://ai-housing-navigator.vercel.app/projects/new); current local changes are not automatically published. See the handoff for exact revisions.

Hosted AI is disabled. Optional local DeepSeek intake suggests work activities for user confirmation; it does not supply property facts or feasibility judgments. Jev is not integrated. Supabase Postgres and Auth remain selected but unconnected. Public-record checks are deterministic, preserve source conflicts and unknowns, and never determine permission or financial viability.

The following details describe the historical Lanark prototype, not the live guided parcel workflow.

The comparison always uses a clearly labeled research snapshot retrieved September 26, 2026. Assessment vintage is September 1. A browser-side, exact-parcel, field-whitelisted CKAN assessment refresh appears as a separate observation and is included in export. It never silently substitutes for the snapshot. CORS, offline, timeout, malformed and empty responses remain unavailable evidence.

Parcel geometry is the recorded EPSG:2272 polygon rendered with equal x/y scale and y-axis inversion for north up. No basemap, fabricated footprint or slope overlay. This is not a survey. Full geometry joins were verified in the research, not recomputed by this app.

The guided workflow accepts countywide intake while disclosing jurisdiction-specific check coverage. The latest scoring policy supersedes the older blanket no-score preference: all required evidence must be assessed before a number is exposed. See [disclosures](docs/disclosures.md), the historical [prototype plan](docs/implementation-plan.md), and [current handoff](docs/current.md). Historical research inputs include `../ai-housing-hackathon-wiki/docs/lanark-evidence-2026-09-26.md`, its sanitized evidence manifest and `docs/initial-rule-contract.md`.
