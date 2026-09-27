# Focused one-home assessment

User approved September 27: connect official APIs and downloadable reference sources to one useful task: screen a Pittsburgh lot for one proposed detached new home. Work stays on feat/official-review-sources until reviewed. Preserve broad intake, existing drafts, account contracts and current production.

## Scope clarification

The user explicitly clarified: do not rebuild the product or rework existing flows. This is backend depth plus a tested example through existing Assess. Only minimal result display/export changes are needed to expose the new evidence. No new navigation, intake, Home, Compare layout or product positioning. Broad supported intake remains unchanged.

## Outcome

Show the confirmed parcel's site evidence, applicable baseline district requirements, potential obstacles and specific evidence to gather. Separate recorded measurements, baseline code standards and unverified design compliance. No combined score, inferred utility capacity or permission verdict. AI remains optional reviewed activity intake.

## Tasks and ownership

1. Sol backend: verify official R1D residential standards, retain dated structured references, reuse live exact-parcel and district data, add an optional focused assessment result and meaningful tests. Own server modules and reference data only.
2. Sol frontend: after contract reconciliation, validate the optional result in live and saved results, present a compact useful one-home section and include it in export. Preserve old snapshots and unsupported proposals. Own src only.
3. Coordinator: reconcile interfaces, inspect source evidence, run all required checks and an actual browser rehearsal. Own scripts and documentation.
4. Independent Sol review: evaluate evidence applicability, misleading conclusions, untrusted snapshots, source failures and data-loss boundaries. Implementers fix concrete findings before final verification.

## Decisions

- Use versioned curated requirements when official code is readable but denies automated runtime retrieval. Label review date separately from effective date and live retrieval.
- Existing map APIs establish observations, not dimensional compliance. Recorded lot area can be compared to a baseline threshold only with explicit scope and exceptions.
- BDA and water guidance inform next steps. They do not clear process or infrastructure checks.
- No AI scope expansion or model changes in this slice. An audit of the user's older AI recommendations is read-only.

## Integration checks

| Interface | Producer and consumer | Constraint |
| --- | --- | --- |
| Optional focused result | Backend and frontend | Freeze contract before frontend edits; old results remain valid |
| Sources and applicability | Rules and UI | Preserve scope, dates, exceptions and unavailable states |
| Saved results | Validator and restore | Reject malformed additions, accept older payloads |
| Evidence and export | Results and brief | Identical underlying facts, no invented clearance |

## Latest scope decisions

- Group the new dimensional, City process and water guidance as Development requirements in the existing result. Show concrete evidence to obtain and responsible parties; do not claim permit determination, capacity or complete design compliance.
- Keep the public-data checks live. The user explicitly declined a source-data cache for now. Project snapshots are separate storage.
- Bring README into alignment with Participant Packet pages 6-9 and distinguish working production, new branch evidence and incomplete submission artifacts.

## Verification

Run npm test, npm run typecheck, npm run lint and npm run build. Test unsupported proposals, wrong/uncertain jurisdiction, multiple zoning districts, missing/invalid records, threshold boundaries, failed sources and saved payload validation. Rehearse one supported live parcel locally with paid AI blocked, inspect rendered desktop/mobile content, export and reload. Report live versus fixture evidence separately.

## Completion evidence

Backend, minimal frontend/export and README tasks are complete. Final independent review resolved altered source-link and base-value validation, current BDA export wording and recorded-lot exception provenance. All 307 tests, typecheck, lint and build passed. Final local live browser evidence is `/tmp/housing-one-home-rehearsal/evidence.json`, timestamp 2026-09-27T21:33:42.621Z. No paid AI request, database change, runtime cache, merge or deployment was part of this slice.
