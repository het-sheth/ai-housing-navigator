# Explorer and comparison page integration

This is the earlier page-branch handoff. The pages are now combined with the walkthrough and source stack on `feat/consolidate-application`. The current map contract uses a selected candidate state for Explorer and a saved parcel state for comparison, with real inspection and current-record retry callbacks. See [the consolidated handoff](application-consolidation.md).

## For Humans

The `/explore` page lets a user confirm bounded County assessment search criteria, inspect one returned parcel and open `/compare?parcelId=<encoded ID>`. The comparison page treats that ID as a suggestion. It loads current County observations for the exact string ID only after a second explicit confirmation, then permits two independent proposal screens. Editing one proposal clears only its own result. Both pages keep the existing right-hand 2D site map.

The candidate list is limited to supported assessment fields, Pittsburgh-labeled records and the first 20 source rows. It does not rank sites or evaluate all free-text criteria. When the later parcel load disagrees with the search snapshot, Explorer labels the conflicting fields and keeps both observations visible. A recorded use is not current condition, lawful use or availability. The comparison uses the existing screening endpoint and withholds every numeric score while required rubric factors remain unassessed. A/B work is device-local. If browser storage rejects a save, the comparison keeps each exact parcel's latest work in memory while the page stays open and shows a storage warning. Reloading can still lose unsaved work. Hosted AI remains disabled; no real AI request, deployment or credential transfer is part of this integration.

This branch starts at walkthrough checkpoint `40ad242`. The comparison feature `d0d9853`, Explorer feature `204f8bf`, comparison correction `7a59b45`, Explorer correction `80f20c1` and comparison parcel-switch correction `dd2a0ee` were applied in that order. The Explorer feature cherry-pick had conflicts only in `src/main.tsx` and `vercel.json`: both features added a route at the same position. The resolution keeps `/design-system`, `/welcome`, `/projects/new`, `/compare`, `/explore` and the root historical route. Both new routes have Vercel rewrites to `index.html`.

## For Agents

### Combined request path

1. `PropertyExplorer` calls `GET /api/property/candidates` with confirmed recorded-use and optional ZIP filters. The server uses bounded WPRDC assessment queries and returns source coverage, unknowns and exact string parcel IDs.
2. Inspecting a candidate calls `GET /api/property/parcel?pin=<ID>` and draws the returned County boundary in `SiteContextMap`. The comparison link URL-encodes the returned detail ID.
3. `ProposalComparison` preloads only the URL ID. It calls the same exact-parcel endpoint after user confirmation, keeps A/B input and dated result snapshots in browser localStorage plus a per-parcel in-memory cache for the current page session, and calls `POST /api/screening/run` independently for each side. The cache prevents a failed storage write from reverting unsaved A/B work during parcel switches. Abort and epoch checks reject stale results after edits or parcel changes.
4. `scripts/pages-handoff-smoke.mjs` runs the real built pages with synthetic public API responses, intercepts AI, checks exact-ID handoff, confirmation, independent results, side invalidation, return navigation, loaded production font and desktop/mobile overflow. The feature scripts cover each page more deeply.

### Current integration with walkthrough and source work

The consolidated merge combines the candidate route with the source registry and query routes. `/api/property/candidates` dispatches before the broader property handler. Both hosted and local API adapters retain the source endpoints. The merged code passed all four project gates; see [the consolidated handoff](application-consolidation.md).

`SiteContextMap` receives `savedParcelId`, optional `selectedParcelId`, `loading`, `loadError` and a current-record callback. Explorer passes its selected candidate ID only as `selectedParcelId`, exposes the inspection error and retries `inspect()`. Comparison passes the matching, restored comparison ID as `savedParcelId`, exposes the exact-parcel load error and retries `confirmParcel()`. Neither a candidate nor a URL parameter draws a parcel boundary before matching County detail loads. Optional `sourceObservations` remain distinct from rubric checks.

### Plan and verification

- [x] Apply the comparison and Explorer feature commits on the isolated integration branch.
- [x] Resolve both route and Vercel rewrite overlaps while retaining existing routes.
- [x] Apply the comparison same-parcel refresh correction.
- [x] Add one repeatable browser handoff covering the boundary between pages.
- [x] Assess the newer walkthrough/source branch with a read-only three-way merge.
- [x] Apply the reviewed Explorer correction and run the final four required gates: `npm test` 139/139, typecheck, lint and build all exit 0.
- [x] Run both feature browser smokes and the combined handoff against a production preview at desktop and mobile widths, all exit 0.
- [x] Commit the integration test and documentation after verification.
- [x] Apply the comparison parcel-switch correction, rerun required gates and affected browser smokes, then commit this documentation update.

The browser fixtures are synthetic and prove UI and state transitions, not live source availability, full geographic coverage or model quality. The separate Explorer public-record probe in its feature report establishes only the bounded endpoint behavior observed at that time.
