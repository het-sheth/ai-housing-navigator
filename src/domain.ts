export type Proposal = {
  name: string;
  existingUnits: number | null;
  proposedUnits: number | null;
  lawfulUse: 'unknown' | 'yes' | 'no';
  scope: 'repair' | 'expansion' | 'reconstruction';
  disturbance: 'unknown' | 'yes' | 'no';
  form: 'unknown' | 'attached' | 'detached';
  nonconformity: 'unknown' | 'same' | 'increased';
};

export type Finding = {
  id: string;
  title: string;
  state: string;
  reason: string;
  missing: string;
  action: string;
  sourceIds: string[];
};

export const parcel = {
  id: '0023C00208000000',
  address: '1623 LANARK ST, PITTSBURGH, PA 15214',
  jurisdiction: 'City of Pittsburgh',
  district: 'R1D-H (mapped)',
  lotArea: 1657,
  ring: [
    [1341254.3753421158, 418886.6913294047],
    [1341249.5004565567, 418907.40823070705],
    [1341162.750083685, 418888.9993906319],
    [1341163.2502709627, 418885.87474767864],
    [1341172.750691548, 418867.15810005367],
    [1341254.3753421158, 418886.6913294047],
  ],
};

function datastoreUrl(resourceId: string, filters: Record<string, string>, fields: string[]): string {
  const query = new URLSearchParams({ resource_id: resourceId, filters: JSON.stringify(filters), fields: fields.join(','), limit: '100' });
  return `https://data.wprdc.org/api/3/action/datastore_search?${query.toString()}`;
}

export const sources: { id: string; title: string; url: string; asOf: string; retrievedAt: string; terms: string }[] = [
  { id: 'assessment', title: 'Allegheny County assessment snapshot', url: datastoreUrl('property_assessments_table', { PROPERTYHOUSENUM: '1623', PROPERTYADDRESS: 'LANARK ST', PROPERTYCITY: 'PITTSBURGH' }, ['PARID', 'PROPERTYHOUSENUM', 'PROPERTYFRACTION', 'PROPERTYADDRESS', 'PROPERTYCITY', 'PROPERTYSTATE', 'PROPERTYZIP', 'MUNIDESC', 'NEIGHDESC', 'CLASS', 'CLASSDESC', 'USECODE', 'USEDESC', 'LOTAREA', 'YEARBLT', 'FAIRMARKETLAND', 'FAIRMARKETBUILDING', 'FAIRMARKETTOTAL', 'ASOFDATE']), asOf: '2026-09-01', retrievedAt: '2026-09-26', terms: 'CC0 metadata; WPRDC portal terms apply' },
  { id: 'parcel', title: 'Allegheny County parcel boundary', url: datastoreUrl('858bbc0f-b949-4e22-b4bb-1a78fef24afc', { pin: '0023C00208000000' }, ['pin', 'map_block_lot', 'municode', 'calc_acreage', 'shape_length', 'wkt']), asOf: 'Version not verified', retrievedAt: '2026-09-26', terms: 'License unspecified; WPRDC portal terms apply' },
  { id: 'pli', title: 'City PLI permit records', url: datastoreUrl('f4d1177a-f597-4c32-8cbf-7885f56253f6', { parcel_num: '0023C00208000000' }, ['permit_id', 'permit_type', 'work_description', 'work_type', 'commercial_or_residential', 'total_project_value', 'issue_date', 'parcel_num', 'address', 'latitude', 'longitude', 'neighborhood', 'ward', 'zip_code', 'status']), asOf: '2026-09-26 snapshot', retrievedAt: '2026-09-26', terms: 'Creative Commons Attribution in WPRDC metadata' },
  { id: 'zoning', title: 'City base zoning map service', url: 'https://pghbridgis.pittsburghpa.gov/federated/rest/services/Zoning/MapServer/0', asOf: 'Effective-date history not verified', retrievedAt: '2026-09-26', terms: 'Reuse license unverified' },
  { id: 'slope', title: 'City 25 percent slope layer', url: 'https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebSlope25/FeatureServer/0', asOf: 'Metadata modified 2026-09-23', retrievedAt: '2026-09-26', terms: 'License unspecified' },
  { id: 'uses-code', title: 'City zoning uses code, section 911.02 and 911.04.A.69A', url: 'https://ecode360.com/45476515', asOf: 'Version not verified', retrievedAt: '2026-09-26', terms: 'Reference link; verify current code and dependencies' },
  { id: 'nonconformity-code', title: 'City nonconformities code, section 921.03', url: 'https://ecode360.com/45478965', asOf: 'Version not verified', retrievedAt: '2026-09-26', terms: 'Reference link; verify current code and dependencies' },
  { id: 'permit-center', title: 'City OneStopPGH Permit Center', url: 'https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/OneStopPGH-Permit-Center', asOf: 'Current process not verified', retrievedAt: '2026-09-26', terms: 'Reference link; confirm current process with City' },
];

export const defaultProposals: [Proposal, Proposal] = [
  { name: 'Repair existing dwelling', existingUnits: 1, proposedUnits: 1, lawfulUse: 'unknown', scope: 'repair', disturbance: 'unknown', form: 'unknown', nonconformity: 'unknown' },
  { name: 'Expand existing dwelling', existingUnits: 1, proposedUnits: 1, lawfulUse: 'unknown', scope: 'expansion', disturbance: 'unknown', form: 'unknown', nonconformity: 'unknown' },
];

function finding(id: string, title: string, state: string, reason: string, missing: string, action: string, sourceIds: string[]): Finding {
  return { id, title, state, reason, missing, action, sourceIds };
}

export function evaluate(p: Proposal): Finding[] {
  const invalidUnitCount = [p.existingUnits, p.proposedUnits].some((units) => units !== null && (!Number.isSafeInteger(units) || units < 0));
  const unitCountUnknown = p.existingUnits === null || p.proposedUnits === null;
  const changedUnits = !unitCountUnknown && p.existingUnits !== p.proposedUnits;
  const slopeScope = p.disturbance === 'yes'
    ? 'Proposed disturbance may affect mapped slope; the extent and applicable review need site plans and a survey.'
    : p.disturbance === 'no'
      ? 'The proposal assumes no disturbance, but this does not clear the mapped slope intersection or establish existing site conditions.'
      : 'Disturbance scope is unknown, so the effect on mapped slope cannot be screened.';
  const results: Finding[] = [
    finding('condition-conflict', 'Current condition conflict', 'Review required', 'The 2026-09-01 assessment says VACANT LAND, while six completed PLI permits describe work on an existing dwelling, including partial demolition and later solar work. Neither source settles present condition.', 'Current physical condition and assessment classification', 'Inspect the site and reconcile the assessment with City permit and occupancy records.', ['assessment', 'pli']),
    finding('zoning-map', 'Mapped base zoning', 'Mapped, verify', 'The full parcel polygon intersected one R1D-H zoning feature with layer status Approved, and the local boundary check found the parcel vertices inside it. R1D-H means single-unit detached residential high density. The H suffix means high density, not the separate Hillside district. Layer status Approved is not project approval. The map does not establish project compliance.', 'Current map version, overlays, dimensions and City interpretation', 'Confirm current zoning, overlays and applicable dimensional rules with the City.', ['parcel', 'zoning']),
    finding('slope', 'Mapped 25 percent slope', 'Review required', `The full parcel intersects a City 25 percent or greater slope feature. Overlap share and actual site grade were not established. ${slopeScope}`, 'Survey, mapped overlap and any applicable hillside review', p.disturbance === 'yes' ? 'Review disturbance plans, survey and site conditions with the City and qualified professionals.' : 'Confirm disturbance scope, survey and site conditions with the City and qualified professionals.', ['parcel', 'slope']),
    finding('flood', 'Flood status', 'Unknown', 'An authoritative FEMA NFHL spatial check was not completed.', 'Panel and effective date', 'Run an authoritative flood intersection and confirm the applicable panel.', []),
    finding('historic', 'Historic status', 'Unknown', 'No authoritative City historic district polygon and version were verified.', 'Historic designation and review requirements', 'Confirm with City historic preservation staff.', []),
    finding('utilities', 'Utility capacity', 'Unknown', 'Utility or infrastructure capacity was not checked.', 'PWSA and other utility capacity', 'Request utility confirmation before feasibility claims.', []),
    finding('site-due-diligence', 'Site due diligence', 'Unknown', 'The bounded public-data screen did not assess structural or subsurface conditions, legal interests or availability.', 'undermining, contamination, title, structural condition and site availability', 'Commission appropriate site, title and structural checks before relying on project feasibility.', []),
  ];

  if (invalidUnitCount) {
    results.push(finding('unit-count', 'Unit count input', 'Invalid input', 'Unit counts must be finite nonnegative whole numbers.', 'Valid existing and proposed unit counts', 'Correct the scenario inputs before pathway review.', []));
  } else if (unitCountUnknown) {
    results.push(finding('unit-count', 'Unit count input', 'Unknown', 'Existing or proposed unit count has not been supplied.', 'Existing and proposed unit counts', 'Confirm both unit counts before pathway review.', []));
  } else {
    results.push(finding('unit-count', 'Unit count input', 'Provided, verify', 'Unit counts are user-supplied scenario inputs, not verified existing or authorized unit counts.', 'City confirmation of existing units and proposed plans', 'Verify the existing count and proposed scope with the City.', ['pli', 'uses-code']));
  }

  if (p.lawfulUse === 'unknown') {
    results.push(finding('lawful-use', 'Lawful existing use', 'Unknown', 'Permit history describes a dwelling but does not establish current lawful use or occupancy.', 'Lawful use and occupancy evidence', 'Confirm the established use and current status with City records.', ['pli', 'uses-code']));
  } else {
    results.push(finding('lawful-use', 'Lawful existing use', 'Assumed, verify', `The proposal assumes lawful existing use: ${p.lawfulUse}. This user input is not a City determination.`, 'City confirmation of existing lawful use', 'Verify the assumption with City records.', ['pli', 'uses-code']));
  }

  if (p.form === 'unknown') {
    results.push(finding('form', 'Building form', 'Unknown', 'Attached or detached classification and relevant width were not established.', 'Building form and width', 'Verify plans and classification before applying attached-use provisions.', ['uses-code']));
  } else {
    results.push(finding('form', 'Building form', 'Assumed, verify', `The proposal assumes ${p.form} form. Section 911.02 lists detached one-unit use in R1D; attached classification needs section 911.04.A.69A and width review. This is a use-table check only.`, 'Verified form, width and applicable use table', 'Confirm classification and current code with the City.', ['uses-code']));
  }

  let pathwayReason: string;
  let pathwayState = 'Conditional check';
  if (invalidUnitCount) {
    pathwayState = 'Review required';
    pathwayReason = 'Invalid unit counts prevent selection of a rule pathway.';
  } else if (changedUnits) {
    pathwayState = 'Review required';
    pathwayReason = p.proposedUnits! > p.existingUnits!
      ? 'An added unit changes the use and scope. The same-use repair pathway cannot establish this proposal. Check the current use table, expansion rules and City interpretation.'
      : 'A changed unit count, including a reduction to zero, cannot use the same-use repair pathway. Confirm the proposed use and work scope with the City.';
  } else if (unitCountUnknown) {
    pathwayState = 'Review required';
    pathwayReason = 'Existing or proposed unit count is unknown, so a same-use repair pathway cannot be selected.';
  } else if (p.existingUnits !== 1 || p.proposedUnits !== 1) {
    pathwayState = 'Review required';
    pathwayReason = 'This prototype supports the one-dwelling pathway only. Other unit counts require a separate use and scope review.';
  } else if (p.scope === 'reconstruction') {
    pathwayState = 'Review required';
    pathwayReason = 'Reconstruction, including work after partial demolition, needs its own code and permit review. A repair assumption does not resolve it.';
  } else if (p.scope === 'expansion') {
    pathwayState = 'Review required';
    pathwayReason = 'Expansion of a nonconforming structure calls for a separate section 921.03.D.1 compliance and non-increase check, subject to all applicable regulations and section 922.02. Plans and City interpretation are necessary.';
  } else if (p.lawfulUse !== 'yes' || p.nonconformity !== 'same' || p.disturbance !== 'no' || p.form === 'unknown') {
    pathwayState = 'Review required';
    pathwayReason = 'Repair pathway conditions are unresolved: lawful established use, non-increase of nonconformity, building form and precise work scope need confirmation.';
  } else {
    pathwayReason = 'Section 921.03.A.1 may apply to maintenance, remodeling or repair of a lawfully established nonconforming dwelling when nonconformity does not increase. This conditional check is not project approval or a permit exemption.';
  }
  results.push(finding('pathway', 'Rule pathway', pathwayState, pathwayReason, 'Complete plans, dimensions and permit scope; section 921.03 preamble, sections 921.03.A.3 and 921.03.A.4, section 922.02, other code dependencies and current City interpretation', 'Confirm the applicable pathway and required permits with the City before relying on it.', ['nonconformity-code', 'uses-code', 'permit-center']));
  results.push(finding('permit', 'Permits and review', 'Review required', 'Prior permits do not establish that the proposed work is exempt from permits or current review.', 'Current permit and review requirements', 'Check the proposed scope with OneStopPGH.', ['pli', 'permit-center']));
  return results;
}

function formatValue(value: string | number | null): string {
  return value === null ? 'unknown' : String(value);
}

function assumptions(p: Proposal): string[] {
  return [
    `existing units: ${formatValue(p.existingUnits)}`,
    `proposed units: ${formatValue(p.proposedUnits)}`,
    `lawful use: ${p.lawfulUse}`,
    `scope: ${p.scope}`,
    `disturbance: ${p.disturbance}`,
    `form: ${p.form}`,
    `nonconformity: ${p.nonconformity}`,
  ];
}

export type FindingComparison = {
  id: string;
  title: string;
  left: Finding;
  right: Finding;
  explanationChanged: boolean;
  reviewStatusChanged: boolean;
  nextActionChanged: boolean;
};

export function compareFindings(proposals: [Proposal, Proposal]): FindingComparison[] {
  const rightById = new Map(evaluate(proposals[1]).map((item) => [item.id, item]));
  return evaluate(proposals[0]).map((left) => {
    const right = rightById.get(left.id);
    if (!right) throw new Error(`Finding ${left.id} is missing from the comparison`);
    return {
      id: left.id,
      title: left.title,
      left,
      right,
      explanationChanged: left.reason !== right.reason || left.missing !== right.missing,
      reviewStatusChanged: left.state !== right.state,
      nextActionChanged: left.action !== right.action,
    };
  });
}

export function exportBrief(proposals: [Proposal, Proposal], refreshNote = 'No live refresh performed; source snapshots were retrieved 2026-09-26.'): string {
  const labels = ['existing units', 'proposed units', 'lawful use', 'scope', 'disturbance', 'form', 'nonconformity'];
  const left = assumptions(proposals[0]);
  const right = assumptions(proposals[1]);
  const differences = labels.flatMap((label, index) => left[index] === right[index] ? [] : [`- ${label}: ${left[index].slice(label.length + 2)} vs ${right[index].slice(label.length + 2)}`]);
  const comparisons = compareFindings(proposals);
  const explanationChanges = comparisons.filter((item) => item.explanationChanged);
  const reviewStatusChanges = comparisons.filter((item) => item.reviewStatusChanged);
  const nextActionChanges = comparisons.filter((item) => item.nextActionChanged);
  const changedFindings = comparisons.filter((item) => item.explanationChanged || item.reviewStatusChanged || item.nextActionChanged);
  const unchangedFindings = comparisons.filter((item) => !item.explanationChanged && !item.reviewStatusChanged && !item.nextActionChanged);
  const changeLines = changedFindings.flatMap((item) => {
    const summary = `- ${item.title}: explanation ${item.explanationChanged ? 'changed' : 'unchanged'}; review status ${item.reviewStatusChanged ? 'changed' : 'unchanged'}; next action ${item.nextActionChanged ? 'changed' : 'unchanged'}.`;
    const details = [summary];
    if (item.explanationChanged) details.push(`  - Explanation A: ${item.left.reason} Missing: ${item.left.missing}. Explanation B: ${item.right.reason} Missing: ${item.right.missing}.`);
    if (item.reviewStatusChanged) details.push(`  - Review status A: ${item.left.state}. Review status B: ${item.right.state}.`);
    if (item.nextActionChanged) details.push(`  - Next action A: ${item.left.action} Next action B: ${item.right.action}`);
    return details;
  });
  const sections = proposals.map((p, index) => {
    const findings = evaluate(p);
    return [`## ${index + 1}. ${p.name}`, '', 'Assumptions supplied for this scenario:', ...assumptions(p).map((line) => `- ${line}`), '', 'Findings:', ...findings.map((item) => `- ${item.title} [${item.state}]: ${item.reason} Missing: ${item.missing}. Next: ${item.action} Sources: ${item.sourceIds.join(', ') || 'none in bounded screen'}.`), ''].join('\n');
  });
  return [
    '# Lanark parcel screening brief',
    '',
    `${parcel.address} | parcel ${parcel.id} | ${parcel.jurisdiction} | mapped ${parcel.district} | assessment lot area ${parcel.lotArea} sq ft`,
    '',
    'Research interpretation only. Conditional checks are not legal, zoning, permit or financial determinations. Complete code dependencies and current versions remain to be verified.',
    'Overall score: not rated. Financial feasibility: unassessed.',
    '',
    ...sections,
    '## Comparison',
    '',
    'Different inputs:',
    ...(differences.length ? differences : ['- None supplied.']),
    '',
    `Explanation changes: ${explanationChanges.length}`,
    `Review status changes: ${reviewStatusChanges.length}`,
    `Next-action changes: ${nextActionChanges.length}`,
    ...(nextActionChanges.length ? nextActionChanges.map((item) => `- ${item.title}: ${item.left.action} / ${item.right.action}`) : ['The next action is the same for both proposals on every finding.']),
    '',
    'Changed findings:',
    ...(changeLines.length ? changeLines : ['- None.']),
    '',
    'Unchanged findings:',
    ...(unchangedFindings.length ? unchangedFindings.map((item) => `- ${item.title}: ${item.left.state}`) : ['- None.']),
    '',
    '## Scorecard and evidence status',
    '',
    'Overall score: not rated. Financial feasibility: unassessed.',
    'Scorecard components: zoning/use is a conditional code check; parcel and mapped constraints have partial public evidence; physical condition, site due diligence, infrastructure and finances remain unassessed. No calibrated numerical component scores exist.',
    'Evidence completeness: partial. The record covers one parcel, one mapped zoning feature, one slope intersection, assessment and PLI snapshots. Flood, historic, utility, undermining, contamination, title and structural condition checks remain open.',
    'AI assistance: unavailable. No model-generated analysis was run or validated.',
    'Organizer and practitioner validation: pending. Workflow fit, rule interpretation and scoring priorities have not been confirmed with organizers or practitioners.',
    '',
    'Unknown and unresolved: current physical condition and assessment classification; lawful use unless verified; attached width if relevant; mapped slope area and site grade; flood; historic; utility capacity; undermining; contamination; title; structural condition; current code, overlays, dimensions, permit requirements and City interpretation. Title, availability and financial assumptions are also unassessed.',
    '',
    '## Sources and freshness',
    '',
    ...sources.map((source) => `- ${source.id}: ${source.title}. ${source.url} As of: ${source.asOf}. Retrieved: ${source.retrievedAt}. Terms: ${source.terms}.`),
    '',
    `Refresh note: ${refreshNote}`,
    '',
  ].join('\n');
}
