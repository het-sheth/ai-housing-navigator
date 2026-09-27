# Walkthrough completion plan

Goal: finish the existing single-property walkthrough while keeping the new property explorer separate.

## Accepted scope

The original guided workspace keeps its right-hand interactive map. A user searches public records, confirms a parcel, describes a proposal, confirms structured inputs and explicitly runs supported source checks. Results prioritize concrete findings and next actions. No score, range or numeric check contribution is exposed until every required rubric factor is assessed. Missing facts remain unknown.

The separate `feat/property-explorer` branch at `/tmp/ai-housing-property-explorer` captures AI-confirmed citywide candidate search and single-parcel proposal comparison. Its baseline predates this walkthrough's uncommitted changes. Integrate the verified walkthrough commit there before implementation. A requested screen reference has not been attached. No explorer UI, citywide ingestion or infrastructure is part of this walkthrough checkpoint.

## Implementation and verification

1. Backend owner: `server/screening/` and rubric documentation. Return named sourced findings and actions; withhold numeric output on incomplete assessments. Verify supported, unsupported, failed and incomplete cases.
2. Walkthrough owner: `src/features/projects/` and browser scripts. Persist explicit housing form and ground disturbance, migrate existing drafts to unknown, send only confirmed live parcel IDs, reject stale responses after any edit or project switch, and export findings with provenance.
3. Independent review: API response validation, saved-draft compatibility, unknown handling, stale responses and incomplete-score gating.
4. Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`. Exercise the real property and assessment browser flow, mobile map, historical drafts, errors and stale requests with AI blocked.
5. Update current and resume handoffs with exact branch/worktree state, verification and limitations. Preserve all work. No deployment, main push, credential inspection or paid inference.

## Completion boundary

This completes the bounded walkthrough and its supported source checks. It does not complete all zoning rules, financial feasibility, utilities, citywide candidate search, cloud persistence, authentication or corrected-prompt paid AI validation. Current source coverage cannot produce a complete score.
