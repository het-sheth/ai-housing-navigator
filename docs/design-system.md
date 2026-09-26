# Pittsburgh Housing Navigator design system

Version 0.1, September 26, 2026. This document records implemented visual foundations and a proposed guided product flow. The user requested a less text-heavy experience, visible inputs, a Steelers reference, Rescope-inspired design, broader property/work intake and a live-data/deployment path. Practitioner validation remains outstanding.

## Open it

The code-backed specimen and interactive walkthrough sample are at `http://127.0.0.1:5173/design-system`. The working single-parcel comparison is at `/`.

| Artifact | Status |
| --- | --- |
| Black/gold workspace, visible proposal controls, comparison/evidence views | Implemented |
| Shared tokens, Button, ChoiceGroup, EvidenceBadge, StepIndicator | Implemented in `src/design-system/` |
| Four-screen intake interaction sample | Implemented as a design preview, no screening or live requests |
| Complete guided intake and broader coverage registry | Specified below, not wired to the evaluator |
| Live assessment refresh | Working from tested localhost origin; independent observation |
| Live parcel/PLI/zoning/slope adapters, hosted API and deployment | Proposed, not implemented |

## Product experience

The first-time experience should ask focused questions. The parcel workspace becomes the editing and comparison surface after intake. Ask for the shared property baseline once, describe A, review it, duplicate it to B and change the proposed scope. Do not ask users to invent two independent versions of an existing property.

```text
Confirm parcel + jurisdiction
          |
Observed condition / current use / form / units
          |
Proposed use / multiple activities / physical changes
          |
Evidence and assumptions review
          |
Coverage check -> unsupported combinations get questions, no verdict
          |
Proposal A -> duplicate to B -> edit changes
          |
Compare conditional checks -> take the next-action brief
```

The walkthrough sample has four screens: Site, Intended use, Work, Review. It demonstrates the interaction components and retaining answers. It intentionally does not collect every field or call the current rule engine. The full question specification and City source rationale are in [guided intake and rule scope](research/guided-intake-and-rule-scope.md).

### Distinct property concepts

Do not offer a single dropdown mixing single-family, rental, vacant, mixed-use and renovation. These are different concepts:

| Input | Plain-language choices | Boundary |
| --- | --- | --- |
| Site condition | Building present, partly removed, appears empty, unknown | User observation, not assessment or legal-use authority |
| Building form | Stands alone, shares a wall, other, unknown | Detached/attached needs source and City interpretation |
| Existing use | Housing, housing with another use, nonresidential, unknown | Separate from lawful-use evidence |
| Existing/proposed homes | Whole-number counts or unknown | Zero is a value; no invented capacity |
| Proposed use | Housing, mixed use, nonresidential, undecided | A requested use is not an entitlement |
| Work | Repair, addition, conversion, partial rebuild, demolition, new construction, site work, unsure | Multi-select; activities can overlap |
| Tenure | Live there, rent, sell, undecided | Optional brief context; no current financial rule depends on it |

The current evaluator supports a narrow one-dwelling comparison with repair/expansion branches and explicit reconstruction review. A wider selector must be paired with a coverage result. New construction, mixed/nonresidential use or a changed count cannot inherit a repair finding. Unknowns return useful evidence requests.

### Question and navigation contract

1. Give each screen a meaningful question or small related group, not a marketing slogan.
2. Show progress, a separate Back action and one Continue action. Preserve answers when going back. A production wizard must also preserve sensible browser Back behavior.
3. Include unknown where it is a legitimate response. Do not silently map blank to zero, unknown to no, or an observation to a legal fact.
4. Explain unfamiliar terms in one sentence. Do not ask a novice to determine legal nonconformity. Ask observable changes and gather evidence references instead.
5. Show an editable review before evaluating. Mark public records, observations and assumptions separately. A user confirmation does not verify source accuracy.
6. Clone the baseline and A's project answers to create B. Keep a visible changes list and stable finding IDs.
7. Changing an answer recomputes dependent checks and flags dependent assumptions. The real source conflict remains.
8. Unsupported input stays in the brief, with an explicit coverage message and human next action.

These rules are design recommendations informed by [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/), [check answers](https://design-system.service.gov.uk/patterns/check-answers/) and the [USWDS step indicator](https://designsystem.digital.gov/components/step-indicator/), consulted September 26, 2026. They are not a copy of the City's application or evidence of validated usability.

## Visual foundations

### Identity

Use Pittsburgh/Steelers black and gold as a controlled identity, not a sports score metaphor. Black is navigation and the stable frame. Gold marks the active choice and primary action. A small independent 412 steelmark-style symbol acknowledges the user's explicit Steelers request. It does not imply team affiliation or endorsement. No green/red feasibility scoreboard.

[Rescope's public parcel product screen](https://www.rescope.co/) was visually inspected September 26. Borrow the hierarchy: parcel context, focused working panel, secondary evidence. Do not copy the screenshot or its claims into the app. The current drawing uses genuine parcel coordinates; no satellite basemap, building footprint, zoning envelope or slope coverage is fabricated.

The rejected bridge/marketing-card layout is superseded by the workbench. Remove ornamental slogans, numbered labels that do not encode a sequence, repeated identical cards and unnecessary hero sections. This follows the inspected [frontend-design guidance](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), applied as guidance rather than a locally installed plugin.

### Tokens

Canonical implementation: `src/design-system/tokens.css`. Components and the existing app consume these CSS variables.

| Role | Token / value | Usage |
| --- | --- | --- |
| Identity | `--color-black` / `#000000` | Main navigation |
| Primary accent | `--color-gold` / `#FFB612` | Active controls, primary action, boundary highlight |
| Page | `--color-white` / `#FFFFFF` | Reading and input surface |
| Secondary surface | `--color-surface` / `#F1F2F2` | Context, neutral grouping |
| Main text | `--color-text` / `#202224` | Headings and content |
| Secondary text | `--color-text-secondary` / `#53616B` | Hints and metadata |
| Control boundary | `--color-field-border` / `#87949E` | Visible inputs against white |
| Focus | `--color-focus` / `#705000` | 3px outline with 3px offset |

Normal text pairs are tested to at least 4.5:1; the field boundary is tested to at least 3:1 against white. Gold is used with black text, not white text. These tests cover declared token pairs, not a complete accessibility conformance audit. Source: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Typography: locally bundled IBM Plex Sans at 400/500/600, IBM Plex Mono 400 only for identifiers and measured values. Core body/control text is 14px, hints 12px, questions 26px. Existing compact metadata may be smaller; do not use tiny text for required instructions. Fonts are bundled for offline rendering; retain their licenses in dependencies.

Spacing: 4, 8, 12, 16, 24 and 32px. Shared controls have a 44px minimum height. Control radius is 4px; large panel radius 8px. Use thin dividers to group inputs and evidence, not a card around every sentence. Responsive workspace stacks below 900px and keeps the parcel context short enough to reach inputs quickly.

### Components

| Component | Implemented contract | Use |
| --- | --- | --- |
| `Button` | Primary, secondary, quiet, disabled, native button attributes | One primary action per question; labels describe the action |
| `ChoiceGroup` | Fieldset/legend, optional described hint, native radio inputs, controlled value | Single-choice property or use question |
| Checkbox choice | Native checkbox, visible label, independent selection | Multiple work activities; no repair-only collapse |
| `StepIndicator` | Ordered list, current step, completed/upcoming text | Progress only; navigation is separate |
| `EvidenceBadge` | Live, snapshot, assumption, unknown, conflict, unavailable | Source state, not feasibility status |
| Finding disclosure | Summary, conditional state, reason, missing input, next action, source link | Concise result with detail on demand |
| Review list | Answer and specific Change action | Return to a previous question without losing values |

Native radio and checkbox semantics are deliberate. One choice and multiple overlapping activities are different controls. References: [GOV.UK radios](https://design-system.service.gov.uk/components/radios/) and [checkboxes](https://design-system.service.gov.uk/components/checkboxes/).

## Evidence, loading and result language

| State | User-facing meaning | Required behavior |
| --- | --- | --- |
| Live observation | A named provider returned a validated record at a recorded time | Show source vintage separately; freshness is not authority |
| Dated snapshot | Evidence retrieved on a stated date | Never disguise as a live lookup |
| Your assumption | User observation or hypothetical proposal | Never overwrite verified source records |
| Not checked | No applicable check was completed | Do not show green, zero risk or absence |
| Sources conflict | Sources describe different things or disagree | Preserve both and request reconciliation |
| Source unavailable | Request failed, timed out or could not be validated | Explain retained evidence, permit retry; never treat as zero results |
| Outside coverage | Selected property/use/activity lacks an implemented rule trace | Preserve input and export questions; no synthetic verdict |

Separate input validation, source retrieval, geometric computations, code predicates and financial estimates. Use specific progress labels such as "Fetching parcel boundary" or "Checking supported rules". Do not simulate a scan or claim an AI analysis when none ran.

## Calculation and connector design

Currently the app validates unit counts, compares rule states and transforms known coordinates for display. Lot area is a source field. Zoning/slope intersections are dated research findings. No cost model, buildable envelope, slope percentage, entitlement capacity or numeric ease score is calculated.

Future deterministic calculations may include unit-count delta, polygon area and source disagreement, overlap area after validated geometry, or financial totals from explicit practitioner assumptions. Each output needs units, formula/version, inputs and provenance. A model can help structure unstructured intent only after an approved server-side integration; it must not own joins, math or legal authority.

See [live data and deployment](research/live-data-and-deployment.md) for the five connector readiness states and official hosting references. Recommended incremental architecture:

```text
Guided UI -> structured observations and proposals
          -> same-origin evidence API
                 -> WPRDC assessment / parcel / PLI
                 -> City zoning / slope GIS
          -> validated evidence + dates + errors per source
          -> geometry and versioned rule checks
          -> comparison and export
```

No remote or hosting account has been created. A preview can host Vite assets; later Node functions can handle the bounded connectors and any model call. Browser code must never receive a provider secret. Deployment-origin source access and dataset terms must be checked before publishing the bundled evidence.

## Comparison must show a practical difference

The default repair/expansion pair is isolated to one scope input. It currently yields one explanation change, zero review-status changes and zero next-action changes. The UI and export show these separately and explicitly state that the next action is the same. Never count explanation wording as a consequential decision.

A separate disturbance/no-disturbance preset demonstrates a changed diligence task while preserving the same property conflict and review state. It is not a different approval or financial result. See [comparison value test](research/comparison-value-test.md) for the tested pairs and the limits of the differentiation hypothesis. The weekend scope excludes massing, TestFit-style design and pro formas. No uniqueness claim is made.

## Implementation order

1. Use this question preview to settle the intake interaction with Het. It is an interaction sample, not a completed intake engine.
2. Add a typed shared baseline and multiple-activity proposal model with a tested coverage registry. Keep the old evaluator behind an explicit narrow adapter until each new branch is reviewed.
3. Integrate the walkthrough and review page; duplicate A to B rather than asking for the baseline twice.
4. Add live PLI and parcel adapters, then tested full-polygon zoning/slope adapters. Keep per-source status and dated fallback explicit.
5. Configure a separately authorized hosted preview and verify the complete flow at that origin. No deployment occurred in this session.

## Validation

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `node scripts/smoke.mjs` and `node scripts/design-system-smoke.mjs`. Smoke tests require the dev server and local Chromium. Test not only the happy path but unknown values, multiple activities, unsupported coverage, backwards editing, source failure, source-link navigation, print from a non-evidence tab, actual download and mobile overflow. Record exact outcomes in `docs/current.md`.
