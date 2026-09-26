# Does the Lanark comparison change a decision?

September 26, 2026. Bounded test of the implemented rule engine, not a practitioner validation or permission determination.

## Result

The default pair is identical in every evaluated input except repair versus expansion. Names differ only as display labels. Both keep one existing and proposed home, unknown lawful use, unknown building form, unknown disturbance and unknown nonconformity.

That pair changes the rule explanation only. It does not change the review status, missing-evidence requirement or next action. The UI and Markdown brief now say so explicitly. A wording difference must not be presented as a consequential project decision.

| Tested pair | Explanation | Review status | Next action | Interpretation |
| --- | --- | --- | --- | --- |
| Default repair / expansion | 1 change | 0 changes | 0 changes | Different code question; same immediate evidence and City review |
| Repair / reconstruction, same unknown baseline | 1 change | 0 changes | 0 changes | Separate scope classification, no different implemented next step |
| Favorable assumed repair / expansion | 1 change | 1 change | 0 changes | Conditional check versus review required, dependent on unverified assumptions |
| Repair, no disturbance / repair, disturbance | 1 change | 0 changes | 1 change | Adds disturbance-plan review, a modest preparation difference |
| Unknown / supplied existing count | Input explanation and missing information change | Input status changes | Obtain count versus verify count | Completeness improvement, not an improved feasibility outcome |

In the favorable-assumption test both scenarios assume one dwelling, lawful use, detached form, no disturbance and no increase in nonconformity. These remain user assumptions. They cannot resolve the real assessment/permit conflict. A conditional-check label is not approval or a lesser confirmed permitting burden.

The disturbance contrast uses the same repair proposal with one assumed existing/proposed home and unknown lawful use, form and nonconformity. Only disturbance changes from no to yes. The slope intersection remains review required. The resulting extra request is for disturbance plans, alongside survey and site review. No overlap percentage, surveyed slope or automatic variance/review trigger is calculated.

## Product implication

The current default has not demonstrated that a user would choose a different proposal or avoid a specific diligence expense. Its value is explaining why different rule questions arise and preserving evidence. That may be useful, but comparison itself is not a uniqueness claim and has not been practitioner-validated.

The alternative disturbance pair is exposed as a separate example, not substituted silently for the default. It shows the practical task that changes and states that the immediate record-reconciliation need persists. Treat it as a candidate for testing with a practitioner, not a proven preference recommendation.

Do not alter action text merely to manufacture a difference. Review full rule dependencies and ask what real artifact, investigation or authority changes because of scope. If no materially different action emerges, the product should emphasize an evidence/next-action brief rather than claiming proposal selection value.

## Implementation

`compareFindings()` joins stable finding IDs and exposes `explanationChanged`, `reviewStatusChanged`, and `nextActionChanged`. Explanation compares reason/missing-input content, review status compares the state, and next action compares the action text. Counts are kept separate in the UI and export. This is a test of currently authored outputs; a future rule registry should assign stable action identifiers before wording edits are allowed to imply action changes.

Regression tests assert the isolated default, explicitly equal actions, expanded/reconstruction counterexamples and the narrow disturbance contrast. All scenarios retain source dates, the VACANT LAND versus six-permit conflict, unassessed finances and unresolved professional evidence. No TestFit-style massing, pro forma, market uniqueness or approval claims were added.
