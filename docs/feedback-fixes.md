# Consolidated user feedback fixes

September 27, 2026. The user requested all feedback from the conversation on one feature branch. Worktree: `/tmp/ai-housing-consolidated`. Branch: `fix/coherent-project-flows`. Leave changes on the feature branch for review; do not merge or deploy this batch.

## Already released and preserved

- Public guest access, owner-scoped account snapshots, save/reopen/sign-out and authenticated AI activity suggestions.
- Shared navigation and separate Home, Assess, Explore, Compare and Account pages.
- Removed historical Lanark navigation links; preserved the direct historical route.
- Review/Results redesign, supported individual metric scores with provenance, no combined feasibility score, automatic saved-parcel map loading.
- Simplified Home with controllable animated 3D illustration and reduced-motion/fallback support.

## This branch

1. Assess: unambiguous building-type labels; ask proposed home count alongside check-relevant proposal inputs; separate those inputs from optional goals; collapse missing optional data into one summary. Keep source evidence and editable unknowns.
2. AI: explain disabled states, including empty prose and guest access; associate help with buttons; make successful empty responses and stale responses explicit; preserve manual choices and require review before applying suggestions. Improve the existing intake prompt to distinguish a new six-story building from an additional dwelling and stories from home counts. Existing model, validation, auth and budget controls stay intact. No paid request is necessary for this branch.
3. Explore: readable zero-numbered lot labels without altering source records or parcel strings; active recorded-use/ZIP filters separated from unevaluated project requirements; manual activities first; explicit suggestion review; compact repeated record metadata. Do not claim a vacant-land search establishes six-story suitability.
4. Compare: compact A/B inputs, real differences, shared findings once, deduplicated next actions. Distinguish coverage/input changes from public-source differences. Include supported metric scores and preserve per-run dates, conflicts and supplementary observations.
5. Verify desktop/mobile rendering, meaningful state-transition regressions and all four required checks. Independent review follows implementation. Update canonical and personal handoffs with exact branch/PR state and limitations.

## Scope limits

No project rename was selected. Screenshot folder access remains pending a path; do not search the laptop. File uploads, broad six-story zoning feasibility, new datasets, new AI providers and public email delivery are not invented or silently added. AI may clarify intentions; it does not supply missing evidence or decide permission. The metric inventory remains in `docs/assessment-metrics.md`.

## Verification record

Independent code review found a moved home-count input could let an invalid value advance to a page where it was no longer editable. The browser regression reproduced the failure and passed after the stage-specific guard fix. Visual review found a ZIP hint suggesting a filter already in use; it now distinguishes applied and missing ZIP. Independent re-review found no remaining blocker.

The actual-source Mountford rehearsal passed parcel search, confirmation, map, seven checks, scoped FEMA score, slope finding, export and local draft resume. Its property APIs were not mocked; AI was blocked and cloud saving was not part of that rehearsal. Explorer AI/browser fixtures and Compare findings remain synthetic regression evidence, not live AI quality or live comparison verification.
