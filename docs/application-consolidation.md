# Application consolidation, September 27, 2026

## For Humans

The consolidated branch brings the guided single-property walkthrough (`/projects/new`), bounded assessment-record Explorer (`/explore`) and one-parcel proposal comparison (`/compare`) into one application. Explorer requires a user to confirm the search criteria, inspect a candidate and follow an exact parcel ID to comparison. Comparison requires another current County confirmation before checks can run. A/B proposals and their dated results remain independent, including during browser-storage failure for the current page session. The guided results keep prioritized actions and an aligned Markdown export.

The map now distinguishes an unconfirmed Explorer candidate from a saved comparison parcel. Both states retain their ID after a load failure and expose a working retry. Only a matching loaded County geometry draws a boundary. County assessment fields, mapped overlays and broader source observations are evidence with explicit scope and unknowns, not legal or financial decisions. The Development Ease Score and every numeric range remain withheld until all seven required rubric factors are assessed. Finance is separate and unassessed. Source observations never count as completed rubric factors.

The branch is for review. No deployment, paid AI call, credential transfer, cloud project storage or authentication connection was made. The original dirty checkout and other worktrees remain untouched.

## For Agents

### Included history

The branch starts from `feat/walkthrough-integration` `80c3242`, merges `feat/explorer-comparison-integration` `b9a926b`, then merges original feature heads that were previously cherry-picked into the integration branches. Git ancestry checks include all published app PR heads #3 through #18:

| PR | Original head | PR | Original head |
| --- | --- | --- | --- |
| #3 | `feat/clear-project-results` `40ad242` | #11 | `feat/source-school-locations` `e2d91aa` |
| #4 | `feat/source-registry-api` `f407dab` | #12 | `docs/source-architecture-flow` `95cb190` |
| #5 | `feat/walkthrough-recovery` `046ac96` | #13 | `docs/chrome-devtools-runtime` `94fb5ab` |
| #6 | `feat/source-parcel-query` `6030b77` | #14 | `feat/source-hud-data` `e2b0041` |
| #7 | `feat/source-screening-observations` `e05e027` | #15 | `feat/source-lodes-employment` `9d1645c` |
| #8 | `feat/source-regional-context` `dad467e` | #16 | `feat/walkthrough-integration` `80c3242` |
| #9 | `feat/source-spatial-reference` `9584d44` | #17 | `feat/property-explorer` `80f20c1` |
| #10 | `feat/source-gtfs-feed` `d060b4a` | #18 | `feat/proposal-comparison` `dd2a0ee` |

The first prototype `d2940aa` and guided workspace `59f017b` were already in main ancestry. The original Explorer, comparison and walkthrough merges retained the integrated versions of conflicting files because their original branch versions lacked the other route, the financial action ordering or the new map contract. The HUD and LODES merges retained both source imports and the combined source status note. Comparing the tree before and after these five ancestry merges shows one added file, `docs/property-explorer-scope.md`, and no application-code changes. No blanket tree replacement was used.

`feat/source-transit-gtfs` `59b262f` remains excluded. It is an unpublished, superseded spatial implementation with dirty worktree content. The reviewed `feat/source-gtfs-feed` head `d060b4a` is included and carries later provenance, bounds and unknown handling. Preserve the old worktree for its owner; do not merge it blindly.

### Request and evidence boundaries

- `/api/property/candidates` dispatches before the broader `/api/property/` route. `/api/property/parcel`, `/api/screening/run`, `/api/sources` and `/api/sources/query` remain available through the local and hosted adapters.
- The first 20 source-ordered, Pittsburgh-labeled candidate assessment records are a bounded search result, not a citywide inventory, ranking or suitability verdict. Search and refreshed parcel observations can conflict; Explorer discloses both.
- Countywide intake retains all housing work activities. Pittsburgh-specific screening reports named statuses and missing factors. HUD CHAS and LODES are historical aggregate context, not parcel suitability or financial feasibility.
- The 60-entry source catalog does not mean all source data are fully integrated. The earlier 60-source probe is dated and was not rerun for this consolidation. Supplementary `sourceObservations` remain available in screening responses and distinct from rubric checks; the walkthrough results panel does not render them directly yet.
- Hosted AI remains disabled. Browser fixtures use synthetic public API responses and block or mock `/api/assist`; they do not prove live source uptime, practitioner acceptance or model quality.

### Verification

The map contract was tested red then green with synthetic browser fixtures. Explorer selects a candidate, sees a failed parcel inspection without falsely marking it saved, retries and draws the returned boundary. Comparison reloads a saved parcel, sees a failed current-record load, retains its saved ID and retries to restore the boundary.

`npm test` passed 235 tests across 28 files. `npm run typecheck`, `npm run lint` and `npm run build` all exited 0. The production-preview browser scripts `walkthrough-integration-smoke.mjs`, `explorer-smoke.mjs`, `proposal-comparison-smoke.mjs` and `pages-handoff-smoke.mjs` all exited 0. The walkthrough flow made two synthetic property searches, two exact parcel confirmations and four synthetic screening calls, with zero assist calls and no page errors. Explorer and page handoff checked both desktop and mobile widths; comparison checked both widths, storage failure recovery and independent A/B results. The walkthrough exported and inspected a Markdown brief. The existing Three.js chunk-size warning remains in the build output.

The walkthrough browser script reads the current IndexedDB draft directly so it works against both the dev server and production preview. Its earlier source-module import was a test-harness limitation in the built app, not an application failure. Browser results and their fixture constraints are recorded in `/tmp/application-consolidation-report.md`.
