import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { mockSignedInAccount } from './fixture-account.mjs'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const screenshots = '/tmp/housing-explorer-verify'
const parcelId = '0000000000000001'
const sourceUrl = 'https://data.wprdc.org/dataset/property-assessments'
const retrievedAt = '2026-09-27T12:00:00.000Z'
const geometry = { type: 'Polygon', coordinates: [[[-80.0075, 40.4638], [-80.0076, 40.4638], [-80.0076, 40.4639], [-80.0075, 40.4638]]] }
const candidate = { parcelId, address: 'SYNTHETIC TEST PARCEL', city: 'PITTSBURGH', municipality: '25th Ward - PITTSBURGH', zip: '15217', recordedUse: 'VACANT LAND', sourceDate: '2026-09-01', matched: 'Assessment recorded use: VACANT LAND; Pittsburgh-labeled municipality' }
const candidateSearch = { status: 'candidates', candidates: [candidate], truncated: true, retrievedAt, sourceUrl, sourceDate: '2026-09-01', coverage: 'Allegheny County assessment records with a Pittsburgh-labeled municipality and recorded use VACANT LAND and postal ZIP 15217. First 20 returned records only.', unknowns: ['Confirmed City jurisdiction', 'Proposal suitability', 'Lot-area suitability'] }
const detail = { parcelId, assessment: { status: 'available', record: { parcelId, address: candidate.address, municipality: candidate.municipality, zip: candidate.zip, useDescription: 'VACANT LAND' }, sourceDate: '2026-09-01', retrievedAt, sourceUrl }, boundary: { status: 'available', geometry, sourceDate: null, retrievedAt, sourceUrl: 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0', sourceCrs: 'EPSG:2272', displayCrs: 'EPSG:4326', modifiedOn: null } }
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
await mkdir(screenshots, { recursive: true })

async function run(width, aiMode) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await mockSignedInAccount(context)
  const page = await context.newPage()
  const calls = { ai: 0, candidates: 0, parcel: 0 }
  let failParcelOnce = true
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/config' || url.hostname === 'example.supabase.co') return route.fallback()
    if (url.pathname === '/api/assist') {
      calls.ai += 1
      if (aiMode === 'success') {
        const input = route.request().postDataJSON()
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, operation: 'intake', draftId: input.draftId, draftRevision: input.draftRevision, suggestions: [{ activityId: 'new_construction', intent: 'confirmed_candidate', quote: 'build a home', reason: 'The idea expressly includes construction.' }], question: 'How many homes are planned?' }) })
      } else await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'ai_not_configured' }) })
      return
    }
    if (url.pathname === '/api/property/candidates') {
      calls.candidates += 1
      assert.equal(url.searchParams.get('use'), 'vacant_land')
      assert.equal(url.searchParams.get('zip'), '15217')
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidateSearch) })
      return
    }
    if (url.pathname === '/api/property/parcel') {
      calls.parcel += 1
      assert.equal(url.searchParams.get('pin'), parcelId)
      if (failParcelOnce) { failParcelOnce = false; await route.fulfill({ status: 502, body: '{}' }); return }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) })
      return
    }
    if (url.origin === origin || url.hostname.endsWith('tile.openstreetmap.org')) return route.continue()
    return route.abort()
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/explore`)
  await expect(page.getByRole('heading', { name: 'Find a parcel to study.' })).toBeVisible()
  await page.getByLabel('What would you like to do?').fill('I want to build a home on a vacant parcel')
  await page.getByRole('button', { name: 'Suggest activities with AI' }).click()
  await expect(page.getByRole('status')).toContainText('AI interpretation is unavailable')
  await page.getByLabel('New construction').check()
  await page.getByLabel('Preferred postal ZIP (optional)').fill('15217')
  await page.getByLabel('Other needs or assumptions (optional)').fill('At least 5,000 sq ft')
  await page.getByRole('button', { name: 'Confirm criteria and find records' }).click()
  await expect(page.getByText('Not evaluated: At least 5,000 sq ft')).toBeVisible()
  await expect(page.getByText('Candidate records')).toBeVisible()
  await expect(page.getByText('More records match these filters.')).toBeVisible()
  await page.getByRole('radio', { name: /SYNTHETIC TEST PARCEL/ }).check()
  await expect(page.locator('.ex-map')).toContainText(`Candidate parcel ${parcelId} selected`)
  await page.getByRole('button', { name: `Inspect parcel ${parcelId}` }).click()
  await expect(page.locator('.ex-map')).toContainText('Parcel records could not be loaded')
  await expect(page.locator('.ex-map')).toContainText('not yet confirmed')
  await page.locator('.ex-map').getByRole('button', { name: 'Retry parcel inspection' }).click()
  await expect(page.getByText('Selected parcel / ' + parcelId)).toBeVisible()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await page.waitForFunction(() => [...document.querySelectorAll('img.leaflet-tile')].some(image => image.complete && image.naturalWidth > 0), undefined, { timeout: 15000 })
  await expect(page.getByRole('link', { name: /Compare proposals on this parcel/ })).toHaveAttribute('href', `/compare?parcelId=${parcelId}`)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.deepEqual(errors, [])
  assert.deepEqual(calls, { ai: 1, candidates: 1, parcel: 2 })
  await page.screenshot({ path: `${screenshots}/explorer-${width}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Edit criteria' }).click()
  await expect(page.getByText('Candidate records')).toHaveCount(0)
  await expect(page.getByLabel('What would you like to do?')).toHaveValue('I want to build a home on a vacant parcel')
  await context.close()
}

await run(1440, 'unavailable')
await run(390, 'unavailable')

async function verifyRefreshedRecord(mode) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const page = await context.newPage()
  await context.route('**/api/property/candidates?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidateSearch) }))
  await context.route('**/api/property/parcel?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mode === 'changed' ? {
    ...detail, assessment: { ...detail.assessment, sourceDate: '2026-09-10', record: { ...detail.assessment.record, address: 'SECOND SYNTHETIC ADDRESS', useDescription: 'SINGLE FAMILY' } },
  } : { ...detail, assessment: { ...detail.assessment, status: 'unavailable', sourceDate: null, record: null } }) }))
  await page.goto(`${origin}/explore`)
  await page.getByLabel('What would you like to do?').fill('I want to build a home')
  await page.getByLabel('New construction').check()
  await page.getByRole('button', { name: 'Confirm criteria and find records' }).click()
  await page.getByRole('radio', { name: /SYNTHETIC TEST PARCEL/ }).check()
  await page.getByRole('button', { name: `Inspect parcel ${parcelId}` }).click()
  if (mode === 'changed') {
    await expect(page.getByRole('alert')).toContainText('Search and refreshed records differ')
    await expect(page.getByRole('alert')).toContainText('Search: SYNTHETIC TEST PARCEL')
    await expect(page.getByRole('alert')).toContainText('Refreshed: SECOND SYNTHETIC ADDRESS')
    await expect(page.getByRole('alert')).toContainText('Search: VACANT LAND')
    await expect(page.getByRole('alert')).toContainText('Refreshed: SINGLE FAMILY')
    await expect(page.getByRole('alert')).toContainText('Sep 1, 2026')
    await expect(page.getByRole('alert')).toContainText('Sep 10, 2026')
  } else {
    await expect(page.getByRole('alert')).toContainText('The search match has not been reconfirmed')
    await expect(page.getByRole('alert')).not.toContainText('records differ')
  }
  await expect(page.getByRole('link', { name: /Compare proposals on this parcel/ })).toHaveAttribute('href', `/compare?parcelId=${parcelId}`)
  await page.locator('.ex-detail').screenshot({ path: `${screenshots}/explorer-${mode}-record.png` })
  await context.close()
}

await verifyRefreshedRecord('changed')
await verifyRefreshedRecord('missing')

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await mockSignedInAccount(context)
const page = await context.newPage()
let aiCalls = 0
await context.route('**/api/assist', async route => {
  aiCalls += 1
  const input = route.request().postDataJSON()
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, operation: 'intake', draftId: input.draftId, draftRevision: input.draftRevision, suggestions: [{ activityId: 'new_construction', intent: 'confirmed_candidate', quote: 'build a home', reason: 'The idea expressly includes construction.' }], question: 'How many homes are planned?' }) })
})
await page.goto(`${origin}/explore`)
await page.getByLabel('What would you like to do?').fill('I want to build a home')
await page.getByLabel('Addition', { exact: true }).check()
await page.getByRole('button', { name: 'Suggest activities with AI' }).click()
await expect(page.getByRole('status')).toContainText('AI proposed work activities')
await expect(page.getByLabel('New construction')).toBeChecked()
await expect(page.getByLabel('Addition', { exact: true })).toBeChecked()
await expect(page.getByText('Question to resolve: How many homes are planned?')).toBeVisible()
assert.equal(aiCalls, 1)
await context.close()
await browser.close()
console.log('Explorer desktop/mobile and mocked AI smoke passed')
