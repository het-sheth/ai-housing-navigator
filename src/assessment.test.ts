import { describe, expect, it } from 'vitest'
import { refreshAssessment, assessmentUrl } from './assessment'
const id = '0023C00208000000'
describe('bounded assessment adapter', () => {
  it('preserves leading zeroes and requests only safe fields', () => {
    const url = new URL(assessmentUrl(id))
    expect(JSON.parse(url.searchParams.get('filters')!)).toEqual({PARID:id})
    expect(url.searchParams.get('fields')).toBe('PARID,MUNIDESC,USEDESC,LOTAREA,ASOFDATE')
  })
  it('rejects unsupported input before making a request', async () => {
    let called = false
    const result = await refreshAssessment('another-parcel', async () => { called = true; throw Error() })
    expect(called).toBe(false)
    expect(result.status).toBe('unsupported')
  })
  it('preserves unavailable state on network failure', async () => {
    expect((await refreshAssessment(id, async () => {throw Error('offline')})).status).toBe('unavailable')
  })
  it('does not treat empty results as no constraints', async () => {
    const result = await refreshAssessment(id, async () => new Response(JSON.stringify({success:true,result:{records:[]}})))
    expect(result.status).toBe('unavailable')
  })
  it('rejects an outside-City response', async () => {
    const result = await refreshAssessment(id, async () => new Response(JSON.stringify({success:true,result:{records:[{PARID:id,MUNIDESC:'Wilkinsburg',USEDESC:'VACANT LAND',LOTAREA:1657,ASOFDATE:'2026-09-01'}]}})))
    expect(result.status).toBe('unavailable')
  })
  it('returns only validated exact City record with provenance', async () => {
    const result = await refreshAssessment(id, async () => new Response(JSON.stringify({success:true,result:{records:[{PARID:id,MUNIDESC:'Pittsburgh - 25th Ward',USEDESC:'VACANT LAND',LOTAREA:1657,ASOFDATE:'2026-09-01'}]}})))
    expect(result.status).toBe('live')
    expect(result.note).toContain('VACANT LAND')
    expect(result.note).toContain('2026-09-01')
    expect(result.note).toContain('https://data.wprdc.org')
  })
})
