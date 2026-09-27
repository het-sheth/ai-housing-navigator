# All-source backend integration plan

The user explicitly requested all 60 organizer catalog entries, including regional and financial data, on September 26, 2026. The user identified Downloads as the source location. A bounded review found two duplicate housing catalog CSVs there, not underlying records. Unrelated or ambiguous downloads were not opened. Remaining adapter work uses public providers.

## Completion criteria

Every catalog entry must have a verified source identity and one of these documented outcomes: a working, tested retrieval or ingestion path that returns correctly scoped data; a research/document retrieval path where the entry is not a structured dataset; or a specific demonstrated external blocker. Listing an entry in the catalog API does not complete its integration.

Keep parcel, tract, municipality, regional, time-series and document evidence distinct. Regional rents, sale-price indexes or cost indexes must not be presented as parcel comparables, construction estimates or financial feasibility. Record geography, units, observation period, retrieval time, provenance, access limitations and unknowns. Preserve string identifiers and conflicting source observations. No paid access, credentials, provisioning or deployment is authorized by this request.

## Sequence

1. Preserve the completed 60-row catalog reconciliation and duplicate-download inventory. Add source records only when their identity and safe schema are verified; avoid unrelated personal downloads.
2. Define normalized retrieval results for each source class, including independent unavailable/error/incomplete states and coverage. Select allowlisted public fields before returning records.
3. Reuse existing live parcel adapters and add verified public hazard/overlay observations. Keep observations separate from assessed rubric factors.
4. Add downloaded-data or provider adapters for the remaining verified source classes. Preserve their actual geographic and temporal scope; do not invent parcel joins.
5. Expose source discovery and scoped retrieval through shared local/hosted API handlers. Document where local files cannot be available to a hosted deployment without a separate storage step.
6. Test valid queries, unsupported geographic joins, malformed/truncated data, source errors, provenance and sensitive-field exclusion. Validate real bounded queries where available, with no paid AI calls.
7. Review all 60 outcomes and update `flow.md`, architecture, source coverage and current handoffs. Report any remaining blockers explicitly; do not describe registry-only coverage as full integration.

## Verified first slice

The live first slice exposes the 60-entry source registry and 14 supplementary Pittsburgh observations: exact-parcel PLI records plus 13 City hazard and overlay layers. These are separate from the seven required rubric factors. A bounded public test parcel returned all 14 observations without source errors, while the score remained withheld. This is a completed subset, not completion of the all-source request.

## Review and publication checkpoint

The implementation is split into independently verified PRs: registry foundation, parcel evidence/query contract, regional adapters and spatial adapters. The walkthrough correction is a separate UI PR. Architecture and source-coverage documentation follow the backend stack. No merge or deployment is included.

The [60-source outcome table](source-integration-status.md) records the bounded probe: 35 source/context paths, seven reference metadata paths and 18 no-data outcomes. Unfinished bulk parsers remain implementation work, including CHAS and income limits. Restricted access is a separate provider constraint. The all-source objective is not complete.
