import { describe, expect, it } from 'vitest';
import { compareFindings, defaultProposals, evaluate, exportBrief, parcel, sources, type Proposal } from './domain';

const repair: Proposal = {
  name: 'Repair', existingUnits: 1, proposedUnits: 1, lawfulUse: 'yes', scope: 'repair',
  disturbance: 'no', form: 'detached', nonconformity: 'same',
};

describe('bounded Lanark findings', () => {
  it('preserves conflicting assessment and permit evidence even with favorable assumptions', () => {
    const result = evaluate(repair);
    expect(result.find((item) => item.id === 'condition-conflict')).toMatchObject({ state: 'Review required' });
    expect(result.find((item) => item.id === 'condition-conflict')?.reason).toMatch(/VACANT LAND.*six completed/i);
    expect(result.find((item) => item.id === 'condition-conflict')?.sourceIds).toEqual(['assessment', 'pli']);
    expect(result.some((item) => /approved|permitted project|variance required/i.test(item.state))).toBe(false);
  });

  it('keeps unknown lawful use and form unresolved', () => {
    const result = evaluate({ ...repair, lawfulUse: 'unknown', form: 'unknown' });
    expect(result.find((item) => item.id === 'lawful-use')?.state).toBe('Unknown');
    expect(result.find((item) => item.id === 'form')?.state).toBe('Unknown');
    expect(result.find((item) => item.id === 'pathway')?.state).toBe('Review required');
  });

  it('never routes added units through repair', () => {
    const result = evaluate({ ...repair, proposedUnits: 2 });
    expect(result.find((item) => item.id === 'pathway')?.reason).toMatch(/added unit/i);
    expect(result.find((item) => item.id === 'pathway')?.reason).not.toMatch(/921\.03\.A\.1/);
  });

  it('separates expansion and reconstruction from repair', () => {
    const expanded = evaluate({ ...repair, scope: 'expansion' });
    const rebuilt = evaluate({ ...repair, scope: 'reconstruction' });
    expect(expanded.find((item) => item.id === 'pathway')?.reason).toMatch(/921\.03\.D\.1/);
    expect(rebuilt.find((item) => item.id === 'pathway')?.reason).toMatch(/reconstruction/i);
    expect(rebuilt.find((item) => item.id === 'pathway')?.reason).not.toMatch(/921\.03\.A\.1/);
  });

  it('keeps the full nonconformity dependency review pending', () => {
    const result = evaluate(repair);
    const pathway = result.find((item) => item.id === 'pathway');
    expect(pathway?.missing).toMatch(/921\.03\.A\.3/);
    expect(pathway?.missing).toMatch(/921\.03\.A\.4/);
    expect(pathway?.missing).toMatch(/922\.02/);
    expect(pathway?.state).toBe('Conditional check');
  });

  it('does not turn mapped slope or missing hazard checks into a legal result', () => {
    const result = evaluate(repair);
    expect(result.find((item) => item.id === 'slope')?.state).toBe('Review required');
    expect(result.find((item) => item.id === 'flood')?.state).toBe('Unknown');
    expect(result.find((item) => item.id === 'historic')?.state).toBe('Unknown');
  });

  it('exports all assumptions, differences, unknowns and cited sources', () => {
    const brief = exportBrief([repair, { ...repair, name: 'Add unit', proposedUnits: 2, scope: 'expansion' }], 'Refresh zoning before use.');
    expect(brief).toContain('1623 LANARK ST');
    expect(brief).toContain('0023C00208000000');
    expect(brief).toContain('VACANT LAND');
    expect(brief).toContain('six completed');
    expect(brief).toContain('lawful use: yes');
    expect(brief).toContain('scope: expansion');
    expect(brief).toContain('Different inputs');
    expect(brief).toContain('proposed units: 1 vs 2');
    expect(brief).toContain('Unknown and unresolved');
    expect(brief).toContain('Overall score: not rated');
    expect(brief).toContain('Financial feasibility: unassessed');
    expect(brief).toContain('Refresh zoning before use.');
    for (const source of sources) expect(brief).toContain(source.url);
  });

  it('defaults to a one-dwelling expansion comparison', () => {
    expect(defaultProposals[1]).toMatchObject({ name: 'Expand existing dwelling', existingUnits: 1, proposedUnits: 1, scope: 'expansion' });
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid proposed unit count %s from the repair pathway', (proposedUnits) => {
    const result = evaluate({ ...repair, proposedUnits });
    expect(result.find((item) => item.id === 'unit-count')?.state).toBe('Invalid input');
    expect(result.find((item) => item.id === 'pathway')?.state).toBe('Review required');
  });

  it.each([0, 2])('keeps a changed unit count %s out of the repair pathway', (proposedUnits) => {
    const result = evaluate({ ...repair, proposedUnits });
    expect(result.find((item) => item.id === 'pathway')?.state).toBe('Review required');
    expect(result.find((item) => item.id === 'pathway')?.reason).not.toMatch(/921\.03\.A\.1/);
  });

  it('requires form verification before even a conditional repair check', () => {
    const result = evaluate({ ...repair, form: 'unknown' });
    expect(result.find((item) => item.id === 'pathway')?.state).toBe('Review required');
  });

  it('responds to disturbance while retaining the mapped slope flag', () => {
    const yes = evaluate({ ...repair, disturbance: 'yes' }).find((item) => item.id === 'slope');
    const no = evaluate({ ...repair, disturbance: 'no' }).find((item) => item.id === 'slope');
    const unknown = evaluate({ ...repair, disturbance: 'unknown' }).find((item) => item.id === 'slope');
    expect(yes?.reason).toMatch(/proposed disturbance/i);
    expect(no?.reason).toMatch(/no disturbance/i);
    expect(unknown?.reason).toMatch(/disturbance scope is unknown/i);
    expect([yes?.state, no?.state, unknown?.state]).toEqual(['Review required', 'Review required', 'Review required']);
  });

  it('exposes site due diligence gaps and a real finding comparison in the brief', () => {
    const expanded = { ...repair, name: 'Expansion', scope: 'expansion' as const };
    const finding = evaluate(repair).find((item) => item.id === 'site-due-diligence');
    expect(finding?.missing).toMatch(/undermining.*contamination.*title.*structural condition/i);
    const brief = exportBrief([repair, expanded]);
    expect(brief).toContain('Changed findings:');
    expect(brief).toContain('Rule pathway');
    expect(brief).toContain('Unchanged findings:');
    expect(brief).toContain('Current condition conflict');
    expect(brief).toContain('Scorecard components');
    expect(brief).toContain('Evidence completeness: partial');
    expect(brief).toContain('AI assistance: unavailable');
    expect(brief).toContain('Organizer and practitioner validation: pending');
    expect(brief).toMatch(/undermining.*contamination.*title.*structural condition/i);
  });

  it('keeps finding IDs aligned across valid, unknown and invalid unit counts', () => {
    const valid = evaluate(repair);
    const unknown = evaluate({ ...repair, existingUnits: null });
    const invalid = evaluate({ ...repair, proposedUnits: Number.NaN });
    expect(valid.map((item) => item.id)).toEqual(unknown.map((item) => item.id));
    expect(valid.map((item) => item.id)).toEqual(invalid.map((item) => item.id));
    expect(valid.find((item) => item.id === 'unit-count')?.state).toBe('Provided, verify');
    expect(unknown.find((item) => item.id === 'unit-count')?.state).toBe('Unknown');
    expect(invalid.find((item) => item.id === 'unit-count')?.state).toBe('Invalid input');
    expect(() => exportBrief([repair, { ...repair, proposedUnits: Number.NaN }])).not.toThrow();
  });

  it('cites bounded, field-limited WPRDC queries', () => {
    for (const id of ['assessment', 'parcel', 'pli']) {
      const url = new URL(sources.find((item) => item.id === id)!.url);
      expect(url.searchParams.get('resource_id')).toBeTruthy();
      expect(url.searchParams.get('fields')).toBeTruthy();
      expect(url.searchParams.get('filters')).toContain(id === 'assessment' ? 'LANARK ST' : '0023C00208000000');
      expect(url.searchParams.get('fields')).not.toMatch(/owner|contractor|contact/i);
    }
  });

  it('separates explanation, review status and next action for the default pair', () => {
    const comparison = compareFindings(defaultProposals);
    const pathway = comparison.find((item) => item.id === 'pathway');
    expect(pathway).toMatchObject({ explanationChanged: true, reviewStatusChanged: false, nextActionChanged: false });
    expect(comparison.find((item) => item.id === 'condition-conflict')).toMatchObject({ explanationChanged: false, reviewStatusChanged: false, nextActionChanged: false });
    expect(comparison.map((item) => item.id)).toEqual(evaluate(defaultProposals[0]).map((item) => item.id));
    const brief = exportBrief(defaultProposals);
    expect(brief).toContain('Explanation changes: 1');
    expect(brief).toContain('Review status changes: 0');
    expect(brief).toContain('Next-action changes: 0');
    expect(brief).toContain('The next action is the same for both proposals');
    expect(brief).toContain('Rule pathway: explanation changed; review status unchanged; next action unchanged');
  });

  it('reports distinct outcomes for other supported proposal pairs', () => {
    const favorableExpansion: Proposal = { ...repair, name: 'Expand', scope: 'expansion' };
    const rebuild: Proposal = { ...repair, name: 'Rebuild', scope: 'reconstruction' };
    const disturbed: Proposal = { ...repair, name: 'Disturb', disturbance: 'yes' };
    expect(compareFindings([repair, favorableExpansion]).find((item) => item.id === 'pathway')).toMatchObject({ explanationChanged: true, reviewStatusChanged: true, nextActionChanged: false });
    expect(compareFindings([repair, rebuild]).find((item) => item.id === 'pathway')).toMatchObject({ explanationChanged: true, reviewStatusChanged: true, nextActionChanged: false });
    expect(compareFindings([repair, disturbed]).find((item) => item.id === 'slope')).toMatchObject({ explanationChanged: true, reviewStatusChanged: false, nextActionChanged: true });
    expect(exportBrief([repair, disturbed])).toContain('Next-action changes: 1');
  });

  it('retains exact parcel identity and closed geometry', () => {
    expect(parcel.id).toBe('0023C00208000000');
    expect(parcel.ring[0]).toEqual(parcel.ring.at(-1));
    expect(parcel.ring).toHaveLength(6);
    expect(defaultProposals).toHaveLength(2);
  });
});

it('does not assume a dwelling pathway for zero existing and proposed homes', () => {
  const result = evaluate({ ...repair, existingUnits: 0, proposedUnits: 0 });
  expect(result.find(item => item.id === 'pathway')?.state).toBe('Review required');
});

it('isolates the default comparison to scope and display name only', () => {
  expect({ ...defaultProposals[1], name: defaultProposals[0].name, scope: defaultProposals[0].scope }).toEqual(defaultProposals[0]);
  const brief = exportBrief(defaultProposals);
  expect(brief).toContain('2026-09-01');
  expect(brief).toContain('2026-09-26');
  expect(brief).toContain('VACANT LAND');
  expect(brief).toContain('Financial feasibility: unassessed');
});

it('keeps the disturbance-only experiment narrow under the unknown baseline', () => {
  const base = defaultProposals[0];
  const pair: [Proposal, Proposal] = [{ ...base, disturbance: 'no' }, { ...base, disturbance: 'yes' }];
  const comparison = compareFindings(pair);
  expect(comparison.filter(item => item.explanationChanged)).toHaveLength(1);
  expect(comparison.filter(item => item.reviewStatusChanged)).toHaveLength(0);
  expect(comparison.filter(item => item.nextActionChanged).map(item => item.id)).toEqual(['slope']);
  const reconstruction = compareFindings([base, { ...base, scope: 'reconstruction' }]);
  expect(reconstruction.filter(item => item.reviewStatusChanged || item.nextActionChanged)).toHaveLength(0);
});
