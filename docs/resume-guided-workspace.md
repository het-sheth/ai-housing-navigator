# Resume: AI intake checkpoint and sequential product fixes

## Latest instruction: publish checkpoint and stop

Push both feature branches and deploy the walkthrough checkpoint to Vercel, with live public-record API adapters and explicitly unavailable hosted AI. No paid inference or credential transfer. The user rejects the Review and Next actions UI after Key questions; these need redesign next session and are not accepted. Finish deployment verification, record URLs in current.md, then stop. No new PR merge or main push.

## Latest instruction: finish walkthrough, isolate explorer

Startup correction: run the API with `npm run api:dev`, never bare `node server/dev.mjs` for the user-facing workflow. The latter was used during property verification and bypassed loading the configured AI key, causing a likely pre-inference `ai_unavailable` failure. See current.md for the incident and inference-verification limits. No paid retry occurred.

The active walkthrough branch is `feat/clear-project-results`, with local checkpoint `ebd6275` based on merged PR #2 (`9fe6517`). Existing tracked and untracked changes are preserved in the reviewed walkthrough checkpoint. No new remote PR or merge was performed. Read the first section of [current.md](current.md), [completion plan](walkthrough-completion-plan.md), and [rubric](score-design-proposal.md) before continuing. Do not restart discovery.

A separate worktree at `/tmp/ai-housing-property-explorer` uses `feat/property-explorer` for the proposed AI-confirmed candidate-property search, map explorer and one-parcel proposal comparison. Only planning/baseline setup belongs there until the walkthrough checkpoint is finished. Its base does not include the current uncommitted backend/UI changes. No screen attachment was received. The scope is committed as `2c5937e` and the explorer worktree is clean; its baseline passed 96 tests and all required checks.

The user now requires withholding every numeric score until all required rubric factors are assessed. Current integrations always return an incomplete assessment, with live evidence and actions. Do not restore the earlier partial score intervals. The walkthrough adds explicit housing-form/ground-disturbance answers and an explicit Run property checks action; no existing record supplies these proposal assumptions. Keep the original form and right-hand map, archive/restore, source provenance, and string PINs.

Walkthrough verification passed 112 tests, typecheck, lint, build and all five browser commands listed in current.md. The local API serves the latest pending-only incomplete assessment contract. Source findings are live; Lanark comparison is historical; complete scoring, citywide search, cloud persistence and paid AI revalidation remain unfinished. Use Sol for implementation/review and Luna for bounded support, reusing existing agents. Never inspect credential files or make a paid AI request. No deployment, provisioning, main push or new merge. Finish with actual browser verification, all four required checks, and exact branch/publication status. Older dated sections below are historical and may conflict with the latest instruction.

## Latest instruction: live property slice in original workspace

Publication: [PR #2](https://github.com/het-sheth/ai-housing-navigator/pull/2) contains the complete checkpoint for `main`, including all previously uncommitted application work. The user authorized the merge and requested stopping here. Verify the PR merge state and resume from `main`; the feature branch remains preserved.

September 26, 2026. This section supersedes the older AI-first pause and disconnected-lookup descriptions below. The user explicitly authorized general live property lookup, parcel confirmation, a real boundary and the latest available assessment in the ORIGINAL guided workspace. Preserve its form and right-hand Leaflet map. Do not resume the isolated design concept or expand into unrelated features.

Read the first section of [current.md](current.md) for the current source and draft contracts. The live property server uses WPRDC assessment records and the County Web_Parcels ArcGIS layer, with exact string parcel matching, field whitelists and separate source failure states. Neither lookup nor map operations call AI. Historical Lanark fixtures remain labeled on saved historical drafts and the original comparison route. New projects start empty; Start new project archives the active draft and Saved projects restores it. Source observations are transient and require an explicit refresh after returning.

Lanark's earlier appearance was traced to saved IndexedDB draft restoration, the historical `/` route, and the old shared browser title. Fresh draft creation was already empty. The user's personal browser storage was not inspected or reset. Isolated browser test contexts are used for synthetic fixtures and corruption/race tests.

Keep `feat/guided-project-workspace` and all existing work. GitHub verified PR #1 merged at `74f496493123d564d5c168accc02882cd8bb1c98`. The follow-up draft PR was absent at session start. The user subsequently requested stopping at a verified checkpoint and putting all application work into `main`, authorizing a feature-branch PR and merge after checks and review. Never push main directly. No deployment, provisioning, model switch or paid inference is authorized by this work. Another paid AI test still requires renewed explicit approval. The accepted $3 weekly OpenRouter guard within the $10 per-key lifetime limit remains unchanged.

Local URL: `http://127.0.0.1:5173/projects/new`. Run `npm run dev -- --port 5173 --strictPort` and `npm run api:dev` if the respective listeners are absent. Let the runtime load credentials; never inspect `.env.local` or any credential file. These APIs are implemented for local development, not a static hosted deployment.

Final checkpoint verification: 96 tests, typecheck, lint and build passed. Read-only review cleared the live slice after stale-request and archive recovery fixes. Live property, guided, map, historical comparison and welcome browser regressions passed. Desktop and 320px live-boundary screenshots were visually inspected; 390px also passed tile/overflow checks. All property-related browser runs blocked AI calls. See [current.md](current.md) for exact live fixture, commands, source dates and screenshot paths. Stop here. Authentication, Supabase storage, broader permit/regulatory coverage and another real corrected-prompt AI test remain unfinished and require a new task.

## Latest approved application and publication work

The user preferred the original guided workspace over the separate design concepts, and approved replacing its right-hand site-context box with the interactive map. They then requested removal of the fixed-example entry point, a move toward live data, a new PR, and merging PR #1. These later instructions supersede the earlier map/publish pause below. PR #1 is merged at `74f4964`; its exact historical source passed all four required checks and a read-only review. The current feature checkout remains intact. A follow-up draft PR is being prepared, not merged.

The map integration preserves the original form and device draft behavior. New properties remain unresolved; existing saved Lanark drafts retain dated context. Public WPRDC assessment/parcel/permit requests succeeded for the known parcel, and City zoning/slope service metadata was query-capable. No general live lookup adapter, Supabase project or Auth flow has been added. Read [current.md](current.md) for the current architecture and remaining work. No extra paid inference, Jev trial, deployment or infrastructure provisioning occurred.

## Latest design and connector status

The user rejected Astra's first civic-atlas concept as generic and insufficiently tied to Pittsburgh or maps. They asked for fewer buttons, live-data and auth status, and whether TypeSafe's Jev could help with forms. The revised isolated concept at `/tmp/housing-astra-concept/index.html` uses a real Leaflet/OpenStreetMap map, black-and-gold 412 identity and the dated Lanark parcel. A public ArcGIS service transformed the stored EPSG:2272 boundary for display; it is not a survey. The rejected version remains at `v1.html`. Preview: `http://127.0.0.1:5178`. Root observed 20 live tiles and no desktop page errors; mobile and interaction review were pending. The reference review inspected an actual 21st Interactive Map example. Mobbin required catalog login, so no individual flow was inspected. The concept is not integrated into the application; user feedback is pending.

App drafts use IndexedDB; no Supabase project or auth flow is connected. The live evidence path is a narrow Lanark WPRDC assessment fetch, not general property resolution. OpenRouter lists `typesafe/jev-1.13` at $0.042 per million input tokens and free output via `POST https://openrouter.ai/api/alpha/decisions` ([model listing](https://openrouter.ai/typesafe/jev-1.13/), [Jev guide](https://openrouter.ai/blog/insights/what-is-jev/)). The existing capped OpenRouter key suffices; no TypeSafe key is needed for that route. The `jev-1.13-free` alias and zero-balance access remain unverified. Jev Router is a separate dynamic router. No Jev call or model switch occurred; DeepSeek remains configured.

## Current checkpoint after the first live request

The server guard now accepts the existing OpenRouter key's $3 weekly limit. It also requires reported lifetime usage on this key plus a $0.01 request reserve to stay within $10. This is a per-key check, not proof of account-wide spending across other keys. The model remains `deepseek/deepseek-v4-flash-0731` through `deepinfra/fp8` with fallback disabled. No credentials were inspected or printed.

The first actual browser-driven inference returned HTTP 200 after one paid call, but the semantic assertion failed. For the test description, the model marked `repair_remodel` as negated, marked `additional_dwelling` as negated and omitted the tentative `addition`. The sanitized server log reported 128 prompt tokens, 156 completion tokens and estimated cost $0.000036. A later zero-cost intercepted browser run confirmed that the stored draft and outgoing POST contained the intended description exactly, ruling out a draft seeding race for that test.

The server prompt now defines each intent, scopes negation to the excluded activity and distinguishes a physical addition from an additional dwelling. The prompt contract passed a targeted test. The final `npm test` run passed 88 tests, and `npm run typecheck`, `npm run lint` and `npm run build` exited 0. The existing Three.js chunk-size warning remains. A zero-cost browser regression passed with three intercepted mock calls covering stale results, explicit selection, negation, request failure and manual-choice preservation; this checks UI mechanics only. This corrected prompt has **not** been checked with a real model response. The live browser run stopped at its semantic assertion, so explicit suggestion selection and preservation of manual choices have not been verified with a correct real response.

The local preview remains `http://127.0.0.1:5173/projects/new`, with the API on `127.0.0.1:5175`. Do not make another paid request yet. Automatic approval review blocked a second request because the user's authorization covered one real call, which the first run consumed. Ask for renewed approval for exactly one additional small paid browser request, then check the corrected semantics, explicit selection and manual-choice preservation. Keep comparison, results, typography, welcome and maps paused until this AI checkpoint and user feedback.

The dated handoff below is preserved as history. This checkpoint supersedes its obsolete $1 guard and untested live-status statements.

September 26, 2026. The user requested a handoff. All subagents are finished. Preserve the uncommitted work and do not restart discovery.

## Latest instruction and immediate next action

The user accepted the existing OpenRouter key's **$3 weekly limit**, saying "3 is fine for me. handoff your work". The earlier assistant-imposed $1 non-resetting requirement is superseded. Do not ask the user to change the key back to $1.

The implementation has NOT yet been changed to reflect this acceptance. `server/ai/intake.mjs` still rejects `limit > 1` or any non-null `limit_reset`, and its tests encode that guard. The first live browser attempt returned `budget_unverified` before inference. Safe metadata verification reported limit 3, weekly reset, remaining 3. The next concrete change is to align the local budget guard and tests with the accepted $3 weekly configuration, then verify a small real DeepSeek request end to end. A weekly key reset does not authorize spending beyond the user's original $10 total budget. No automatic top-ups, purchases, provider changes or deployment.

The user wants **one issue completed and tested at a time**. The active issue is genuine AI assistance, not another visual rebuild. Finish the first live AI checkpoint before starting the queue below.

## Repositories, branch and execution style

Application: `/home/het/personal/ai-housing-navigator`, branch `feat/guided-project-workspace`, HEAD `8bc1349` before this handoff. Many tracked changes and new source files are uncommitted. No commit, push, PR or deployment was made this session. Preserve tracked AND untracked files. This branch descends from `feat/first-prototype` at `d2940aa`, the head of open app PR #1 when checked. A new application PR should stack onto that branch while PR #1 remains unmerged; recheck remote state before publication.

Research: `/home/het/personal/ai-housing-hackathon-wiki`, branch `docs/technical-design-v1`. Its `docs/handoffs/current.md` was updated, but source research/specification pages were not. Read each repository's AGENTS.md before work. The accepted specification, decisions and ADR 0006 remain product authority; use only relevant slices of proposed technical design.

Act as orchestrator. Use GPT-6 Sol for implementation and GPT-6 Luna for bounded support. Reuse agents, keep main context lean and assign explicit file ownership. This session used one shared feature checkout, not separate agent worktrees. There is no swarm or dynamic harness. No credentials or personal records in source, no em dashes, no numerical feasibility score or permission verdict.

## Current local application

- `/welcome`: procedural illustrative Three.js neighborhood, pause/reduced motion, full cleanup, one bounded renderer retry and static fallback. It is not property evidence.
- `/projects/new`: six-step guided draft, serialized IndexedDB persistence, corrupt-data preservation until explicit reset, transient invalid-count feedback, finance diligence, review and Markdown brief.
- `/`: historical Lanark two-proposal comparison. `/design-system`: existing design-system specimen. The new guided flow does not yet duplicate/compare proposals; comparison was not removed from the old route.
- Generic property entries remain unresolved. The Lanark parcel outline is an explicitly selected dated example. The property step has a fixed regional OpenStreetMap iframe with attribution, no address transmission/geocoding or property selection. It is regional orientation, not a verified county-boundary or parcel-identity tool.
- Legacy routes are lazy-loaded. Vercel exact rewrites for `/welcome`, `/projects/new` and `/design-system` are prepared but not deployed. The guided footer still links `/prototype`; replace that with `/` before hosting, or deliberately implement that route and rewrite.

## Implemented AI slice, live result not yet verified

Pinned runtime model: `deepseek/deepseek-v4-flash-0731`, provider `deepinfra/fp8` on OpenRouter. This is the user's preferred DeepSeek V4 Flash July 31 release, not GPT-4.1 Mini. Public endpoint metadata checked this session reports $0.06/M input and $0.18/M output, strict structured output support and ZDR eligibility. Recheck provider metadata if routing fails; do not silently switch models.

`server/ai/intake.mjs` validates request/output fields, work enums and exact quoted substrings, checks key-budget metadata before completion, limits one in-flight request and three paid attempts per minute, sets a 1024-token output cap, disables reasoning, rejects refusal/truncation and has explicit timeouts. It pins the provider with ZDR, denied data collection, strict schema and no fallback. Sanitized logs include request ID, model, tokens and estimated cost, never keys or original text. The local rate limiter is process-local, not a public hosted spending ledger.

On proposal step 3, **Suggest work from my description** sends text to the server. `IntakeReview.tsx` shows definite, tentative and excluded interpretations plus at most one question. Suggestions begin unchecked. **Apply selected work** merges only selected suggestions and preserves manual choices. Editing aborts/rejects stale responses by draft ID/revision. Failures preserve the description and manual controls. AI does not evaluate zoning, finances or legal permission. It has not been verified with an actual paid response yet.

Files: `server/ai/intake.mjs`, `server/ai/intake.test.ts`, `server/dev.mjs`, `src/features/projects/ai-client.ts`, `ai-client.test.ts`, `IntakeReview.tsx`, small integration in `GuidedProject.tsx` and CSS, `vite.config.ts`, package `api:dev` script, and accurate capability copy in `Welcome.tsx`.

## Key and local servers

The user created `.env.local` containing `OPENROUTER_API_KEY`. Git ignores it. Do not open, print, copy, commit or inspect credential-file contents. Authorized server runtime loads it; only non-secret cap metadata was inspected. Never expose a `VITE_` key.

- UI: `npm run dev -- --port 5173 --strictPort`, URL `http://127.0.0.1:5173/welcome`.
- API: `npm run api:dev`, binds `127.0.0.1:5175`; Vite proxies `/api/assist`.
- Last-started detached UI launcher PID: 2100825. API launcher PID: 2114063. Verify listeners before starting or stopping anything; do not assume these PIDs remain valid. The earlier UI process exited unexpectedly and the user received a dead link. Do not kill broad process groups or stop unrelated servers.
- API origin currently accepts `http://127.0.0.1:5173`; use that exact UI origin for the live test.
- Vercel CLI login was verified; Supabase CLI project-list access works, but no Housing Navigator project/link exists. No infrastructure was provisioned. CLI login is not completed runtime setup.

## Verification and artifacts

After the AI changes, fresh main-agent commands passed: **85 tests**, typecheck, lint and production build. `git diff --check` passed. Existing guided browser regression passed again after AI integration, including unavailable storage and export. A zero-cost AI browser test intercepted every `/api/assist` request and passed stale-response discard, explicit unchecked selection, manual-choice preservation, negation exclusion and simulated budget failure. No paid inference calls occurred.

Earlier in this session all four preview browser suites passed: welcome, guided, original prototype and design system. Desktop/mobile screenshots were inspected, including 320px map loading and progress navigation. Those are UI/mechanical checks, not user acceptance or proof of a useful product. Build retains a roughly 524 kB lazy Three.js scene warning. Prior local startup samples were 1.49 seconds for welcome and 0.835 seconds for guided, not hosted benchmarks.

Logs/artifacts are temporary under `/tmp/housing-guided-verification/`: `ai-final-{test,typecheck,lint,build}.log`, `ai-guided-regression.log`, `ai-offline-browser.mjs`, `ai-offline-browser-report.md`, `ai-offline-browser.png`, `ai-live-browser.mjs`, `ai-live-browser.log`, `ai-server.log`, `ai-checkpoint-report.md`, `ui-diagnosis.md`, `design-references.md`, `rushi-files-review.md`. If temporary files are gone, use this handoff and source tests instead of assuming results. `ai-live-browser.mjs` makes ONE actual API call and checks repair/possible addition/no extra dwelling; run only after correcting the accepted cap guard, checking server freshness and confirming the bounded test spend. No automatic retry loop.

Browser connector discovery returned no browser. Standalone Playwright with `/usr/bin/chromium` worked outside the sandbox. Use the browser skill before choosing a browser surface. Avoid personal browser profiles.

Wiki `npm run check` passed: 79 concepts, zero problems.

## User feedback and queued work

The user rejected the visual design and confusing results. Do not describe it as a finished or accepted product simply because tests pass.

1. Finish the real DeepSeek intake interaction and let the user test it. It is structured intake assistance, not a full AI assessment.
2. Restore secondary A/B proposal comparison inside the guided flow: duplicate a confirmed proposal, preserve both, and show meaningful differences with deterministic calculations. Do not run the historical Lanark evaluator on arbitrary properties.
3. Make results understandable: lead with the actual proposal-specific finding/evidence and one concrete next action, not generic slogans and eight repeated verification labels.
4. Correct typography and design-system drift. Current task body is 13px, supporting text 10-11px, headline up to 68px; many new controls/colors bypass shared components. Use shared controls and readable body text. Remove content-opacity effects that make evidence look washed out.
5. Improve welcome/map purpose and taste. Reduce dominant Lanark branding to a secondary example. The user wants a compelling map/property experience, not a generic iframe attached to a form. The current illustrative 3D scene and actual 2D evidence must remain distinct.

21st.dev/Mobbin were not used to guide the initial build. A later bounded critique inspected two public 21st.dev examples and only Mobbin's public catalog, not individual flows. Do not claim otherwise or add libraries solely for appearance.

## Rushi's downloaded research

A Sol agent reviewed only the two newest user-authorized files: `/home/het/Downloads/Slack_hackathon.md` and `/home/het/Downloads/A Decision-Focused Proposal-Comparison Brief for Pittsburgh Housing.pdf`. They are the same ChatGPT Deep Research comparison brief in Markdown and 20-page PDF, not independent evidence and not a Slack transcript. Originals were untouched. No external source claims were independently verified.

The field checklist is useful for later versioned comparison. Its eight-home Lanark project and 21 Lanark example must not be conflated with the app's 1623 Lanark parcel. It does not supersede the accepted action-first scope, supply runtime code/data/assets, or require immediate app changes. Do not copy incoming research or personal conversations into the public repository without review.

## Resume prompt

Read AGENTS.md and this handoff. Preserve all uncommitted source. Use and reuse Sol for implementation, Luna for bounded support, and one issue at a time. The user accepted the existing $3 weekly OpenRouter limit and prefers DeepSeek V4 Flash. First update the local server's obsolete $1/no-reset guard and tests to the accepted configuration without expanding the overall $10 budget, then verify one small real browser-driven AI response. Do not ask the user to recreate the key, inspect credentials, restart discovery, deploy, or jump to comparison/visual redesign before this checkpoint is tested.
