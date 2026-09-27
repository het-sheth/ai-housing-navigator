# One-home example through the existing Assess flow

This example exercises the existing product. It is a hypothetical proposal, not a property recommendation, listing or assertion that the site is available.

## Inputs

1. Open Assess a property in a fresh Incognito session.
2. Search exact parcel `0042J00243000000`, Tweed St, Pittsburgh, and confirm the County record and boundary.
3. Describe: "Build one detached home on this parcel, with ground work for the new building."
4. Select New construction, one proposed home, Detached / standalone, and ground disturbance Yes. Site work can also be selected. Leave other unknown inputs unknown.
5. Review the inputs and run property checks.

## Evidence to show

The live County assessment queried September 27, 2026 returned one exact record: 3,000 square feet of land, RESIDENTIAL classification, VACANT LAND recorded use, file date September 1, 2026. This does not establish physical vacancy, parcel control or availability. The previous deployed rehearsal found whole-parcel R1D-H zoning and a FEMA minimal-hazard X zone; both must be rechecked before recording.

The new branch adds the published R1D-H base minimum of 1,200 square feet and baseline setback/height requirements. Show the arithmetic comparison alongside its scope: recorded land area exceeds the base minimum, but surveyed dimensions, exceptions and design compliance are unverified. Show the next evidence: survey/site plan, plat and recording history, current City application requirements and confirmed utility provider/availability.

The existing individual zoning-use and flood screens may each show 2/2 when their exact rules and live evidence support them. No aggregate score is produced. Other zoning compliance, permit determination, physical site conditions, utility capacity and financial feasibility remain unassessed.

## Rehearsal

`APP_ORIGIN=http://127.0.0.1:5202 node scripts/one-home-live-smoke.mjs`

The test writes its actual origin, timestamp, live findings, screenshots, exported brief and draft-recovery evidence to `/tmp/housing-one-home-rehearsal`. It blocks AI and does not test cloud saving. Treat a failed live-source assertion as evidence to investigate, not a reason to substitute mock data.

PR #25 is merged and deployed. The public origin https://ai-housing-navigator.vercel.app was verified using this example on September 27, 2026. See the production evidence below.

## Verified branch rehearsal

On September 27 at 21:33:42 UTC, the local branch at `http://127.0.0.1:5202` passed the complete browser rehearsal with live public APIs: exact parcel and boundary, R1D-H, 3,000 recorded square feet against the 1,200 base minimum, existing zoning-use and flood scores, 14 supplementary observations, export and local resume. Desktop and 390px mobile screenshots were captured; there were zero page errors. AI was blocked and cloud saving was not exercised. Full verification passed 307 tests, typecheck, lint and build. The existing Three.js chunk warning remains.

## Verified production rehearsal

On September 27 at 21:43:11 UTC, `https://ai-housing-navigator.vercel.app` passed the same real-source rehearsal, including the new evidence, desktop/mobile, export and local resume, with zero page errors. Source commit `8e5ab74`, deployment `dpl_EqhPTz2RqEGHxtxwx5NXqrbJBPdR`. Evidence is `/tmp/housing-one-home-production/evidence.json`; exported brief and screenshots are beside it. AI was blocked and cloud saving was not retested. A separate production Compare regression used synthetic property/screening responses and passed with zero AI requests or page errors.
