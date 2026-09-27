# Application Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Combine the reviewed walkthrough, source, Explorer and proposal comparison branches into one reviewable application branch with working routes and truthful parcel map states.

**Architecture:** Start from the walkthrough integration head and merge the page integration branch with Git ancestry intact. Reconcile the two pages with the current shared map contract, preserve source router adapters and screening evidence separation, then merge the original reviewed branch heads so the resulting branch records their provenance. Keep this work in the isolated consolidation worktree.

**Tech Stack:** npm, React, TypeScript, Vite, Vitest, Playwright, Node API routes.

**Spec:** `docs/current.md`, `docs/page-integration.md`, wiki product specification and accepted ADR 0008.

## Global Constraints

- Preserve parcel IDs as strings and distinguish saved or confirmed parcels from suggestions.
- Withhold all numeric scores until every required rubric factor is assessed; source observations do not complete rubric checks.
- Keep the guided route, Explorer, comparison and source API routes available.
- Do not call paid AI, inspect credentials, deploy, or push main.
- Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` after changes.

## Review Focus

- Explorer inspection error and retry keep the candidate identity honest.
- Comparison restores the exact parcel's A/B state after a storage failure during a parcel switch.
- Delayed responses cannot attach previous parcel detail to the current parcel.
- A source error cannot produce a numeric score or hide an unassessed rubric factor.
- Candidate route dispatch takes precedence over a broader property route.

---

### Task 1: Merge feature trees and reconcile map contract

**Files:** `src/features/explorer/PropertyExplorer.tsx`, `src/features/comparison/ProposalComparison.tsx`, `src/features/projects/SiteContextMap.tsx`, `server/dev.mjs`, `server/hosted/api.test.ts`, `src/main.tsx`, `vercel.json`.

**Interfaces:** Pages pass `historical`, `detail`, `savedParcelId`, `loading`, `loadError` and `onLoadCurrentRecords` to `SiteContextMap`. The candidate API remains `GET /api/property/candidates` and exact parcel detail remains `GET /api/property/parcel?pin=<ID>`.

- [x] Merge `origin/feat/explorer-comparison-integration` and inspect all overlapping route and API files.
- [x] Write focused regression for map identity and retry behavior; run it to see the missing contract fail.
- [x] Implement the minimum page changes for the map contract, then run focused regressions and typecheck.
- [x] Check that all routes and source adapters remain reachable and source observations remain distinct from rubric checks.

### Task 2: Preserve reviewed ancestry

**Files:** Git history only unless conflict resolution is necessary.

**Interfaces:** Merge commits preserve original heads `property-explorer`, `proposal-comparison`, `walkthrough-recovery`, `source-hud-data` and `source-lodes-employment` as ancestors.

- [x] Compare each original head with its already integrated equivalent and verify content equivalence before resolving conflicts.
- [x] Merge each reviewed original head and record any conflict resolution in the handoff.
- [x] Verify each reviewed head is an ancestor of the consolidated branch.

### Task 3: Verify and hand off

**Files:** `docs/current.md`, `docs/application-consolidation.md`, this plan.

**Interfaces:** Browser scripts use synthetic public API fixtures and block AI requests.

- [x] Run all four project gates and inspect exit codes.
- [x] Run production-preview browser smoke scripts for walkthrough, Explorer, comparison and page handoff at desktop and mobile widths.
- [x] Update the current handoff and add a concise consolidation record with exact included refs, verification and source limits.
- [x] Inspect the final diff, commit integration changes using the repository convention and report the final head.
