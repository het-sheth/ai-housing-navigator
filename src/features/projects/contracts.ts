export const ROLES = [
  { id: 'municipal_planner', label: 'Municipal Planner' },
  { id: 'developer', label: 'Small/Mid-Size Developer' },
  { id: 'nonprofit', label: 'Housing Nonprofit/CDC' },
  { id: 'policy_analyst', label: 'Policy Analyst' },
  { id: 'other', label: 'Other / exploring' },
] as const

export const ACTIVITIES = [
  { id: 'repair_remodel', label: 'Repair/remodel' },
  { id: 'addition', label: 'Addition' },
  { id: 'interior_conversion', label: 'Interior conversion' },
  { id: 'additional_dwelling', label: 'Additional dwelling' },
  { id: 'partial_demolition_rebuild', label: 'Partial demolition/rebuild' },
  { id: 'demolition', label: 'Demolition' },
  { id: 'new_construction', label: 'New construction' },
  { id: 'site_work', label: 'Site work' },
  { id: 'mixed_use', label: 'Mixed use' },
  { id: 'other_uncertain', label: 'Other or uncertain work' },
] as const

export type RoleId = typeof ROLES[number]['id']
export type ActivityId = typeof ACTIVITIES[number]['id']
export type FinancialAnswer = 'yes' | 'no' | 'unknown'
export type HousingForm = 'detached' | 'attached' | 'unknown'
export type GroundDisturbance = 'yes' | 'no' | 'unknown'
export type Draft = {
  schemaVersion: 1
  id: string
  revision: number
  step: number
  role: string
  decision: string
  propertyQuery: string
  parcelId: string | null
  propertyConfirmed: boolean
  propertyEvidence: 'historical' | 'live' | null
  description: string
  activities: ActivityId[]
  tentativeActivities: ActivityId[]
  housingForm: HousingForm
  groundDisturbance: GroundDisturbance
  existingHomes: number | null
  proposedHomes: number | null
  homesRetained: number | null
  affordabilityGoal: string
  essentialUses: string
  financial: { budget: FinancialAnswer; value: FinancialAnswer; funding: FinancialAnswer }
  confirmedAt: string | null
  updatedAt: string
}
export type DraftTask = { id: string; title: string; party: string; request: string }
export type DraftSummary = { tasks: DraftTask[]; netNew: number | null; coverage: string; financialStatus: 'Unassessed' }

export function createDraft(): Draft {
  return {
    schemaVersion: 1, id: crypto.randomUUID(), revision: 0, step: 0, role: '', decision: '',
    propertyQuery: '', parcelId: null, propertyConfirmed: false, propertyEvidence: null, description: '',
    activities: [], tentativeActivities: [], housingForm: 'unknown', groundDisturbance: 'unknown', existingHomes: null, proposedHomes: null,
    homesRetained: null, affordabilityGoal: '', essentialUses: '',
    financial: { budget: 'unknown', value: 'unknown', funding: 'unknown' },
    confirmedAt: null, updatedAt: new Date().toISOString(),
  }
}

const draftKeys = ['schemaVersion', 'id', 'revision', 'step', 'role', 'decision', 'propertyQuery', 'parcelId', 'propertyConfirmed', 'propertyEvidence', 'description', 'activities', 'tentativeActivities', 'housingForm', 'groundDisturbance', 'existingHomes', 'proposedHomes', 'homesRetained', 'affordabilityGoal', 'essentialUses', 'financial', 'confirmedAt', 'updatedAt']

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

function timestamp(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value))
}

function activityList(value: unknown): value is ActivityId[] {
  return Array.isArray(value) && value.every(item => ACTIVITIES.some(activity => activity.id === item)) && new Set(value).size === value.length
}

function homeCount(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function validateDraft(input: unknown): Draft {
  if (object(input)) input = {
    ...input,
    ...(!Object.hasOwn(input, 'propertyEvidence') ? { propertyEvidence: input.parcelId === '0023C00208000000' && input.propertyConfirmed ? 'historical' : null } : {}),
    ...(!Object.hasOwn(input, 'housingForm') ? { housingForm: 'unknown' } : {}),
    ...(!Object.hasOwn(input, 'groundDisturbance') ? { groundDisturbance: 'unknown' } : {}),
  }
  if (!object(input) || Object.keys(input).length !== draftKeys.length || draftKeys.some(key => !Object.hasOwn(input, key))) throw new Error('Draft fields are missing or unrecognized. The saved draft has not been changed.')
  if (input.schemaVersion !== 1) throw new Error('This draft version is not supported. The saved draft has not been changed.')
  if (!text(input.id, 100) || !input.id.trim() || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0 || !Number.isInteger(input.step) || (input.step as number) < 0 || (input.step as number) > 5) throw new Error('Draft identity, revision or step is invalid.')
  if (input.role !== '' && !ROLES.some(role => role.id === input.role)) throw new Error('Choose a listed role or leave it unanswered.')
  if (!text(input.decision, 120) || !text(input.propertyQuery, 500) || !text(input.description, 4000) || !text(input.affordabilityGoal, 2000) || !text(input.essentialUses, 2000)) throw new Error('A draft text field is invalid or exceeds its limit.')
  if (input.parcelId !== null && (!text(input.parcelId, 64) || !/^[A-Za-z0-9 -]+$/.test(input.parcelId))) throw new Error('Parcel identifiers must be text with their leading zeros preserved.')
  if (typeof input.propertyConfirmed !== 'boolean' || input.propertyConfirmed && !input.parcelId) throw new Error('Property confirmation requires a selected parcel.')
  if (![null, 'historical', 'live'].includes(input.propertyEvidence as string | null)) throw new Error('Property evidence type is invalid.')
  if (input.propertyEvidence === 'historical' && (input.parcelId !== '0023C00208000000' || !input.propertyConfirmed) || input.propertyEvidence === 'live' && (!input.parcelId || !input.propertyConfirmed)) throw new Error('Property evidence requires its confirmed parcel.')
  if (!activityList(input.activities) || !activityList(input.tentativeActivities) || input.activities.some(item => (input.tentativeActivities as ActivityId[]).includes(item))) throw new Error('Work activities must be distinct, recognized selections with tentative ideas separate.')
  if (!['detached', 'attached', 'unknown'].includes(input.housingForm as string) || !['yes', 'no', 'unknown'].includes(input.groundDisturbance as string)) throw new Error('Housing form and ground disturbance must be selected options or unknown.')
  if (!homeCount(input.existingHomes) || !homeCount(input.proposedHomes) || !homeCount(input.homesRetained)) throw new Error('Home counts must be unknown or nonnegative whole numbers.')
  if (input.homesRetained !== null && (input.existingHomes !== null && input.homesRetained > input.existingHomes || input.proposedHomes !== null && input.homesRetained > input.proposedHomes)) throw new Error('Homes retained cannot exceed existing or proposed homes.')
  if (!object(input.financial) || Object.keys(input.financial).length !== 3 || !['budget', 'value', 'funding'].every(key => Object.hasOwn(input.financial as object, key) && ['yes', 'no', 'unknown'].includes((input.financial as Record<string, string>)[key]))) throw new Error('Financial readiness answers must be yes, no or unknown.')
  if (!timestamp(input.updatedAt) || input.confirmedAt !== null && !timestamp(input.confirmedAt)) throw new Error('Draft dates are invalid.')
  return structuredClone(input) as Draft
}

export function summarizeDraft(input: Draft): DraftSummary {
  const draft = validateDraft(input)
  const tasks: DraftTask[] = []
  const lanarkSelected = draft.parcelId === '0023C00208000000' && draft.propertyConfirmed && draft.propertyEvidence === 'historical'
  const liveSelected = Boolean(draft.parcelId && draft.propertyConfirmed && draft.propertyEvidence === 'live')
  if (!lanarkSelected && !liveSelected) tasks.push({ id: 'property-identity', title: 'Confirm the property and municipality', party: 'Project lead and County property records team', request: 'Resolve the exact parcel and municipality using authoritative property records and geographic matching before applying City rules.' })
  if (liveSelected) tasks.push({ id: 'property-verification', title: 'Verify boundary, assessment and jurisdiction', party: 'Project lead and County records team', request: 'Review the latest retrieved boundary and assessment observations, their source dates and any unavailable fields. Confirm the governing municipality before applying local rules.' })
  if (lanarkSelected) tasks.push({ id: 'lanark-condition', title: 'Resolve the conflicting property records', party: 'Project lead and City reviewer', request: 'Check current site condition and which records establish lawful use. The dated Lanark assessment classifies vacant land while permits describe dwelling work; neither settles current condition.' })
  const missingFinance = [draft.financial.budget !== 'yes' ? 'preliminary project budget' : '', draft.financial.value !== 'yes' ? 'applicable revenue or value assumptions' : '', draft.financial.funding !== 'yes' ? 'funding or subsidy path' : ''].filter(Boolean)
  const financialTask = { id: 'financial-readiness', title: missingFinance.length ? 'Gather financial assumptions before further spending' : 'Have the financial assumptions reviewed', party: 'Project lead and housing finance adviser', request: missingFinance.length ? `Establish the ${missingFinance.join(', ')} before relying on financial feasibility. A cost/value gap may call for subsidy or revised funding assumptions.` : 'Have a qualified adviser review the budget, revenue/value, operating costs, subsidies and lender assumptions. Having inputs does not establish financial viability.' }
  if (missingFinance.length) tasks.push(financialTask)
  tasks.push({ id: 'proposal-review', title: 'Confirm the review path for the proposed work', party: lanarkSelected ? 'Project lead and City reviewer' : 'Project lead and municipal reviewer', request: 'Review all selected work activities, including tentative ideas and unsupported work. Confirm the evidence, plans and approvals needed; no legal permission check has run in this workspace.' })
  if (!missingFinance.length) tasks.push(financialTask)
  return {
    tasks,
    netNew: draft.existingHomes === null || draft.proposedHomes === null ? null : draft.proposedHomes - draft.existingHomes,
    coverage: lanarkSelected ? 'Not yet supported: automated proposal checks. Lanark has dated example evidence; this draft produces preparation tasks only.' : liveSelected ? 'Live parcel identity selected. Boundary, assessment and municipality still need source review; automated proposal checks are not supported.' : 'Property and municipality unresolved. Not yet supported: automated proposal checks.',
    financialStatus: 'Unassessed',
  }
}
