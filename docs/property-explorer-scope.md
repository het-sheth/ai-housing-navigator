# Property explorer: proposed scope

Status: scope preparation for the separate property-explorer project, while the current walkthrough is being finished. The intended reference screen has not been provided or inspected, so exact screen replication remains blocked on that reference.

## Proposed experience

1. The user describes a housing idea in natural language. AI proposes structured criteria, assumptions and missing questions. The user reviews, edits and explicitly confirms those criteria before they are used. AI may organize intent, but it does not establish parcel identity, source facts, legal permission or project availability.
2. The app finds candidate parcels in Pittsburgh. Each candidate includes why it matched the confirmed criteria, the source and its date, check coverage, and any unknown or conflicting information. Parcel identifiers remain strings, including leading zeroes. A candidate is a record match for review, not a claim that the land is available, controlled by the user, buildable or permitted for the proposal.
3. The user selects a parcel and then evaluates proposal A against proposal B on that same parcel. Preserve each proposal and show the supported differences, evidence and prioritized next actions. Parcel discovery and proposal comparison are separate steps.

The right-hand panel remains a map. An optional 3D view belongs there only when terrain and buildings use meaningful, accurately sourced data with dates and clear limits. When that data is unavailable or unsuitable, show the useful 2D parcel and street context. Do not turn approximate footprints into verified buildings or use decoration as property evidence.

## Screening and score boundary

The user has asked for a preliminary Pittsburgh screen that connects zoning with mapped site hazards. Treat its output as a bounded comparison of the evidence covered by the rubric, with named check states and actions. It must disclose the exact jurisdiction, factors, sources, source dates and retrieval times, along with unavailable and conflicting evidence.

Do not display a numeric score or range until every factor required by the scoring rubric has an assessed result. If a required factor is unknown, unsupported, failed or incomplete, show the unfinished checks and next actions without a number. A completed screen still cannot claim permission, feasibility, ownership, availability or approval. Financial feasibility remains unassessed without a reviewed financial method and adequate evidence.

The latest user decision supersedes the older no-score guidance in ADR 0006 for this Pittsburgh pilot: a preliminary score is allowed only after every required rubric factor has an assessed result. ADR 0006 remains historical until its documentation is updated. The current preliminary backend is not proof of full rubric coverage or calibration.

## Sequence and constraints

- The current walkthrough is being completed alongside this scope preparation.
- The reference screen is missing. Do not claim exact replication or infer its specific layout and interactions.
- Do not make another paid AI request or silently change the configured model.
- Do not provision infrastructure, deploy or connect authentication as part of this proposal.
- Keep current source limitations, city versus county jurisdiction, and historical example data visible. Do not present a limited Pittsburgh check set as countywide coverage.

This scope is not practitioner validation or evidence that the suggested flow improves outcomes. Revisit it after the walkthrough review and reference-screen inspection.
