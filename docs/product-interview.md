# Product interview

September 26, 2026. In progress; not an approved implementation specification.

## Method

The user requested Matt Pocock's grill-with-docs after an initial brainstorming discussion. Official instructions were read from mattpocock/skills: skills/engineering/grill-with-docs/SKILL.md, skills/productivity/grilling/SKILL.md, and skills/engineering/domain-modeling/SKILL.md. Use rounds of independent decisions, record resolved vocabulary in ../CONTEXT.md, and preserve accepted decisions here. Architecture and implementation remain to be designed.

## Accepted product direction

- Prioritize small/mid-size developers and housing nonprofits/CDC. Ask role during onboarding using the track's four personas: those two, municipal planner, and policy analyst, plus Other / exploring. The user accepted aligning onboarding to the track.
- Decision priority: whether to pursue a site, then which proposal to pursue, then how to prepare for review.
- Complete one site's workflow first. Design saved projects to accommodate additional sites later; defer shortlist comparison.
- V1 starts with an address or parcel ID and a natural-language proposal description. V2 adds packet uploads and extraction.
- Allow exploration before login. Sign in to save and revisit projects.
- Use a guided form with conversational help: AI suggests editable structured inputs and clarifying questions; the user confirms them.
- The user declined the optional visual companion for now.
- Build a reusable dynamic workflow. Lanark is an evidence/conflict regression case, not the intended input boundary. Shur Save is a candidate historical case pending primary-record verification.
- Preserve source dates, conflicts, unknowns, and separate explanation/status/action changes. Do not claim comparison is unique or build a full pro forma engine this weekend.

## Proposed or unresolved

- The user rejected City-only coverage and requested the full geography described by the track/wiki. The checked Track 1 brief and participant packet identify Pittsburgh and Allegheny County, not a specified multi-county region. Exact geographic interpretation needs confirmation; municipal rules must remain distinct.
- The user requires all housing/work possibilities from the start, superseding the recommendation to restrict v1 to repair and expansion. Complete automated evaluation across all combinations is not established. Handling unknown or unsupported checks while retaining the whole proposal remains to be agreed.
- The user accepted specific next actions and requires saved progress: complete a task and resume the workflow. Completing a task must be distinguished from verifying its evidence or resolving its finding; that behavior is proposed, not yet accepted.
- Jev is a classification candidate, not a selected provider. Its official docs support atomic typed decisions and warn about arithmetic, multi-hop reasoning and adversarial inputs. Jurisdiction must come from authoritative records/spatial resolution, not model guesses.
- Proposed feasibility pillars: site control/title; land-use permission; physical/building conditions; environment/hazards; infrastructure/access; economics/funding; approvals/delivery. These are a product taxonomy awaiting agreement, not an official fixed track rubric. Weather and documented policy/community process belong under relevant pillars.
- Map layout, 3D scope, Development Ease presentation, live connector selection, rule versioning, model/provider, API boundaries, storage, retention, authentication provider, deployment and operating budget remain open.

## Research follow-up

The user requested Sol research on pillars and a Luna audit of all supplied source material for geography. Results are in research/pillars-and-geography.md. The official minimum is one Pittsburgh OR Allegheny County use case, not countywide or multi-county coverage. The user's broader product ambition remains open for explicit scope agreement. Research recommends eight pillars, separating market/affordability and making operating viability explicit; this is not a prescribed official rubric.

LangGraph and graph engineering were investigated as requested. See research/workflow-graph-options.md: distinguish Jev classification, evidence/dependency relationships, executable workflow and persistent project records. LangGraph is an option for checkpointed model/source workflows, not a selected dependency or a cure for missing evidence and rules.

## Implementation baseline

The React/TypeScript/Vite app has one bounded live assessment refresh, dated Lanark evidence, deterministic comparisons and brief export. Runtime AI, generic parcel lookup, saved projects and packet extraction are not implemented. The guided walkthrough is a separate design-system sample. Vercel CLI authentication was verified as het-sheth; the housing app has not been deployed. See current.md for implementation details and outstanding reuse checks.
