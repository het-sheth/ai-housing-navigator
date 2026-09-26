# Resume: guided workspace and animated introduction

September 26, 2026. User explicitly stopped the session. All agents stopped. This is a work-in-progress checkpoint, not a passing release. Do not restart product discovery.

## Requested execution style

Act as an orchestrator. Keep the main context lean and clean. Use Sol for implementation and Luna for bounded support/checks. Reuse agents for related tasks and follow-up fixes. Give each a small file scope and a concise brief, ask for concise results, and keep full logs in files. Do not repeatedly load the entire wiki or source tree into the main context. No large swarm or dynamic harness is needed.

## Repositories and authority

Application: `/home/het/personal/ai-housing-navigator`, branch `feat/guided-project-workspace`. Research: `/home/het/personal/ai-housing-hackathon-wiki`, branch `docs/technical-design-v1`. Read each AGENTS.md before searching/editing. Keep code and research separate. Preserve all work; no credential inspection or em dashes.

The wiki accepted specification and decision log are authority. Read the latest amendment and the current handoff, then only the relevant design/implementation slice. Wiki PR #3 was merged. Wiki PR #4 and app PR #1 were open at last verification. The current build branch and latest financial/3D amendments have local checkpoint commits only; do not assume they are on GitHub. Rushi's write invitation was pending at last check, not confirmed accepted.

## Latest accepted steering

1. Start building in the existing app. Assessment/actions primary, comparison secondary, no overall score.
2. Ask early whether the user has a preliminary budget, applicable expected sale/rental assumptions, and a funding path. Unknown/missing information produces a prioritized financial diligence task; financial feasibility remains Unassessed. The amendment is recorded in wiki spec, decisions, design and plan.
3. User wants an excellent UI and chose a striking animated introduction as the first purpose of 3D. Use illustrative neighborhood art, explicitly separate from sourced 2D parcel evidence. No invented site/building geometry claims.
4. Blender is not installed. Three.js and @types/three were installed for a procedural intro. Blender-authored GLB is a later option, not something already built.
5. No deployment, new purchases, provider setup or expanded runtime AI occurred.

## What exists at this checkpoint

- Original Lanark prototype remains in App.tsx/domain.ts; source unchanged. Original route `/` and `/design-system` intended to remain available.
- `src/features/projects/contracts.ts`: broad activity and role constants, strict Draft validation, finance/coverage/task summary. 27 tests.
- `src/features/projects/draft-store.ts`: serialized IndexedDB load/save/clear with validation and transaction completion. 3 tests. Separate native Chromium round-trip/clear probe passed.
- `src/features/projects/GuidedProject.tsx`: six-screen UI written but not visually verified. `guided-project.css` missing. Potential corrupt-storage recovery bug: prevent autosave overwriting invalid stored data before explicit reset. Test IDs/accessibility labels still need alignment with browser tests.
- `src/features/welcome/Welcome.tsx`: initial landing component written. `NeighborhoodScene.tsx` and `welcome.css` missing. No 3D scene is implemented yet. SVG fallback lacks requested test ID.
- `src/main.tsx`: lazy routes `/welcome` and `/projects/new` added. Missing imports currently break build.
- `scripts/guided-flow-smoke.mjs`: partial, unfinished browser suite; unused imports/helpers currently fail lint.
- `scripts/welcome-smoke.mjs`: intended landing/mobile/keyboard smoke checks; not passed.
- `docs/guided-build-progress.md`: compact build scope and rulings.

## Verification at stop

Fresh `npm test`: 71 passed, exit 0. `npm run typecheck` and `npm run build`: exit 1, missing NeighborhoodScene import. `npm run lint`: exit 1, three unused imports/helpers in incomplete guided-flow-smoke.mjs. Missing CSS will also need resolution. No finished UI/browser success claim.

Wiki `npm run check`: exit 0, 79 concepts, zero problems. `git diff --check` passed. Prior wiki full test suite had 40 passing tests outside sandbox before the latest amendment; rerun before publication if needed. Existing dependency audit warns about moderate Vitest development dependencies; no Three vulnerability was reported. No audit fix was applied.

## Exact continuation

1. Sol agent A: finish GuidedProject CSS and corrupt-load/autosave guard; align accessible controls/test IDs. Coordinate with domain contracts. Do not call hardcoded Lanark evaluator for arbitrary parcels.
2. Sol agent B: implement NeighborhoodScene and welcome.css. Art direction: ink #151713, warm ivory #f4f1e8, gold #efb83c, existing IBM Plex fonts; editorial typography and orthographic miniature Pittsburgh-style rowhouses/street/trees with a highlighted gold home. Slow optional motion, pause, reduced-motion support, WebGL fallback, render-resource cleanup. Main CTA Start a project -> /projects/new. Label illustration as not the user's property. No downloaded assets or fabricated evidence.
3. Luna support agent: inspect bounded test/route contracts, complete test checklist and documentation links. Delegate tricky persistence/security judgment to Sol or main when needed.
4. Reuse agents for fixes. Run npm test, typecheck, lint, build; then guided/welcome and existing prototype/design-system browser suites. Inspect desktop/mobile screenshots before describing UI as complete. Finish actual browser coverage for draft recovery, storage failure, mixed scope, generic property isolation, financial priority, result invalidation, export and keyboard/320px layout.
5. Update both handoffs with real results. Keep this WIP distinguishable from launch readiness. No need to repeat baseline research or invoke a large harness.

## Browser testing

In-app browser bootstrap succeeded but no browsers were available; list returned empty. Standalone Playwright with /usr/bin/chromium is available and requires outside-sandbox execution here. Existing local server was reachable at http://127.0.0.1:5173/ outside sandbox; verify before starting another server. WebGL smoke script requests software rendering. Do not inspect personal browser profiles.

Tests expect data-testid `guided-workspace`, `draft-save-status`, `next-action-list`, `welcome-screen`, `neighborhood-scene` with data-render-state ready/fallback, and `scene-fallback`. Verify these against actual components before running. The welcome test checks Start a project, Pause animation and Resume animation controls.
