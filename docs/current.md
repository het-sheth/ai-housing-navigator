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
