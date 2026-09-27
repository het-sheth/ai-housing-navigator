# Priority for the next implementation session, September 27, 2026

The user's latest priority is to consolidate and demonstrate the single-property walkthrough first, close critical evidence gaps next, and treat completion of all 60 catalog integrations as a separate milestone. This handoff changes documentation only. The earlier paused checkpoint below remains historical; the next orchestrator may resume under the user's latest direction. No merge, deployment, outreach or paid AI call is authorized by this update. The Development Ease Score stays null until all seven required rubric factors are assessed. Financial feasibility remains separate and unassessed; it is not an eighth factor in the current rubric.

## Next-session plan

1. Inventory actual published PR heads and worktrees, preserving the original dirty checkout. Combine the intended walkthrough, backend, HUD CHAS and LODES slices in an isolated integration branch. Resolve shared source router and registry conflicts, then run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and a synthetic browser end-to-end check with `/api/assist` blocked. Keep resulting changes in small reviewable PRs.
2. Demonstrate parcel confirmation, proposal entry, sourced findings and unknowns, prioritized actions and export. Check source errors, reload, parcel correction and edits. Functional success does not imply acceptance of the Review and Next actions design.
3. For a narrow supported proposal, build a versioned, source-backed applicability and rule matrix while retaining broad intake. Separate current code, exceptions and lawful-use evidence from GIS district observations. Use deterministic tests and practitioner review before marking a factor assessed.
4. Map the current City review route, required documents, triggers and responsible authority. The City's [Building & Development Application guidance](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Building-Development-Application), updated September 2, says BDA replaces separate Zoning Development Review and Building Permit applications and incorporates ZDR review. Reconcile older planning guidance and confirm applicability before encoding a route. Ambiguity needs human review, never an approval prediction.
5. Build an infrastructure evidence matrix for the actual provider and service area. Separate availability and capacity from mapped proximity; track connections, access, drainage and site conditions. [Pittsburgh Water's tap-in review](https://www.pgh2o.com/developers-contractors-vendors/permits/water-and-sewer-tap-plan-review) calls for an availability request and, for specified new or increased flows, engineer-stamped plans. Do not infer the provider from county alone. Missing letters or engineering review must yield a specific diligence task, not a cleared check.

Resume prompt: Start from this priority and the reviewed PR heads, not from the original dirty checkout. Use focused Sol implementation/review tasks and Luna only for bounded support; keep prompts and handoffs compact below 300k context without assuming an exact counter. Complete the integration and walkthrough demonstration before opening separate rule, process and infrastructure PRs. Keep the all-60 source milestone separate, preserve unknowns and source dates, and seek review before any factor becomes assessed.

# Paused at the user's request, September 27, 2026

The user asked to stop at a good point. Current slices are committed, reviewed and published as focused draft PRs. Start no further implementation until the user resumes. No merge, deployment, paid AI call, credential change or worktree deletion was performed.

- [App PR #13](https://github.com/het-sheth/ai-housing-navigator/pull/13): Chrome DevTools CLI guidance. A fresh isolated elevated MCP probe listed 30 tools and returned about:blank. Native Chrome tools are not exposed in this agent session. The supplied procedure is preserved in [wiki PR #7](https://github.com/het-sheth/ai-housing-hackathon-wiki/pull/7).
- [App PR #14](https://github.com/het-sheth/ai-housing-navigator/pull/14): HUD CHAS at `e2b0041`, exact county counts with 2013-2017 vintage. The FY2026 income-limit workbook returned HTTP 202 access challenges; no limit was inferred. All 200 tests, typecheck, lint and build passed; metric definitions received independent review.
- [App PR #15](https://github.com/het-sheth/ai-housing-navigator/pull/15): Census LODES at `9d1645c`, complete bounded Pennsylvania 2023 workplace-file aggregation by county or 2020 tract. No matching blocks returns incomplete without a numeric total. All 205 tests, typecheck, lint and build passed; focused independent review passed 16 tests.
- These three app PRs are siblings based on documentation PR #12 (`95cb190`). They were verified independently, not as a combined latest-source tree. Reconcile overlapping router/registry changes and rerun combined checks before any merge.
- The earlier 60-source report remains a dated baseline. It has not been rerun across the new HUD and LODES branches. The all-source objective remains incomplete.
- The original checkout remains deliberately dirty and includes pre-review work. Preserve it and all explorer/comparison work. Resume from the reviewed branches, not by committing the original tree wholesale.
- Git audit: focused PRs are in place, but worktree reconciliation and cleanup remain. Folder roles are `src/` frontend, `api/` thin hosted routes, `server/` backend and `server/sources/` data-access adapters. There is no persisted dataset layer; backend JavaScript is not covered by the current TypeScript check, screening still combines several responsibilities, and the reviewed baseline has no GitHub Actions workflow.

On resumption, inspect the PR heads, continue explicit source gaps, and plan Git/worktree cleanup without deleting preserved work. Chrome docs worktree: `/tmp/ai-housing-chrome-docs`; HUD: `/tmp/ai-housing-source-hud`; LODES: `/tmp/ai-housing-source-lodes`. Earlier notes below are historical where this checkpoint supersedes them.

# Current publication checkpoint

September 26, 2026, Eastern. Work resumed at the user's direction. The user authorized splitting and pushing focused PRs. Older stopping-point details remain in Git history and the preserved original checkout.

## Current status

- The published Vercel checkpoint remains at application commit `12ee746`. This publication batch does not deploy or merge changes.
- Walkthrough corrections are isolated from backend changes: explicit saved-stage resume, parcel correction with proposal preservation, recoverable record loading and honest unrun/error/incomplete results. Functional verification does not establish acceptance of the Review/Next actions design.
- The backend is published as [dependent draft PRs #4 and #6 through #11](pr-stack.md) for source discovery, parcel query/evidence, regional context, spatial context, transit and school locations. The walkthrough recovery is separate draft PR #5. See [architecture](architecture.md), [flow](../flow.md) and [all 60 source outcomes](source-integration-status.md).
- The reviewed backend at `e2d91aa` plus walkthrough recovery at `046ac96` passed 195 tests, typecheck, lint and build in a temporary combined tree. Each publication branch also passed its own four checks. No merge was published.
- All 60 catalog entries are represented. The bounded live probe returned 35 scoped source/context outcomes, seven reference metadata outcomes and 18 no-data outcomes. This is not complete integration of all underlying datasets. Unfinished public bulk parsers and provider access requirements remain explicit.
- No numeric Development Ease result is shown until every required rubric factor is assessed. Data acquisition is not assessed feasibility. Financial feasibility and infrastructure remain unassessed; historical regional indexes are not project costs or parcel comparables.
- Jev is not integrated. Hosted AI remains disabled. No paid model request, credential change, authentication connection or cloud storage provisioning is included.
- Explorer and proposal comparison remain separate unfinished worktrees. Their code is not in this publication batch.
- Chrome DevTools MCP is registered in the user-level Codex CLI configuration according to the [tooling note](browser-debugging.md). Native Chrome tools are absent from this agent session, and a prior CLI native call failed at Chromium launch. An approval-reviewed isolated stdio probe returned `about:blank`; no app page was inspected.

## Next work

1. Review the focused PRs in their stated dependency order. Verify the exact base and diff before merging; this task does not authorize merge or deployment.
2. Continue remaining public-source parsers and source-selection work using the outcome table. Preserve unknowns, provenance and geographic scope.
3. Decide how supplementary source observations should be presented in the walkthrough. The API field exists; the results panel does not yet render it directly.
4. Preserve the original dirty checkout until every split branch is reconciled. Do not discard it merely because PRs exist.


The primary final source probe had a transient USGS elevation error; one separate retry succeeded. The outcome table preserves the initial error. The earlier unpublished transit split at `/tmp/ai-housing-source-transit` is preserved WIP; the reviewed transit implementation is `feat/source-gtfs-feed`.
