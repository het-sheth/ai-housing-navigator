# Guided workspace build progress

## Verified live-property checkpoint, September 26, 2026

The original guided workspace now supports live public-record search, explicit parcel confirmation, a real County boundary and separately dated assessment results. Saved historical Lanark drafts remain distinct, and start-new/archive/restore preserves projects. All 96 tests, typecheck, lint and build passed, with live desktop/mobile and failure-state browser checks. See [current.md](current.md) for the complete handoff. The user requested merging all application work into main through a PR, then stopping at this checkpoint. No deployment or further paid AI request occurred. The older budget and AI statements below are historical and superseded by the current handoff.

## Session handoff and latest budget instruction

The user requested a handoff and accepted the existing **$3 weekly OpenRouter key limit**. This supersedes the assistant's earlier $1/no-reset requirement. The code still enforces the old guard; the next session must align it and its tests, then verify one small real DeepSeek response. No paid inference has occurred. Keep the overall $10 budget, one-issue-at-a-time workflow and no-deployment instruction. Read [the detailed handoff](resume-guided-workspace.md) before continuing.

Updated September 26, 2026. This branch contains a locally verified preview and the first narrow runtime AI intake checkpoint. It is not deployed.

## Current scope

Keep `/` and `/design-system` available for the historical comparison prototype. `/welcome` introduces the product with a procedural illustrative neighborhood. `/projects/new` provides a six-step local project draft and prioritized diligence brief.

The guided flow supports broad work activities and combinations, separates tentative work, preserves unresolved property entries and unknowns, asks about financial readiness early, and prioritizes missing financial assumptions before further spending. Financial feasibility is always Unassessed. It makes no permission determinations and produces no overall score.

The animated neighborhood is illustrative, not property evidence. A selected Lanark example can show its dated sourced parcel boundary. The map addition uses real OpenStreetMap tiles. Desktop and 320px map rendering were visually verified. The typed address is not sent to a geocoder.

## Implemented behavior

- Draft validation, serialized IndexedDB operations, invalid-storage preservation, explicit recovery reset and storage-failure export behavior.
- Role, property, proposal, finance, review and next-action screens with task ordering and export.
- Invalid home-count edits remain visible as transient unsaved values with an accessible error. Correcting them persists a valid draft.
- Responsive welcome and guided layouts, reduced-motion behavior, pause/resume, WebGL cleanup and static fallback.
- Legacy `App` and `DesignSystem` route modules are lazy loaded outside the common entry. Welcome and the Three scene are also split into route chunks.
- Exact Vercel rewrites are prepared. No deployment was performed.

## Verification

- The earlier preview run passed 71 tests and all three other static gates. After the AI intake checkpoint was added, 85 tests passed and `npm run typecheck`, `npm run lint`, and `npm run build` all exited 0.
- Guided browser smoke exited 0 for IndexedDB concurrency, invalid-draft recovery/reset, storage failure, mixed work, unresolved generic property, home-count recovery, financial priority, result invalidation, and export.
- Welcome browser verification passed ready WebGL rendering twice after bounded context-loss retry and a separate forced fallback check. Desktop and mobile screenshots were inspected.
- Final welcome, guided, original prototype, and design-system browser suites all exited 0. Logs are under `/tmp/housing-guided-verification/final-test-*.log`.
- The common entry decreased from 271.08 KB to 224.84 KB raw after lazy loading `App` and `DesignSystem`. `NeighborhoodScene` remains a lazy 523.93 KB chunk and triggers Vite's size warning. Local startup samples were 1.49 seconds for welcome and 0.835 seconds for guided; these are not hosted benchmarks.

## Engineering rulings

Keep the existing prototype evaluator out of the generic guided flow. The guided output is a preparation brief, not a live assessment. Do not invent parcel geometry, property matches, municipal rules or financial results. The real parcel boundary and dated source evidence remain separate from the illustrative scene and map context. User answers are self-reported. Preserve unknowns, source conflicts and parcel identifiers as strings.

The first runtime AI checkpoint converts free text to typed, user-confirmed intake using pinned `deepseek/deepseek-v4-flash-0731` via DeepInfra FP8. Public model metadata lists $0.06/M input and $0.18/M output. `npm run api:dev` loads the local key at runtime on port 5175, with Vite proxying from port 5173. The key remains server-only. Live inference has not been verified. The user accepts the existing $3 weekly key limit; the next session must align the old $1/no-reset server guard and its tests while preserving the overall $10 budget. No paid calls have been made. 85 tests and all four static gates pass; mocked browser checks pass for stale input, explicit selection and failure preservation. This checkpoint does not provide AI assessment, permission determinations, live identity matching, or immutable history. Account saving and task outcomes are also not implemented. Vercel CLI login is verified as `het-sheth`; Supabase CLI access is available but there is no Housing Navigator project or link. No credentials or ignored environment files were inspected. Following the one-issue-at-a-time workflow, comparison, UI, font and map work remains queued until this AI checkpoint is validated.

## Remaining beyond this local preview

No local preview checks remain. Hosted behavior, real-user validation, and release readiness are not verified. If code changes, rerun the static gates and affected browser coverage before updating these handoffs.
