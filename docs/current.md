# Current app handoff

## Publish and stop checkpoint

The user explicitly authorized pushing the feature work and deploying the website to Vercel, then stopping. This supersedes earlier no-deployment instructions for this checkpoint only. Do not push main directly or merge the new PR. Preserve and push both `feat/clear-project-results` and `feat/property-explorer`.

Latest UI feedback: the user dislikes the walkthrough after Key questions. Review and Next actions are not accepted UI. Record that feedback rather than redesigning while closing the session; revisit those screens first when work resumes. Preserve the original right-hand map layout unless the user changes that preference.

Deployment needs thin Vercel adapters for the existing public property/screening handlers. Hosted AI stays explicitly disabled, without transferring credentials or making paid requests. Drafts stay device-local and the hosted origin has separate browser storage from localhost. No authentication, database provisioning, 3D explorer or new comparison pages are part of this deployment.

## Active walkthrough and separate explorer, September 26, 2026

AI startup incident after the walkthrough checkpoint: the user saw the generic suggestion error. The property-test API had been started with `node server/dev.mjs`, which does not load the configured environment file; a missing key returns `ai_unavailable` before inference. That startup was unsuitable for the user-facing AI workflow. Use `npm run api:dev` so the server loads configured keys itself. Never inspect or print credential files. A successful read-only GET health check confirms the listener only, not model response quality. No paid retry is authorized, and the corrected prompt remains unverified with a fresh real request. The UI currently combines several AI failure causes into the same generic message, so the exact failed browser request was not individually traced.

Fresh drafts contain empty property/description fields, no selected work activities and null home counts. Housing form, ground disturbance and financial readiness default to Unknown. Nonempty answers can come from restored device drafts; placeholders are illustrative text, not submitted data. No personal browser storage was inspected or cleared. The explorer and new proposal-comparison pages remain scoped on their separate branch, not implemented routes.

This section supersedes the older stop and publication instructions below. PR #2 merged as `9fe6517f04763b6b2a75643551cb1dbb21973e50`. Current walkthrough work is on `feat/clear-project-results`; it is not in main. All earlier tracked and untracked work is preserved in this walkthrough checkpoint. Setup commit `5eaec18` ignores isolated worktrees. The walkthrough is committed locally as `ebd6275`; no new remote PR, merge or deployment accompanies it.

The user requested finishing the first walkthrough while separating the proposed AI-driven candidate-property search and proposal comparison. The separate branch is `feat/property-explorer`, checked out at `/tmp/ai-housing-property-explorer`. It starts from the PR #2 baseline plus the worktree-ignore commit, without walkthrough/backend commit `ebd6275`. Its scope document is `docs/property-explorer-scope.md`, committed there as `2c5937e`; that worktree is clean. Baseline verification passed 96 tests, typecheck, lint and build. Integrate the finished walkthrough checkpoint before implementing shared services there. The checkout is temporary; its scope is preserved on the feature branch. Dependencies were linked for verification and that link was removed afterward. No citywide search or 3D parcel explorer has been implemented. A mentioned screen reference was not attached.

The current walkthrough preserves the original layout and right-hand map. It adds explicit housing-form and ground-disturbance inputs, a user-triggered property assessment, sourced findings and prioritized actions. Existing drafts migrate these new answers to unknown. Assessment results are transient and invalidated on edits, project switches and source refresh; the Markdown brief includes their provenance when present. Saved projects are not deleted.

`POST /api/screening/run` now fetches the exact County boundary, full-parcel municipality, Pittsburgh zoning, City slope and FEMA flood observations. Its published City use-table mapping is narrow and provisional. Parcel identifiers remain strings. Unknowns and independent source failures remain visible; there is no example fallback or AI evaluation. See [rubric and coverage](score-design-proposal.md) and [completion plan](walkthrough-completion-plan.md).

Latest score policy: do not show any score, range or numeric contribution until every required rubric factor is assessed. Present integrations always leave required zoning, undermining, process and infrastructure factors unassessed, so the response is `pending` with `score: null` and named findings/actions. Previously reported 27-90 and 32-95 intervals are superseded, not current output. Financial feasibility remains unassessed.

Local workspace URL: `http://127.0.0.1:5173/projects/new`; development API: `http://127.0.0.1:5175`. Keep configured DeepSeek and the existing budget guard unchanged. No paid AI calls, credentials, deployment, provisioning, push to main or new PR merge are authorized by this checkpoint.

Manual walkthrough verification:

1. Open `http://127.0.0.1:5173/projects/new`. If a draft resumes, open Projects and Start new project to archive it.
2. Continue to Your property. Search `2003 Mountford Ave`, select parcel `0046R00029000000`, then confirm it. Verify the boundary and open Sources and record dates.
3. Enter a synthetic proposal, select New construction, choose Detached and an explicit ground-disturbance answer. Enter one proposed home. Leave genuinely unknown financial answers unknown. The AI suggestion button is optional and was not used in verification.
4. Review the answers, click Confirm & prepare brief, then Run property checks. Expect Assessment incomplete, source-backed findings and prioritized actions, with no numeric score.
5. Open source details, export the brief, then edit an answer. The previous assessment must clear. Reload preserves the draft but requires explicitly reloading observations and rerunning assessment.

Checkpoint verification: independent review found no remaining important issues in proposal matching, incomplete-score withholding, draft migration, stale requests and export provenance. `npm test` passed 112 tests; typecheck, lint and build passed. The existing Three.js chunk-size warning remains. Guided, map, live property and new screening browser scripts passed; live map tiles were visible at 320, 390 and 1440px with no horizontal overflow. Browser suites blocked AI and recorded zero AI calls. The latest local API was restarted and verified to return `pending`, `score: null`, exact proposal echo and no per-check numeric fields.

Reproducible browser commands: `npm run test:guided`, `node scripts/guided-map-smoke.mjs`, `node scripts/guided-map-smoke.mjs --live-tiles`, `node scripts/live-property-smoke.mjs`, and `node scripts/screening-smoke.mjs`. Screenshots: `/tmp/housing-guided-screening/assessment-{1440,390}.png`, `/tmp/housing-guided-live-property/confirmed-live-parcel-{1440,390,320}.png`, and `/tmp/housing-guided-map/live-tiles-320.png`. The screening run used a synthetic one-detached-home proposal on a real Mountford parcel; those intentions are test inputs, not County facts. It verified unknown disturbance, edit invalidation and error preservation. Older direct API runs verified explicit yes/no disturbance inputs. The source effective dates of new spatial layers remain unknown.

Two browser-test repairs preserve the original assertions: wait for initial autosave before injecting a corrupt synthetic draft, and validate retrieval time against the request window instead of a hardcoded calendar date. Historical-label assertions now match the explicit Historical Lanark outline label. The corrected AI prompt still lacks another approved real inference test. Authentication, cloud storage, full score coverage and the explorer remain unfinished.

Publication checkpoint: [PR #2](https://github.com/het-sheth/ai-housing-navigator/pull/2) contains the complete guided-workspace and live-property work, including the previously uncommitted source and tests. The user authorized merging this verified checkpoint into `main` and stopping. Resume from `main` after checking the PR merge state; retain the feature branch as history. No deployment accompanied publication.

## Active live-property work, September 26, 2026

The current user instruction authorizes one live property slice in the original guided workspace: address or parcel lookup, explicit parcel confirmation, actual boundary and the latest available assessment observation. Preserve the existing question panel and right-hand interactive map. It supersedes the older AI-first pause below. No further paid AI request is authorized; the configured DeepSeek model and budget guard remain unchanged.

Lanark audit: `createDraft()` starts with an empty property query and no parcel. `/projects/new` restores the device's current IndexedDB draft, which explains Lanark in an existing guided draft. The `/` route is the historical hardcoded comparison, and the previous static page title also mentioned Lanark across routes. The saved example map uses dated geometry only when that parcel is selected; it is not an unknown-address fallback. The user's actual browser storage was not inspected.

GitHub verification in this session confirmed PR #1 merged at `74f496493123d564d5c168accc02882cd8bb1c98`, and no guided-workspace PR existed at the start. Work continues on `feat/guided-project-workspace`, preserving its tracked and untracked changes.

Source selection: County assessments use the WPRDC CKAN `datastore_search` API and its `property_assessments_table` resource alias. Boundaries use the [County Web_Parcels layer](https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0) with exact string `PIN`, a small field whitelist and `outSR=4326`. This County layer declares its source spatial reference, avoiding an assumption about the WPRDC WKT file. The organizer catalog lists assessments, parcel boundaries and the County GIS portal in rows 1, 3 and 4; the working endpoint was verified during implementation. Search and confirmation trigger requests. There is no background countywide scan or paid AI call in property lookup.

Implemented flow: enter a house number and street or exact parcel ID, click Search property, select a candidate and click Confirm parcel. Search returns at most 20 candidates with a refine-search notice for truncation. It does not geocode or silently choose a nearby parcel. Confirmation fetches the selected assessment and boundary with independent availability states. The map draws only a confirmed returned boundary, or an explicitly labeled historical saved example. Assessment file date and retrieval time are separate; the County boundary dataset effective date remains unknown. No permit, zoning or proposal feasibility evaluation is implied by an available assessment record.

Draft behavior: Start new project archives the current draft before creating an empty one. Saved projects can be restored from the existing footer controls. Legacy confirmed Lanark drafts migrate to historical provenance; live confirmations store a distinct provenance marker and string parcel ID. Live observations and geometry are transient, so returning to a live draft requires Refresh live property data. Archived corrupt records remain untouched and do not hide valid records. Drafts remain device-local; Supabase and authentication are not connected.

The API remains local development code at port 5175, proxied through the Vite UI at port 5173. The static Vercel configuration does not host these API routes. No deployment or infrastructure work was performed.

The user then requested a good stopping point with all application work in `main`. This supersedes the earlier draft-only/no-merge limit and authorizes merging through a feature-branch PR after final checks and review, never pushing main directly. Stop feature work at this live-property checkpoint.

Verification: `npm test` passed 96 tests; `npm run typecheck`, `npm run lint` and `npm run build` exited 0. The existing Three.js chunk-size warning remains. Read-only implementation review found no remaining critical or important issue after fixing stale-request/draft-switch races and independent archive validation. The historical comparison and welcome browser regressions also passed.

`node scripts/live-property-smoke.mjs`, `npm run test:guided` and `node scripts/guided-map-smoke.mjs` passed in isolated Chromium. The live Mountford flow returned parcel `0046R00029000000`, assessment file date `2026-09-01`, residential single-family classification and 1,620 sq ft lot area. Desktop, 390px and 320px map screenshots show real OSM tiles and the returned boundary without horizontal overflow. Mobile captures must scroll the map into view and allow painting after resize; an earlier offscreen capture was gray despite loaded tile elements. Final screenshots: `/tmp/housing-guided-live-property/confirmed-live-parcel-{1440,390,320}.png`.

Synthetic browser cases are separate from live assertions: no match, search failure, stale search response, candidate lock during confirmation, assessment failure with boundary available, pending search cancelled by new project, and saved historical Lanark archive/restore. All property/guided/map browser contexts blocked `/api/assist`; no paid request was made.

To test locally: open `http://127.0.0.1:5173/projects/new`, use Start new project if a saved draft resumes, continue to Your property, search `2003 Mountford Ave` (or `0046R00029000000`), select the candidate and click Confirm parcel. Check the right-hand boundary and assessment file/retrieval dates. Reload, then explicitly Refresh live property data. Saved projects remains available in the footer after starting another project.

## Earlier guided workspace checkpoint, September 26, 2026

Continue from [the detailed handoff](resume-guided-workspace.md). Keep the existing `feat/guided-project-workspace` checkout and all unfinished work. PR #1, the historical Lanark prototype, merged into `main` as `74f4964` on September 26. Its exact source commit passed 41 tests, typecheck, lint and build in an isolated snapshot. A separate draft PR is being prepared for the guided workspace; do not merge that follow-up without further direction. No deployment or infrastructure provisioning occurred.

The user selected the original guided interface and authorized replacing only its right-hand site-context box with an interactive map. Leaflet uses live OpenStreetMap tiles for Pittsburgh context. The fixed-example picker is removed. Existing saved Lanark drafts retain their explicitly dated parcel context, using the stored County geometry projected from EPSG:2272 to EPSG:4326. New addresses remain unresolved; entered text is not sent to the map. This is not a live parcel lookup or a survey. The six-step form, IndexedDB draft persistence, manual choices, review and Markdown export remain in the original flow.

Local URLs: `http://127.0.0.1:5173/projects/new` and `/welcome`. The historical comparison remains at `/`, and the design-system specimen at `/design-system`. The separate map design concept at port 5178 is not the application. The user preferred the original guided layout over that concept.

## AI intake and budget checkpoint

The configured model remains `deepseek/deepseek-v4-flash-0731` through `deepinfra/fp8`, with no fallback. The server guard now accepts the approved $3 weekly key limit and checks reported lifetime key usage plus a $0.01 reserve against $10. The key is loaded only by `npm run api:dev` on port 5175; Vite proxies the local UI requests. Credential files must not be inspected.

One actual inference returned HTTP 200 but misclassified the synthetic intake. The prompt was clarified; its corrected semantic behavior has not been verified with a real response. Mocked browser checks cover explicit selection, stale responses and manual-choice preservation. Automatic approval review blocked a second paid request because the single authorized request had been consumed. Further paid testing requires renewed approval. No Jev call or model switch occurred.

OpenRouter offers `typesafe/jev-1.13` through its Decisions API at $0.042 per million input tokens with free output. The existing key can be used for an approved trial; the claimed `jev-1.13-free` model and zero-balance access remain unverified. Jev is a possible typed intake classifier, not a source of property facts or permission decisions.

## Live data and remaining work

Bounded public requests returned assessment, parcel and permit records for the known parcel. The City zoning and slope services responded with query-capable metadata. These availability checks do not implement application adapters or prove countywide coverage. The only existing live evidence adapter remains the legacy exact-Lanark assessment refresh. Other example findings are research snapshots.

The next proposed live slice is property lookup, user-confirmed parcel identity, mapped boundary and a fresh assessment observation. Add permits and spatial checks separately with source dates, conflicts, errors and coverage retained. City sources do not cover every Allegheny County municipality. Supabase project storage and Auth are not provisioned; drafts remain device-local. No deployment is authorized.

The test-tool dependency audit reports a moderate Vitest/mocker advisory requiring a separate version upgrade. The existing Three.js build-size warning remains. See the follow-up PR and detailed handoff for the final current validation results.

## Historical prototype handoff

Updated September 26, 2026. Branch `feat/first-prototype`. Public repository and open PR #1; no hosted deployment. App: `/home/het/personal/ai-housing-navigator`.

## Current product authority and next work

The [accepted specification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/product-spec-v1-2026-09-26.md), [dated decisions](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/product-decisions-2026-09-26.md) and [ADR 0006](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/adr/0006-select-action-led-v1.md) supersede the comparison-first prototype direction below. Assessment and prioritized next actions are primary; comparison is secondary. Countywide Allegheny County intake accepts all housing work activities and combinations while disclosing source and check coverage. Results use named statuses and an evidence/action checklist without an overall score; v1 uses useful 2D site context. React/TypeScript/Vite, Supabase Postgres/Auth and planned Vercel are selected. The [technical design](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/technical-design-v1-2026-09-26.md), [source verification](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/source-adapter-verification-2026-09-26.md), [implementation plan](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/technical-design-v1/docs/implementation-plan-v1-2026-09-26.md) and ADR 0007 are proposed engineering guidance. These links target the wiki design branch while publication through a new PR is in progress.

The next reviewable slice is typed broad activity/status contracts, a fenced Lanark evaluator and a recoverable guided local draft at `/projects/new`, preserving `/` and `/design-system`. Expanded app implementation awaits direction. No infrastructure is provisioned for the expanded design. Source reuse, countywide identity, reviewed rules, model endpoint, auth, email and retention remain release gates.

## Publication update, September 26, 2026

Het authorized publishing this application repository and inviting Rushi (`Baburaoooo`) with write access. Repository: https://github.com/het-sheth/ai-housing-navigator . Feature branch: `feat/first-prototype` at `128aec4`; [PR #1](https://github.com/het-sheth/ai-housing-navigator/pull/1) is open at last check. Main is a GitHub-generated README baseline. The existing prototype and four interview/research notes are in the publication batch. Rushi's write invitation is pending acceptance at last check; do not claim collaborator access or send a duplicate invitation. No deployment was performed.

The implementation remains the bounded Lanark prototype. The accepted expanded product specification and proposed technical design/plan live in the separate research wiki; wiki PR #3 is merged and the current design batch is being prepared for a new PR. Earlier interview notes below and in this repository preserve historical proposals; they are not the latest product authority. Publishing this prototype did not authorize expanded application implementation or deployment. Dataset reuse questions remain unresolved for public deployment; no dataset license is granted by this repository.

## Open and run

Working workbench: http://127.0.0.1:5173/. Design system and interactive walkthrough sample: http://127.0.0.1:5173/design-system. Restart with `npm run dev -- --port 5173 --strictPort`.

Lanark is preselected; proposal inputs are visible immediately. The new black/gold parcel workspace has Proposals, Comparison and Evidence views. The 412 steelmark-inspired mark supplies the requested Steelers reference. No copied Rescope product assets or fabricated geography. Source details and unchanged findings are secondary, not removed. Export is available from the top bar. Inputs remain session-only.

## Historical prototype steering and comparison finding

The user rejected text-heavy pages and the first decorative bridge/card design, requested frontend-design guidance and Rescope inspection, then requested subagent internet research on guided intake, property types, live connectors and deployment. Two bounded research agents contributed primary-source notes in `docs/research/`.

The latest steering challenged explanation changes being counted as consequential differences. This is implemented: the default pair differs only in repair versus expansion (plus display name). Result: one explanation change, zero review-status changes, zero next-action changes. The UI and Markdown explicitly state that the next action stays the same.

A separate ground-disturbance preset keeps repair and every other input fixed. It changes one slope-related preparation task, without changing review status, clearing the conflict, or establishing a go/no-go outcome. No supported pair proves a different approval or financial result. Do not manufacture an action difference or claim comparison is unique. TestFit-style design and pro formas are out of scope.

## Design system and research

`docs/design-system.md` records tokens, components, evidence states, question flow, coverage boundaries and implementation order. Shared CSS tokens and React controls live under `src/design-system/` and are used by the app. The four-screen sample demonstrates site condition, intended use, multiple work activities, unknowns and editable review. It is explicitly a design preview, not a completed intake/evaluator integration.

`docs/research/guided-intake-and-rule-scope.md` specifies the fuller question flow, separating physical form, existing use, legal-use evidence, proposed use, unit count, work activities and tenure. `docs/research/live-data-and-deployment.md` inventories five sources and proposes Vercel or Cloudflare hosting with a small same-origin API. `docs/research/comparison-value-test.md` records the tested comparison limits.

## Evidence and readiness

The comparison retains the September 26 snapshot with September 1 assessment vintage. A browser-side exact-PARID, field-whitelisted assessment request succeeded at 18:19:33 UTC on September 26: VACANT LAND, 1,657 sq ft, as of September 1. It is displayed/exported separately from the snapshot. A research agent's sandbox DNS request failed; this does not contradict the successful browser check. Deployment-origin CORS and other live connectors remain unverified.

Other live adapters, provider/model access, full rule dependencies, practitioner validation and financial modeling remain unimplemented or unresolved. Overall ease remains not rated. Hosted deployment and dataset redistribution terms need resolution; the app repository is public, but no hosting project was configured.

## Verification

Final checks passed: 41 tests including semantic comparisons and 10 token contrast assertions; typecheck, ESLint and production build all exited 0. Browser suites exercise visible inputs, scope toggles, tab/source navigation, default 1/0/0 change counts, alternate action change, invalid units, persistent conflict, failed/live assessment, actual download, mobile width, printing hidden tabs, and the separate walkthrough's multiple activities/unsupported warning/retained answers. Both browser suites exited 0.

Desktop comparison and design-system screenshots were visually inspected. Artifacts: `/tmp/lanark-desktop.png`, `/tmp/lanark-comparison.png`, `/tmp/lanark-mobile.png`, `/tmp/lanark-design-system.png`, `/tmp/lanark-design-system-mobile.png`, `/tmp/lanark-comparison-brief.md`, `/tmp/lanark-print.pdf`. PDF text confirms source dates, live provenance, the source conflict and explicit same-next-action wording. Local Chromium requires outside-sandbox execution here; the in-app browser connector was unavailable.

## Historical deployment preparation and proposed follow-up

Deployment preparation update: the user asked to push the app to Vercel. CLI 60.1.3 is available through `npm exec --yes --package=vercel -- vercel`; `whoami` reports logged out. Browser device login was started. `vercel.json` configures Vite output and the `/design-system` rewrite, and upload/Git exclusions were added. No upload, remote project or public URL exists yet. Tests (41), typecheck, lint and build passed after configuration changes. Hosted route and hosted-origin assessment checks remain pending. County parcel, City zoning and slope pages still list unspecified licenses; the handoff's public redistribution check remains unresolved. No express display ban was established, but no clear redistribution permission was found either.

There is still no runtime AI. A future useful model boundary is free-text proposal to typed, user-confirmed intake, with deterministic comparisons retaining authority over calculations and rule states. The proposed design direction is guided setup alongside spatial context, then comparison. The existing walkthrough remains a separate sample. For 3D, USGS 3DEP is a candidate terrain source, with Lanark coverage/vintage still unverified. PASDA footprint dataset 1195 has a 2026 catalog label but describes a 2004 flyover; layer 11 has no height/story fields or Z geometry. Do not present extruded footprints as an accurate current building model.

These were earlier follow-up suggestions: walk the four-screen sample with Het, integrate typed intake and coverage, validate task value with a practitioner, and add exact-parcel PLI/boundary adapters before whole-polygon zoning/slope. The accepted product scope and proposed implementation sequence above now guide review. Hosting remains a separate action; public repository publication did not authorize deployment.
