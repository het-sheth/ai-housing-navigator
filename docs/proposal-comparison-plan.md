# Single Parcel Proposal Comparison Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Add a device-local comparison page for two independently edited housing proposals on one County-confirmed parcel.

**Architecture:** A model validates proposal and screening snapshots; a browser store persists them per exact string parcel ID. The page loads saved work, explicitly confirms current County parcel records, then runs the existing screening endpoint per side. Side-specific abort and epoch guards prevent stale results from crossing edits or parcels. A right-hand SiteContextMap shares confirmed site context.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright smoke, localStorage, existing County property and screening endpoints.

**Spec:** AGENTS.md, docs/current.md, and the accepted wiki product spec, decisions, ADR 0006 and ADR 0008.

## Global Constraints

- Preserve parcel IDs as strings, including leading zeroes, and require exact County identity confirmation before checks.
- Distinguish sourced findings from proposal intent. Show status, reason, source URL/date, retrieval time, unknowns and next actions.
- Withhold every score, range and numeric contribution until every required rubric factor is assessed. Never claim legal permission, approval probability or financial feasibility.
- Device-local persistence only. No AI call, credentials, cloud storage, deployment or em dash.
- Run npm test, npm run typecheck, npm run lint and npm run build after changes.

## Review Focus

- A parcel ID with leading zeroes survives URL, lookup, saved key and screening unchanged.
- A corrupt saved record remains untouched and produces an explicit storage error.
- Editing side A invalidates only A, including a request already in flight.
- Reconfirming a new parcel prevents an older property or screening response from appearing there.
- A failed refresh preserves and labels the prior dated result.

---

### Task 1: Validate independent snapshots and storage

**Files:** src/features/comparison/comparison-model.ts, comparison-store.ts, comparison-model.test.ts, comparison-store.test.ts.

**Interfaces:** Comparison contains parcel ID and A/B ProposalSlot. updateProposal clears only the edited side. resultMatchesInput validates exact screening inputs. loadComparison and saveComparison use exact parcel ID keys.

- [x] Write tests for side-specific invalidation, changed and unchanged checks, score withholding, leading zeroes, corrupt storage and restored exact-input snapshots.
- [x] Run focused tests and observe failure.
- [x] Implement the model/store corrections, then rerun focused tests.

### Task 2: Render and guard the comparison page

**Files:** src/features/comparison/ProposalComparison.tsx, proposal-comparison.css, src/main.tsx, vercel.json.

**Interfaces:** The compare route prefills a candidate ID. County confirmation gates new checks. Each side submits the existing screening payload independently. Failure retains a labeled prior result.

- [x] Write a browser smoke for exact parcel confirmation, both runs, side-specific edits, failed refresh, reload and stale requests.
- [x] Run smoke before implementation. Chromium launch was blocked by the sandbox, so no page behavior was observed in that first run.
- [x] Complete the page, CSS, route and rewrite, then rerun smoke at desktop and mobile widths with bounded escalation.

### Task 3: Verify and commit

- [x] Run npm test, npm run typecheck, npm run lint, npm run build and browser smoke, recording exit codes.
- [x] Review the diff against the spec and constraints, then commit scoped changes on feat/proposal-comparison with a Conventional Commits subject under 50 characters.
