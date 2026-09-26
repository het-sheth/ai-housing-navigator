export type RefreshResult = { status: 'live' | 'unavailable' | 'unsupported'; note: string }
export function assessmentUrl(id: string): string {
  const params = new URLSearchParams({ resource_id: 'property_assessments_table', filters: JSON.stringify({ PARID: id }), fields: 'PARID,MUNIDESC,USEDESC,LOTAREA,ASOFDATE', limit: '2' })
  return `https://data.wprdc.org/api/3/action/datastore_search?${params}`
}
export async function refreshAssessment(id: string, request: typeof fetch = fetch): Promise<RefreshResult> {
  if (id !== '0023C00208000000') return { status: 'unsupported', note: 'Only the verified Lanark case is supported. No other property was evaluated.' }
  const url = assessmentUrl(id)
  const retrievedAt = new Date().toISOString()
  try {
    const response = await request(url, { signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`)
    const body = await response.json()
    const records = body?.result?.records
    if (body.success !== true || !Array.isArray(records) || records.length !== 1) throw new Error('Expected one exact assessment record; source results are incomplete or unavailable')
    const r = records[0]
    if (r.PARID !== id || typeof r.MUNIDESC !== 'string' || !/^(?:\d+(?:st|nd|rd|th) Ward - PITTSBURGH|Pittsburgh - \d+(?:st|nd|rd|th) Ward)$/i.test(r.MUNIDESC) || typeof r.USEDESC !== 'string' || typeof r.ASOFDATE !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.ASOFDATE) || !Number.isFinite(r.LOTAREA) || r.LOTAREA <= 0) throw new Error('Exact parcel, City jurisdiction or required record fields could not be validated')
    return { status: 'live', note: `Live assessment observation: ${r.USEDESC}; ${r.LOTAREA} sq ft; as of ${r.ASOFDATE}; retrieved ${retrievedAt}. Source: ${url}. This refresh does not replace the dated comparison evidence or resolve its source conflict.` }
  } catch (error) {
    return { status: 'unavailable', note: `Live assessment unavailable at ${retrievedAt}: ${error instanceof Error ? error.message : 'Request failed'}. Source: ${url}. Comparison still uses the explicitly dated September 26, 2026 snapshot. No constraints were cleared.` }
  }
}
