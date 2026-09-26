# Live property slice plan

1. Add a bounded server adapter for exact parcel IDs and address candidates from the public WPRDC assessment table. Never auto-select; disclose truncation, source errors and retrieval time.
2. Re-fetch the selected ID from WPRDC assessment and the County's official parcel map service. Require exact string matches and request County GeoJSON in WGS84. Keep boundary and assessment failures separate. Report assessment file date and retrieval time separately; leave the boundary dataset effective date unknown.
3. Keep the original guided form and right-panel map. Search and explicit parcel confirmation happen in the existing property step. Draw only the confirmed live boundary; label the saved Lanark shape as historical. Empty new projects cannot inherit example data.
4. Preserve current and archived device drafts. Offer an explicit start-new action and restore path. A returning user sees a resumed-draft label. Keep the historical comparison route clearly labeled.
5. Add tests for ambiguous address, exact ID, leading zeros, missing/error states, invalid returned geometry and draft preservation. Run the four repository checks, then browser desktop/mobile flows. No AI request, infrastructure or deployment.

Completed: the four required checks and browser flows passed. The user subsequently authorized merging the reviewed checkpoint through a PR into main and stopping feature work.
