# Property Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user describe a housing idea, confirm search criteria, find bounded Pittsburgh assessment-record candidates, inspect a parcel on a live 2D map, and open same-parcel proposal comparison.

**Architecture:** The Explorer owns intake and confirmation state. It may request suggestions from the existing guarded intake API on explicit user action; hosted AI failure preserves editable manual criteria. A new public, read-only candidate endpoint queries the existing WPRDC assessment resource with fixed Pittsburgh and recorded-use filters, validates returned rows, and reports source vintage, limits and unknowns. Existing parcel detail and map adapters serve inspection.

**Tech Stack:** React, TypeScript, Vite, Vitest, Node API handlers, CKAN DataStore, Leaflet.

**Spec:** `docs/property-explorer-scope.md`; accepted product constraints in project `AGENTS.md` and wiki ADR 0006.

## Global Constraints

- No paid AI request during implementation or verification; existing configured model and guard remain unchanged.
- Do not show a numeric score or range without all required rubric factors assessed.
- Assessment-record matching does not establish availability, control, current condition, lawful use, permission or feasibility.
- Preserve parcel IDs as strings, source dates and retrieval times, and unknown fields.
- Pittsburgh-labeled candidate discovery uses full-text County assessment `MUNIDESC` and exact `USEDESC` fields with fixed values; City jurisdiction and all unrepresented idea constraints remain unassessed. Lot-area search is deferred because the source type and range-filter behavior could not be verified in this sandbox.
- Candidate results are bounded at 20 and explicitly disclose truncation.

## Review Focus

- Source returns a non-Pittsburgh-labeled row or unexpected use: reject the response, do not render a false match.
- Source omits a use value: a filtered result must not imply a match.
- Criteria change or pending response arrives late: clear and ignore stale candidates and parcel detail.
- Hosted AI is disabled or intake fails: preserve idea and provide manual confirmation with an explicit failure message.
- Selected parcel ID includes a leading zero: preserve it through inspection and encoded comparison navigation.

---

### Task 1: Bounded candidate search API

**Files:** Create `server/property/candidates.mjs`, `server/property/candidates.test.ts`, `api/property/candidates.mjs`; modify `server/dev.mjs`.

**Interfaces:** `handleCandidates(request, { fetcher?, now? })` handles `GET /api/property/candidates?use=vacant_land|single_family|any`; response contains `status`, `candidates`, `truncated`, `sourceUrl`, `sourceDate`, `retrievedAt`, `coverage`, and `unknowns`. Each candidate preserves `parcelId` and explains recorded-use matching. A dedicated adapter avoids changing exact address lookup behavior.

- [ ] Write tests for fixed City/use filters, string IDs, source evidence, truncation, malformed rows, source failure, and invalid request.
- [ ] Run `npm test -- server/property/candidates.test.ts`; expect RED for missing handler.
- [ ] Implement fixed-field CKAN search and a hosted adapter, then route local development requests.
- [ ] Run `npm test -- server/property/candidates.test.ts`; expect GREEN.

### Task 2: Criteria confirmation and candidate inspection

**Files:** Create `src/features/explorer/explorer-client.ts`, `src/features/explorer/explorer-client.test.ts`; modify `src/features/explorer/PropertyExplorer.tsx`, `src/features/explorer/explorer.css`.

**Interfaces:** `searchCandidates(recordedUse, signal?)` calls the candidate endpoint. `PropertyExplorer` accepts a natural-language idea, offers guarded AI activity suggestions, allows manual activity and recorded-use edits, requires explicit confirmation, renders bounded candidates and unassessed criteria, and inspects the selected exact parcel with the existing map/detail client.

- [ ] Write failing client tests for request validation, response parsing and leading-zero IDs; add browser flow assertions for confirmation, manual fallback, results and compare handoff.
- [ ] Run targeted tests; expect RED for missing candidate client and flow.
- [ ] Implement the Explorer flow, using existing intake client without changing its model or budget guard.
- [ ] Run targeted tests and browser flow; expect GREEN.

### Task 3: Route and final verification

**Files:** Preserve existing `src/main.tsx`, `vercel.json` route edits; add `scripts/explorer-smoke.mjs` if browser assertions need a repeatable runner.

**Interfaces:** `/explore` works locally and on Vercel; `/compare?parcelId=<encoded>` receives an exact string.

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and desktop/mobile browser verification with AI blocked.
- [ ] Review the branch diff against the scope and constraints, fix material issues, and commit only Explorer files with a conventional imperative subject.
