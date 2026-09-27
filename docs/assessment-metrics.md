# Assessment metrics and evidence

The Review and Results pages describe individual public-record checks. They do not produce a combined Development Ease Score, financial verdict, permission decision or approval probability.

## Main checks

| Check | Current evidence and coverage | Metric score |
| --- | --- | --- |
| Zoning use | Whole-parcel approved City zoning map match, plus a narrow published use-table rule for one detached home in an R1D district. Additional dwelling, mixed use and uncertain work are outside that rule. | 2/2 only for the supported rule. Other proposals remain unscored. |
| Other zoning requirements | Dimensions, setbacks, lot coverage, overlays and lawful baseline require proposal-specific review. | Not scored. |
| Flood | FEMA mapped zone intersections and whole-parcel containment. | 2/2 for exactly one matching whole-parcel X minimal-hazard feature; 0/2 for an explicit A/V zone intersection. Ambiguous coverage or a hazard flag without supported zone evidence remains unscored. |
| Steep slope | Intersection with the City mapped 25 percent slope layer. Actual slope and the proposed work footprint are not measured. | Not scored, including where ground disturbance is unknown. |
| Undermining | City mapped undermining flag and source coverage. This is not a subsidence or ground-stability assessment. | Not scored. |
| Review process | Permit path and required documents for the work combination. Not implemented as a complete assessment. | Not scored. |
| Infrastructure and access | Parcel-specific utility capacity and access. Not verified by current checks. | Not scored. |

The two-point metric score is a provisional ordinal screen: 2 means the named narrow rule returned its favorable result; 0 means the named mapped constraint was returned. It is not a percentage, calibrated confidence, relative ranking or complete metric assessment. There is no guessed midpoint for uncertainty. A missing score means the rule cannot establish a result. Source dates may remain unknown even when retrieval succeeded; the UI discloses both dates separately.

## Supplementary observations

The app separately requests exact-parcel permit records and 13 City map layers:

1. Permit records, capped at 100 returned records with incomplete results disclosed.
2. Mapped undermining.
3. Mapped landslide-prone areas.
4. Stormwater riparian buffers.
5. River riparian buffers.
6. Historic districts.
7. Historic properties.
8. Inclusionary housing overlay.
9. Baum-Centre overlay.
10. North Side commercial parking overlay.
11. Parking reduction overlay.
12. Major-transit buffers.
13. Height reduction zones.
14. Riverfront height overlay.

These are source observations, not 14 additional assessed feasibility metrics. Undermining also informs the main undermining check and must not be counted twice. A returned intersection, absence of returned features or historical permit does not establish current applicability, permission or safety.

## Property records and project inputs

County assessment records supply parcel identity, address, classification, recorded use, lot area and year built when available. County GIS supplies the parcel boundary, and municipality checks determine whether the bounded Pittsburgh screen applies. These establish context, not feasibility.

Existing/proposed homes, homes retained, net new homes, housing form, work activities, ground disturbance, affordability goals and non-housing uses are user inputs or calculations from those inputs. Financial readiness records whether the user has considered budget, revenue/value and funding. Financial feasibility remains unassessed.

## Decision history

On September 27, 2026, the user explicitly replaced the all-metrics-or-no-number policy with scores for supported individual metrics and approved the Review/Results redesign. The aggregate remains withheld. No model fills missing evidence, no new paid AI behavior is added, and existing privacy and spending boundaries remain unchanged.

## Focused one-home example

The source branch adds an optional evidence supplement to the existing Assess result for one new detached home in wholly mapped Pittsburgh R1D-L or R1D-H. New construction with optional site work is the bounded proposal scope. Other proposal inputs and existing pages remain supported as before.

The supplement compares an exact-parcel County assessment LOTAREA value in square feet to the district's published base minimum. It does not compare surveyed dimensions or the proposed building footprint. A value above the minimum is an arithmetic observation, not compliance or a new score. Missing, malformed, ambiguous or failed assessment records produce an unavailable comparison without discarding other checks.

The versioned reference records derive from [Title 9 section 903.03](https://ecode360.com/45474194), reviewed September 27, 2026. They include base lot size, setbacks, height and story limits for these two districts. The displayed May 7, 2025 date is section amendment history, not a verified effective date for every individual value. Contextual provisions, environmental standards, compatibility requirements, exemptions and lawful baseline remain unresolved. The code reference is curated, not fetched afresh during every screen.

[City Building & Development Application guidance](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Building-Development-Application) and [Pittsburgh Water tap-review guidance](https://www.pgh2o.com/developers-contractors-vendors/permits/water-and-sewer-tap-plan-review) provide specific next actions. These are dated guidance references, not live parcel-specific permit or capacity determinations. Provider service territory must be confirmed. Review process and infrastructure remain unscored.

Run `node scripts/one-home-live-smoke.mjs` against a local built application with live public APIs to rehearse Tweed St parcel `0042J00243000000`. The script blocks paid AI, requires actual expected source findings, checks the new comparison, exports the brief and verifies local draft recovery. It never substitutes fixtures when upstream evidence changes. Record each run's origin and timestamp separately from deployment evidence.
