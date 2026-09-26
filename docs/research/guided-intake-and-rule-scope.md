# Guided intake and rule scope

Research date: September 26, 2026. Proposed product design, not approved implementation or legal advice. Bounded to the local Lanark prototype. No practitioner validation was performed.

## Recommendation

Use a guided walkthrough to establish one property baseline, describe proposal A, review its assumptions, then duplicate it into proposal B and change only the relevant answers. Run supported checks as answers change. End with a comparison and exportable next-step brief. Do not present an unimplemented calculation engine or universal property selector.

The current three scope values are internal rule branches, not a complete list of construction activities. A broader activity selector can capture intent, but unimplemented choices must return "Outside this prototype's rule coverage" and retain the user's answers. Adding a dropdown option is not adding legal coverage.

## Primary-source findings

1. The City's permit center separates project scope, work type, structure classification and legal use. It generally identifies new construction, addition/alteration and minor alteration work types. Its residential permitting classification generally covers one- and two-family buildings of three stories or less; other structures are usually commercial. These permit classifications are not interchangeable with zoning categories. It cautions against relying on County assessment to establish legal use. It also says an originally single-family home still used that way will almost never need an occupancy certificate as part of an application. Therefore, an absent certificate cannot automatically mean unlawful use. Source last updated September 23, 2026; retrieved September 26, 2026. [City OneStopPGH Permit Center](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/OneStopPGH-Permit-Center).
2. The City's BDA guidance says the Building and Development Application replaces the Zoning Development Review and Building Permit applications, with simplified prompts relevant to the project. It includes renovation/repair, additions and new structures. This supports a plain-language intake, and cautions against treating older application terminology as current. Access limitation: the search index supplied this official page's text, while direct retrieval returned HTTP 403. [City BDA guidance](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Building-Development-Application).
3. Section 911.02 distinguishes detached and attached single-unit uses, two-unit and three-unit uses, and multi-unit use with four or more dwellings in one building. Attached single-unit use includes separate-lot and wall relationships. Section 911.04.A.69A adds lot-width conditions in R1D districts. These definitions support separate form, unit-count and use questions; they do not establish a project's approval. Full dependencies and effective-date review remain outstanding. [City primary uses code](https://ecode360.com/45476515).
4. The occupancy-only page includes certifying a new use or occupancy and temporary use of an existing structure. Changing a use is therefore an independent project dimension, even where the user describes little construction. [City occupancy-only guidance](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/Permitting/Occupancy-Only-Permit).
5. GOV.UK recommends initially asking one question per page, explaining why it is needed, accepting unknown where valid, retaining back navigation and avoiding repeated data entry. Its check-answers pattern provides an editable review before confirmation. [Question pages](https://design-system.service.gov.uk/patterns/question-pages/) and [Check answers](https://design-system.service.gov.uk/patterns/check-answers/).
6. USWDS recommends progressively revealing small, meaningful groups of questions, starting with easier questions, showing progress and helping users recover from input mistakes. [USWDS progress easily](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/).

All sources above were consulted September 26, 2026. The following intake is a design recommendation inferred from those sources and the existing rule contract, not the City's official application or a validated permit decision tree.

## Keep these concepts separate

| Concept | Example representation | What it does not establish |
| --- | --- | --- |
| Physical site state | Building present, partly removed, apparently empty, unknown | Assessment classification or legal vacancy |
| Building form | Detached, shares a wall, other, unknown | Number of units, zoning use, ownership |
| Observed existing use | Housing, housing plus another use, nonresidential, unknown | Lawful existing use |
| Lawful existing use evidence | Unverified, records located but interpretation pending, City confirmation referenced | Automatically confirmed by a checkbox or completed permit |
| Proposed use | Housing only, mixed use, nonresidential, undecided | A right to establish that use |
| Tenure or operating plan | Owner occupation, rental, sale, undecided | Attached/detached form or zoning permission |
| Work activities | Repair, addition, interior conversion, partial removal/rebuild, demolition, new building, site work, unknown | One exclusive legal or permit classification |
| Unit count | Existing and proposed nonnegative whole numbers or unknown | Bedrooms, households, legal occupancy or authorized units |

For this MVP, collect only tenure needed for the next-step brief, optionally. Do not use it to change zoning findings or invent rental economics. Defer ownership names, tenant details and private document uploads.

## Proposed intake: 11 questions maximum

Use three short stages: Property, Project, Review. The table lists question groups; related counts may share one page. Every factual question allows unknown. Preserve unknown separately from zero, no and not applicable.

| Order | Plain-language question | Answers and branching |
| --- | --- | --- |
| 1 | Which property are you exploring? | Confirm Lanark's address, parcel string and City jurisdiction. Show the map and source dates. Another property exits to a clear unsupported-case message; never reuse Lanark findings for it. |
| 2 | What is on the site today? | Building present, partly removed, apparently empty, unknown. Display the assessment/permit conflict alongside the answer. Label the answer a user observation, with an optional observation date. |
| 3 | Does the building stand alone or share a wall? | Detached, shares a wall, other, unknown. Skip as not applicable only for a user-described empty site, while retaining source conflict. Shared wall alone does not establish the code's separate-lot definition. |
| 4 | How is the property used now? | Housing, housing plus another use, nonresidential, unknown. This is observed use, separate from records. Nonresidential and mixed uses trigger unsupported pathway coverage. |
| 5 | How many homes are there now, and how many do you propose? | Two explicitly labelled counts or unknown. Validate finite whole numbers. Changes in count leave the same-use repair branch. Zero is meaningful, not missing. |
| 6 | What would the property be used for after the work? | Housing only, housing plus another use, nonresidential, undecided. Use change can occur without an addition. Unsupported choices still produce an evidence and questions brief. |
| 7 | What work are you considering? | Checkboxes: repair/remodel, addition, interior conversion, partial demolition/rebuild, full demolition, new building, site work, other/unsure. Multiple activities allowed. Never collapse mixed repair/demolition into repair. Only implemented branches receive rule findings. |
| 8 | Would the work change the building's size or height? | Footprint, height, both, neither, unknown. Optional dimensions only if known, with units and provenance. Do not demand that a novice judge "nonconformity". Such changes create review questions, not an automatic variance claim. |
| 9 | Would you disturb the ground? | Yes, no, unknown. Examples: excavation, grading or new foundations. Show the mapped slope flag for every answer. Unknown/no never clears it. |
| 10 | What records or professional confirmation do you already have? | None/unknown, occupancy/use records, plans or survey, City correspondence. Capture a short safe reference only. Treat all as pending verification; show known dimensions/nonconformities only as documented assumptions, without making the user adjudicate lawfulness. |
| 11 | How do you expect the homes to be used? (optional) | Live there, rent, sell, undecided. Brief context only in MVP; skip until an actual downstream use exists. |

After these questions, show a review page with Change links and distinct columns for public records, user observations and scenario assumptions. "Review complete" means the user checked their answers, not that the evidence is verified. The primary action is "Show checks and next steps". Creating proposal B copies the shared baseline and A's project answers; the user edits only changes.

The current model lacks observed/proposed use, multiple activities, dimensions and evidence records. These are proposed additions. Do not implement the new questions by silently translating them into the existing lawfulUse yes/no field. If retaining the old engine temporarily, expose only its precise supported inputs and route richer unsupported combinations to an explicit coverage result.

## What actually runs in the background

Code inventory from src/domain.ts, src/App.tsx and src/assessment.ts as inspected September 26, 2026:

| Operation | Current behavior | Honest future extension |
| --- | --- | --- |
| Parcel display | Translates stored EPSG:2272 coordinates into an SVG viewport with north up | Retain CRS and provenance; this is drawing geometry, not deriving a buildable envelope |
| Lot area | Displays the stored assessment value, 1,657 sq ft | Compute polygon area only with explicit CRS/units and preserve discrepancies with assessment or survey |
| Zoning/slope intersection | Displays dated research findings already encoded in the app | Add validated spatial adapters; intersection alone is not an overlap percentage or legal trigger |
| Unit checks | Validates finite nonnegative integers, compares counts, restricts conditional pathway to one existing/proposed dwelling | Display proposed minus existing units when both known; keep any change separate from legal capacity |
| Rule branch | Checks supplied scope, form, lawful-use assumption, disturbance and nonconformity assumption | Versioned predicates with evidence and unknown states; dimensions and full dependencies need additional implementation |
| Scenario comparison | Compares findings and assumptions and exports differences | Preserve stable IDs and distinguish changed inputs from changed evidence |
| Live assessment | Fetches exact parcel with limited fields; keeps observation separate from dated comparison | Show request status and retrieval date; failed requests never clear findings |
| Costs and feasibility | No budget, funding gap, return, yield or feasibility score is calculated | Only calculate from explicit quantities, unit costs, acquisition/site costs, soft costs, contingency, carrying period, financing, revenue and funding assumptions with dates/ranges |

Do not call the present engine "background calculations" without specifying which arithmetic or checks run. Better status copy: "Checking your assumptions against the supported rules" and "Preparing unresolved questions". A map overlap, a rule predicate and a financial estimate are different outputs with different evidence needs.

## MVP boundary and next implementation decisions

1. MVP: one Lanark baseline, user-confirmed assumptions, repair versus expansion of the one-dwelling scenario, explicit reconstruction review, preserved conflicts, a useful brief, no scores. Unknown inputs should still yield useful missing-evidence actions.
2. Optional broader intake: accept unsupported use/work choices only with a visible coverage message, and export them unchanged. Do not allow these selections to inherit the supported repair wording. Show the applicable source and next professional question.
3. Later: add independently validated use types and activity combinations, dimensional rules, authoritative hazard queries and plan measurements. Keep a tested coverage registry by jurisdiction, use, activity and rule version.
4. Later financial layer: ask budget questions only when the app can calculate and explain a named quantity. Never estimate construction cost from old permit value or calculate a funding gap from assessment value and an asking price.
5. Validation before building: test this walkthrough with a novice and a practitioner using the same conflicting Lanark case. Observe whether they distinguish an observation, an assumption and a verified fact. Do not claim reduced time or improved decision quality without that evidence.

A changed answer must recompute dependent checks and mark dependent assumptions for review, while retaining prior values for correction. Source conflicts remain visible on intake, results and exports. An unavailable service remains unavailable, with the dated snapshot named. No outreach, submission, deployment or approval determination is included in this recommendation.
