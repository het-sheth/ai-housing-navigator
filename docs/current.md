# Current app handoff

September 26, 2026, first local prototype. Local repository `/home/het/personal/ai-housing-navigator`, branch `feat/first-prototype`. No remote, deployment or publication. React + TypeScript + Vite, npm lockfile. Fresh code, no previous project implementation reused.

## Run and use

Development server: http://127.0.0.1:5173/. Restart with `npm run dev -- --port 5173 --strictPort`. Select Lanark, edit the repair/expansion assumptions, compare findings, download the Markdown brief or print. Inputs are session-only and reset on reload.

The comparison uses explicitly dated September 26 research evidence with September 1 assessment vintage. A separate live assessment observation succeeded at 17:50:22 UTC on September 26: VACANT LAND, 1,657 sq ft, as of September 1. Snapshot conflicts persist. Source failure remains visible; no silent replacement or constraints clearance.

## Verification

Final app checks: 27 tests pass; typecheck, ESLint and production build exit 0. Local Chromium smoke test exits 0: selection, added-unit change, favorable assumptions with persistent conflict, invalid input without crashing, simulated network failure, actual downloaded Markdown and its contents, mobile width at 390px, actual live refresh and print rendering. No page exceptions. Print PDF text retains refresh timestamp, observation, parcel ID, conflict and source section. Desktop screenshot visually inspected. Test artifacts: `/tmp/lanark-desktop.png`, `/tmp/lanark-mobile.png`, `/tmp/lanark-comparison-brief.md`, `/tmp/lanark-print.pdf`.

The in-app browser connector was not callable; local Playwright/Chromium was used. Chromium requires execution outside the sandbox here. Tests are in `src/*.test.ts` and `scripts/smoke.mjs`. Independent focused review identified comparison alignment on invalid inputs and print provenance; both were fixed and covered by regression checks. Zero-home and other unsupported unit-count pathways were also guarded.

## Boundaries and next iteration

One parcel, structured assumptions, conditional checks, partial evidence. No AI/model access, financial engine, full code dependencies/effective dates, complete hazards, title, utilities or lawful-use confirmation. Overall ease is not rated. Practitioner fit and organizer acceptance of component-only scoring remain unvalidated. Dataset reuse terms need resolution before publication. No approval or acquisition advice.

Next smallest iteration: walk the running repair-versus-expansion flow with Het, choose one usability change, and validate one precise rule trace with a practitioner/City source. Do not restart broad research. A later unstructured-proposal helper must return bounded fields with explicit unknowns for user confirmation and use a server-side provider boundary. Structured inputs need no redundant AI call.
