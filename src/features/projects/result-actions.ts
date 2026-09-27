import type { DraftSummary } from './contracts'
import type { ScreeningResult } from './screening-client'

const genericFinancialAction = 'Establish project budget, rents or sales assumptions, and funding path; financial feasibility is unassessed.'
const genericGapActions = new Set([
  'Review zoning overlays, dimensions, lawful baseline and applicable City process for this proposal.',
  'Confirm utility capacity and access with the relevant providers before relying on development feasibility.',
])
const genericGapPattern = /review route|required documents|utility availability|utility capacity/i

function screeningActionsWithoutGenericFinance(assessment: ScreeningResult): string[] {
  return assessment.nextActions.filter(action => action !== genericFinancialAction)
}

export function resultActions(assessment: ScreeningResult | null, summary: DraftSummary): string[] {
  if (!assessment) return []
  const sourceActions = screeningActionsWithoutGenericFinance(assessment)
  const financialTask = summary.tasks.find(task => task.id === 'financial-readiness')
  if (!financialTask) return sourceActions
  const financialAction = `${financialTask.title}: ${financialTask.request} Responsible: ${financialTask.party}.`
  const firstGenericGap = sourceActions.findIndex(action => genericGapActions.has(action) || genericGapPattern.test(action))
  const financialPosition = firstGenericGap < 0 ? sourceActions.length : firstGenericGap
  return [...sourceActions.slice(0, financialPosition), financialAction, ...sourceActions.slice(financialPosition)]
}
