# Focused publication plan

The user requested small, independently reviewable PRs. Existing app PR #3 remains the published base checkpoint. New backend work is split into dependent branches; walkthrough corrections are a sibling branch. No merge or deployment is included.

| Review unit | Base | Scope |
| --- | --- | --- |
| [Walkthrough recovery #5](https://github.com/het-sheth/ai-housing-navigator/pull/5) | Existing walkthrough checkpoint | Saved-stage resume, parcel correction, honest result states and browser regressions |
| [Source catalog #4](https://github.com/het-sheth/ai-housing-navigator/pull/4) | Existing walkthrough checkpoint | GET metadata registry and route tests |
| [Parcel source queries #6](https://github.com/het-sheth/ai-housing-navigator/pull/6) | [Source catalog #4](https://github.com/het-sheth/ai-housing-navigator/pull/4) | POST contract, validation, core GIS and WPRDC retrieval |
| [Screening observations #7](https://github.com/het-sheth/ai-housing-navigator/pull/7) | [Parcel source queries #6](https://github.com/het-sheth/ai-housing-navigator/pull/6) | Supplementary permit/hazard/overlay observations and client validation |
| [Regional context #8](https://github.com/het-sheth/ai-housing-navigator/pull/8) | Prior backend branch | Regional, financial and historical aggregate retrieval with provenance |
| [Spatial and reference sources #9](https://github.com/het-sheth/ai-housing-navigator/pull/9) | [Regional context #8](https://github.com/het-sheth/ai-housing-navigator/pull/8) | Bounded point observations and document metadata |
| [Transit feed #10](https://github.com/het-sheth/ai-housing-navigator/pull/10) | Spatial sources | Bounded ZIP reads and PRT routes/stops |
| [School locations #11](https://github.com/het-sheth/ai-housing-navigator/pull/11) | [Transit feed #10](https://github.com/het-sheth/ai-housing-navigator/pull/10) | NCES institutional locations with explicit sample limits |
| Architecture and handoff | Completed backend stack | Flow diagram, actual source coverage, remaining work and current status |
| [Wiki financial amendment #5](https://github.com/het-sheth/ai-housing-hackathon-wiki/pull/5) | Existing wiki design PR | Previously recorded finance and visual decisions |
| [Wiki scoring and ADR currency #6](https://github.com/het-sheth/ai-housing-hackathon-wiki/pull/6) | [Wiki financial amendment #5](https://github.com/het-sheth/ai-housing-hackathon-wiki/pull/5) | Full-evidence scoring gate and factual implementation/deployment status |

Each PR states its exact base and validation. Review its own diff rather than comparing every stacked branch to main. After a parent merges, verify the next PR base and resulting diff before merging it. Preserve the original dirty checkout until the split branches have been reconciled.

The all-source objective remains incomplete: a source registry, a successful HTTP envelope and document metadata are not equivalent to underlying dataset integration. See [source outcomes](source-integration-status.md).

## Combined verification

A temporary tree combining walkthrough `046ac96` and backend `e2d91aa` passed 195 tests, typecheck, lint and build. This verification did not publish a merge. The walkthrough also passed its isolated guided, live-property and screening browser checks with AI blocked. Wiki branches passed 79-concept validation and 40 tests.
