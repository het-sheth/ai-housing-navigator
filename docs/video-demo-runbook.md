# Video rehearsal and judging assessment

September 27, 2026. Prepared from the event rules and recorded SME guidance in the project wiki. The submission requires a public 3-5 minute video that identifies working and mocked portions. Six criteria have no published numeric weights. This assessment is our judgment, not an organizer score.

## Current standing

| Criterion | Readiness out of 5 | Evidence and gap |
|---|---:|---|
| Problem Value | 4 | Real early property diligence problem; no validated customer demand or measured time saving. |
| User Fit and Usability | 2.5 | Guided flow and guest access work, but user testing exposed confusing inputs, search promises and duplicated comparison. The current branch addresses these, pending review. |
| Technical Execution | 4 | Real parcel joins, map, public checks, account ownership and persistence have live evidence. Broad feasibility is not implemented. |
| Data and AI Integrity | 4 | Sources, dates, unknowns and narrow metric scopes are explicit. AI activity suggestions are validated. Consistent production AI classification quality remains unproven. |
| Actionability | 3 | Exportable next-action brief and mapped flags are useful; several actions remain generic and no practitioner outcome has been demonstrated. |
| Continuation Potential | 3 | A clear path exists to maintain local rule coverage and validate practitioner workflows. No exclusive data, adoption or outcome-feedback advantage exists yet. |

Do not average these into an official weighted result. The Track 1 brief requests an explainable Development Ease Score; our supported individual screens do not satisfy a complete aggregate feasibility engine. A detailed financial model is not explicitly required by the packet, but financial feasibility remains unassessed.

## Moat and levers

There is no established moat yet. Public maps, a generic AI interface and citations are replicable. The wiki's dated competitor research documents substantial overlap, not competitor incapability.

1. Evidence reliability: accurate parcel joins, rule versions, conflicts and failure recovery. This is a present implementation strength.
2. Proposal sensitivity: show which actual requirement or next action changes when scope changes. This is only narrowly supported today, and is the highest-value product lever.
3. Local rule depth: maintained, reviewed Pittsburgh rules and counterexamples. This could become defensible expertise, but coverage is currently narrow.
4. Workflow ownership: useful saved briefs, review history and practitioner handoffs. Persistence works; demonstrated adoption and outcomes do not yet exist.
5. Outcome feedback: learn which follow-up resolves uncertainty, with consent and quality controls. This is a future data advantage, not an existing asset.
6. Distribution: trusted CDC, nonprofit, planner and small-developer relationships. No pilot or endorsement is claimed.

The recorded SME advice emphasized zoning and financial feasibility, then clarified that depth in one dimension may outperform shallow breadth. It is advice, not a new judging rule. For this deadline, prioritize a coherent single-property story over six-story site selection or more decorative features.

## Tested example

Property: 2003 Mountford Ave. Exact parcel: `0046R00029000000`.

Use this hypothetical proposal text:

> Repair and remodel the existing home, with an interior conversion. Keep the total at one home and do not disturb the ground.

Select Repair/remodel and Interior conversion. Set proposed total homes to 1 and ground disturbance to No. Leave building type Unknown unless the presenter has independently verified the proposed form. These are scenario assumptions, not assertions about lawful existing use or ownership.

Expected observed story: real County parcel boundary; mapped R1D-L district; mapped slope flag despite no planned ground disturbance; FEMA whole-parcel minimal-hazard map screen scored 2/2 only for that metric; other checks remain unassessed. The next action is to review the mapped slope and work location with a surveyor and the City. No overall score or permission verdict is promised.

Rehearsal command:

```sh
APP_ORIGIN=http://127.0.0.1:5198 node scripts/video-demo-smoke.mjs
```

The script uses actual public sources, blocks AI, verifies the exact parcel, seven checks, slope and FEMA outputs, exports a brief and verifies local draft resume plus map hydration. Evidence and screenshots go to `/tmp/housing-video-rehearsal`. It fails if live evidence changes; it never substitutes a fixture. This branch rehearsal does not test cloud saving or paid AI. Prior guest/cloud and staged AI checks have separate evidence in the canonical handoff.

## Four-minute recording outline

1. 0:00-0:25: Name the user and decision. A small housing-project lead needs to know what to verify before spending on design. Show Home briefly, then Assess.
2. 0:25-1:05: Search Mountford, confirm the exact parcel and show the live boundary and County source. Explain that an assessment record is not proof of lawful use or availability.
3. 1:05-1:45: Enter the proposal above. Show check-relevant inputs and their purpose. If demonstrating AI, use the existing suggestion button, review the actual result and apply it. Do not call a manual or mocked selection an AI completion. The rehearsed fallback is selecting the two activities manually while honestly stating AI is unavailable or not used in this take.
4. 1:45-2:55: Run checks. Lead with the mapped slope flag, then show the scoped FEMA 2/2 and its source. Explicitly distinguish that number from overall feasibility. Show one meaningful unknown, not all fourteen supplementary observations.
5. 2:55-3:35: Show the next action and export the brief. Reload to demonstrate the local draft and boundary returning. Rerun findings explicitly if needed: walkthrough snapshots retain draft inputs, not transient screening results.
6. 3:35-4:00: Explain the implementation boundary and continuation plan: validated AI intake, deterministic bounded source checks, human review, deeper rules next. No fabricated approval odds, financial verdict or full 60-dataset claim.

Do not lead with Explore six-story matching or Compare unless a meaningful, tested difference has been demonstrated. The same parcel does not gain different flood evidence because a proposal changes.

## Recording and release gate

The current fixes are branch-only, not deployed. Record the local branch only if it is identified as the tested build, or release it through a separately authorized PR merge/deployment before showing the public URL. Do not show production while narrating branch-only features.

Before the final take, rerun the smoke at the exact origin to be recorded, confirm the map tiles and source services respond, and keep the exported dated brief plus screenshots as a clearly labeled backup. A prerecorded successful take is suitable for the submission; do not splice mock output into a purported live response. No workflow can guarantee external source availability at recording time.

## Evidence sources

- Project wiki `wiki/event/rules.md`: six judging criteria, submission video duration and disclosure requirements.
- Project wiki `wiki/product/september-26-evidence-update.md`: anonymized SME advice and dated competitor overlap.
- Project wiki `wiki/tracks/comparison.md`: Track 1 scope and detailed-financial-model boundary.
- Project wiki `wiki/product/proposal-comparison.md`: decision-changing comparison hypothesis and demonstration guidance.
- Project wiki `docs/handoffs/current.md`: exact deployment and dated live verification.
- App `docs/assessment-metrics.md`: implemented metric scopes and unknowns.
