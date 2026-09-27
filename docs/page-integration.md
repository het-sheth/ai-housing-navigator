# Explorer and comparison page integration

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

### Integration with newer walkthrough and source work

`323ba9a` and this branch share base `40ad242`. A read-only three-way `git merge-tree 40ad242 HEAD 323ba9a` found no text conflict markers. Both sides edit `server/dev.mjs` and `server/hosted/api.test.ts`; the merge combines the candidates route with the source registry/query routes and combines their tests. Recheck these files after a real merge, including API route dispatch order and all four project gates.

There is a TypeScript interface change beyond textual merging: the newer `SiteContextMap` requires `savedParcelId: string | null`, `loading: boolean`, `loadError: string` and `onLoadCurrentRecords: () => void`. The two page components currently pass only `historical` and `detail`. After the source-stack merge, adapt the call sites as follows:

| Page | `savedParcelId` | `loading` | `loadError` | `onLoadCurrentRecords` |
| --- | --- | --- | --- | --- |
| Explorer | `null`, because a candidate selection is not a saved or confirmed parcel | `phase === 'loading'` from parcel inspection | `''` while no current detail exists; the page already shows inspection errors in its panel | A no-op callback, because Explorer has no saved-parcel map state; its Inspect parcel button owns retry |
| Comparison | `comparison?.parcelId === parcelInput.trim() ? comparison.parcelId : null`, from restored or edited device-local comparison state | `parcelLoading` from exact County confirmation | `parcelError` from the same confirmation | `() => { void confirmParcel() }`, retrying the exact ID shown in the input |

Keep the existing `detail` guards. A candidate or URL parameter alone cannot make the map imply a confirmed County parcel. The source stack also adds optional `sourceObservations` to screening results; comparison can display them in a later scoped change, but must not count them as completed rubric checks. A text merge may succeed while TypeScript still fails on the map props until the page call sites are adapted.

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
