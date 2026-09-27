import type { PropertyDetail } from '../projects/property-client'
import type { ExplorerCandidate } from './explorer-client'

export type RecordChange = { field: string; search: string; refreshed: string }
export type Reconciliation = { status: 'confirmed' | 'changed' | 'unconfirmed'; changes: RecordChange[]; missing: string[] }

function normalized(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ').toUpperCase() || null
}

export function reconcileCandidate(candidate: ExplorerCandidate, assessment: PropertyDetail['assessment']): Reconciliation {
  if (assessment.status !== 'available' || !assessment.record) return { status: 'unconfirmed', changes: [], missing: ['Refreshed assessment record'] }
  const record = assessment.record
  const changes: RecordChange[] = []
  const missing: string[] = []
  const compare = (field: string, search: string | null | undefined, refreshed: string | null | undefined) => {
    if (!normalized(search) || !normalized(refreshed)) missing.push(field)
    else if (normalized(search) !== normalized(refreshed)) changes.push({ field, search: search!, refreshed: refreshed! })
  }
  compare('Parcel ID', candidate.parcelId, record.parcelId)
  compare('Address', candidate.address, record.address)
  compare('Recorded use', candidate.recordedUse, record.useDescription)
  compare('Postal ZIP', candidate.zip, record.zip)
  compare('Municipality label', candidate.municipality, record.municipality)
  compare('Assessment file date', candidate.sourceDate, assessment.sourceDate)
  return { status: changes.length ? 'changed' : missing.length ? 'unconfirmed' : 'confirmed', changes, missing }
}
