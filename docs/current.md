# Current app handoff

## Session stopped: current WIP checkpoint

Read [resume-guided-workspace.md](resume-guided-workspace.md) first. The active branch is `feat/guided-project-workspace`. The user authorized the guided build, early financial-diligence question and illustrative 3D intro, then stopped the session. New domain/storage code passes 71 total unit tests; the UI is unfinished and typecheck/build/lint currently fail as documented. No finished 3D scene, deployment or runtime AI exists. The instructions below describe the earlier published prototype and are historical where they conflict with this checkpoint.

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
