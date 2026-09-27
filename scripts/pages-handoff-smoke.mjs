import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:4173'
const parcelId = '0046R00029000000'
const sourceUrl = 'https://example.org/public-record'
const retrievedAt = '2026-09-27T12:00:00Z'
const screenshots = '/tmp/housing-pages-integration'
const candidate = { parcelId, address: 'SYNTHETIC TEST PARCEL', city: 'PITTSBURGH', municipality: '25th Ward - PITTSBURGH', zip: '15217', recordedUse: 'VACANT LAND', sourceDate: '2026-09-01', matched: 'Assessment recorded use: VACANT LAND; Pittsburgh-labeled municipality' }
const candidates = { status: 'candidates', candidates: [candidate], truncated: false, retrievedAt, sourceUrl, sourceDate: '2026-09-01', coverage: 'Synthetic Pittsburgh-labeled assessment records.', unknowns: ['Confirmed City jurisdiction', 'Proposal suitability'] }
const detail = {
  parcelId,
  assessment: { status: 'available', record: { parcelId, address: candidate.address, city: 'Pittsburgh', municipality: candidate.municipality, zip: candidate.zip, classification: 'RESIDENTIAL', useDescription: candidate.recordedUse, lotAreaSqFt: 1620, yearBuilt: null }, sourceDate: '2026-09-01', retrievedAt, sourceUrl },
  boundary: { status: 'available', geometry: { type: 'Polygon', coordinates: [[[-80.0075, 40.4638], [-80.0076, 40.4638], [-80.0076, 40.4639], [-80.0075, 40.4638]]] }, sourceCrs: 'EPSG:4326', displayCrs: 'EPSG:4326', modifiedOn: null, sourceDate: null, retrievedAt, sourceUrl },
}
const screening = body => ({
  status: 'pending', score: null, rubricVersion: 'synthetic-test', parcelId: body.parcelId, proposal: body.proposal, municipality: 'Pittsburgh',
  checks: [{ id: 'flood', label: 'Flood', status: body.proposal.proposedHomes === 1 ? 'mapped_flag' : 'unknown', reason: body.proposal.proposedHomes === 1 ? 'Synthetic mapped flag' : 'Synthetic review needed', sourceUrl, sourceDate: null, retrievedAt }],
  nextActions: ['Review the synthetic flood finding'], retrievedAt, caveat: 'Synthetic incomplete public-record screen.',
})

async function run(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } })
  const calls = { ai: 0, candidates: 0, parcel: 0, screening: 0 }
  const errors = []
  await context.route('**/api/assist', route => { calls.ai += 1; return route.abort() })
  await context.route('**/api/property/candidates?**', route => {
    calls.candidates += 1
    assert.equal(new URL(route.request().url()).searchParams.get('use'), 'vacant_land')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(candidates) })
  })
  await context.route('**/api/property/parcel?**', route => {
    calls.parcel += 1
    assert.equal(new URL(route.request().url()).searchParams.get('pin'), parcelId)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) })
  })
  await context.route('**/api/screening/run', route => {
    calls.screening += 1
    const body = route.request().postDataJSON()
    assert.equal(body.parcelId, parcelId)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(screening(body)) })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/explore`)
  await expect(page.getByRole('heading', { name: 'Find a parcel to study.' })).toBeVisible()
  await page.getByLabel('What would you like to do?').fill('Build homes on a vacant lot')
  await page.getByLabel('New construction').check()
  await page.getByRole('button', { name: 'Confirm criteria and find records' }).click()
  await page.getByRole('radio', { name: /SYNTHETIC TEST PARCEL/ }).check()
  await page.getByRole('button', { name: `Inspect parcel ${parcelId}` }).click()
  await expect(page.getByText(`Selected parcel / ${parcelId}`)).toBeVisible()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  const compareLink = page.getByRole('link', { name: /Compare proposals on this parcel/ })
  await expect(compareLink).toHaveAttribute('href', `/compare?parcelId=${parcelId}`)
  await compareLink.click()
  await expect(page).toHaveURL(`${origin}/compare?parcelId=${parcelId}`)
  await expect(page.getByLabel('Parcel ID')).toHaveValue(parcelId)
  await expect(page.getByTestId('proposal-A')).toHaveCount(0)
  await expect(page.getByTestId('run-A')).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText('County observations loaded for this visit.')).toBeVisible()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  const a = page.getByTestId('proposal-A')
  const b = page.getByTestId('proposal-B')
  await a.getByLabel('New construction').check()
  await b.getByLabel('Addition', { exact: true }).check()
  await a.getByLabel('Proposed homes').fill('1')
  await b.getByLabel('Proposed homes').fill('2')
  await a.getByTestId('run-A').click()
  await b.getByTestId('run-B').click()
  await expect(a.getByTestId('result-A')).toContainText('Synthetic mapped flag')
  await expect(b.getByTestId('result-B')).toContainText('Synthetic review needed')
  await expect(page.getByTestId('comparison-differences')).toContainText('Returned finding differs')
  await expect(page.locator('body')).not.toContainText(/Development Ease Score: \d/)
  await a.getByLabel('What would you do here?').fill('A revised proposal')
  await expect(a.getByTestId('result-A')).toHaveCount(0)
  await expect(b.getByTestId('result-B')).toContainText('Synthetic review needed')
  await page.evaluate(() => document.fonts.ready)
  assert.equal(await page.evaluate(() => [...document.fonts].some(face => face.family === 'IBM Plex Sans' && face.status === 'loaded')), true, 'Production font did not load')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal overflow at ${width}px`)
  await page.screenshot({ path: `${screenshots}/handoff-${width}.png`, fullPage: true })
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Explore properties', exact: true }).click()
  await expect(page).toHaveURL(`${origin}/explore`)
  await expect(page.getByRole('heading', { name: 'Find a parcel to study.' })).toBeVisible()
  assert.deepEqual(calls, { ai: 0, candidates: 1, parcel: 2, screening: 2 })
  assert.deepEqual(errors, [])
  await context.close()
  return calls
}

await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
try {
  const desktop = await run(browser, 1440)
  const mobile = await run(browser, 390)
  console.log(JSON.stringify({ desktop, mobile, screenshots }))
} finally {
  await browser.close()
}
