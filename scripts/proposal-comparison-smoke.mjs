import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const parcelId = '0046R00029000000'
const otherParcel = '0046R00029000001'
const screenshots = '/tmp/housing-proposal-comparison'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })

const detail = id => ({
  parcelId: id,
  assessment: { status: 'available', record: { parcelId: id, address: '2003 Mountford Ave', city: 'Pittsburgh', municipality: 'Pittsburgh', zip: '15217', classification: 'RESIDENTIAL', useDescription: 'Single family', lotAreaSqFt: 1620, yearBuilt: 1920 }, sourceDate: '2026-09-01', retrievedAt: '2026-09-27T10:00:00Z', sourceUrl: 'https://example.org/assessment' },
  boundary: { status: 'available', geometry: { type: 'Polygon', coordinates: [[[-79.94, 40.43], [-79.939, 40.43], [-79.939, 40.431], [-79.94, 40.431], [-79.94, 40.43]]] }, sourceCrs: 'EPSG:4326', displayCrs: 'EPSG:4326', modifiedOn: null, sourceDate: null, retrievedAt: '2026-09-27T10:00:00Z', sourceUrl: 'https://example.org/boundary' },
})
const screening = body => ({
  status: 'pending', score: null, rubricVersion: 'test', parcelId: body.parcelId, proposal: body.proposal, municipality: 'Pittsburgh',
  checks: [{ id: 'flood', label: 'Flood', status: body.proposal.proposedHomes === 1 ? 'mapped_flag' : 'unknown', reason: body.parcelId === otherParcel ? 'Other parcel finding' : body.proposal.proposedHomes === 1 ? 'Mapped flood finding' : 'Needs review', sourceUrl: 'https://example.org/flood', sourceDate: null, retrievedAt: body.parcelId === otherParcel ? '2026-09-28T10:00:00Z' : '2026-09-27T10:00:00Z' }],
  nextActions: ['Ask the County about flood mapping'], retrievedAt: body.parcelId === otherParcel ? '2026-09-28T10:00:00Z' : '2026-09-27T10:00:00Z', caveat: 'Incomplete public-record screen.',
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  let assistantRequests = 0
  let screeningCalls = 0
  let failNext = false
  let failPropertyNext = false
  let holdNext = false
  let releaseHeld = null
  await context.route('**/api/assist', route => { assistantRequests += 1; return route.abort() })
  await context.route('**/api/property/parcel?**', async route => {
    const id = new URL(route.request().url()).searchParams.get('pin')
    await new Promise(resolve => setTimeout(resolve, 60))
    if (failPropertyNext) { failPropertyNext = false; return route.fulfill({ status: 502, body: '{}' }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail(id)) })
  })
  await context.route('**/api/screening/run', route => {
    screeningCalls += 1
    if (failNext) { failNext = false; return route.fulfill({ status: 502, body: '{}' }) }
    if (holdNext) {
      holdNext = false
      return new Promise(resolve => {
        releaseHeld = async () => {
          try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(screening(route.request().postDataJSON())) }) } catch { /* Browser request was canceled by the edit. */ }
          resolve()
        }
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(screening(route.request().postDataJSON())) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/compare?parcelId=${parcelId}`)
  await expect(page.getByRole('heading', { name: 'Compare what the evidence says.' })).toBeVisible()
  await expect(page.getByLabel('Parcel ID')).toHaveValue(parcelId)
  await expect(page.getByTestId('proposal-A')).toHaveCount(0)
  await expect(page.getByTestId('result-A')).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText('County observations loaded for this visit.')).toBeVisible()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  const a = page.getByTestId('proposal-A')
  const b = page.getByTestId('proposal-B')
  await a.getByLabel('New construction').check()
  await b.getByLabel('New construction').check()
  await a.getByLabel('Proposed homes').fill('1')
  await b.getByLabel('Proposed homes').fill('2')
  await a.getByTestId('run-A').click()
  await b.getByTestId('run-B').click()
  await expect(a.getByTestId('result-A')).toContainText('Mapped flood finding')
  await expect(b.getByTestId('result-B')).toContainText('Needs review')
  await expect(page.getByTestId('comparison-differences')).toContainText('Returned finding differs')
  await expect(page.getByTestId('comparison-differences')).toContainText('Proposed homes')
  await expect(page.getByTestId('comparison-differences')).toContainText('These are your plans and assumptions')
  await expect(page.getByTestId('comparison-differences')).toContainText('Ask the County about flood mapping')
  await expect(page.locator('body')).not.toContainText(/Development Ease Score: \d/)
  await mkdir(screenshots, { recursive: true })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
    await page.waitForTimeout(200)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`)
    await page.screenshot({ path: `${screenshots}/comparison-${width}.png`, fullPage: true })
  }
  failNext = true
  await a.getByTestId('run-A').click()
  await expect(a.getByRole('alert')).toContainText('prior result')
  await expect(a.getByTestId('result-A')).toContainText('Mapped flood finding')
  await a.getByLabel('What would you do here?').fill('Revised plan')
  await expect(a.getByTestId('result-A')).toHaveCount(0)
  await expect(b.getByTestId('result-B')).toBeVisible()
  holdNext = true
  await a.getByTestId('run-A').click()
  await expect.poll(() => releaseHeld !== null).toBe(true)
  await a.getByLabel('What would you do here?').fill('Revised plan again')
  await releaseHeld()
  await expect(a.getByTestId('result-A')).toHaveCount(0)
  await page.reload()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Revised plan again')
  await expect(b.getByTestId('result-B')).toContainText('Needs review')
  await expect(page.locator('.gp-aside')).toContainText(`Parcel ${parcelId} saved`)
  failPropertyNext = true
  await page.locator('.gp-aside').getByRole('button', { name: 'Load current records' }).click()
  await expect(page.locator('.gp-aside')).toContainText('County parcel records could not load')
  await expect(page.locator('.gp-aside')).toContainText(`Parcel ${parcelId} saved`)
  await page.locator('.gp-aside').getByRole('button', { name: 'Retry current records' }).click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await page.evaluate(() => {
    window.__comparisonOriginalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError') }
  })
  await a.getByLabel('What would you do here?').fill('Unsaved after quota')
  await expect(page.getByRole('alert')).toContainText('Device storage is unavailable')
  await page.getByRole('button', { name: 'Load current parcel records' }).click()
  await expect(page.getByRole('button', { name: 'Checking County records…' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load current parcel records' })).toBeVisible()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Unsaved after quota')
  await expect(b.getByTestId('result-B')).toContainText('Needs review')
  await page.getByLabel('Parcel ID').fill(otherParcel)
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText(`Saved parcel ${otherParcel}.`)).toBeVisible()
  await a.getByLabel('What would you do here?').fill('Other parcel A')
  await b.getByLabel('What would you do here?').fill('Other parcel B')
  await b.getByLabel('New construction').check()
  await b.getByLabel('Proposed homes').fill('2')
  await b.getByTestId('run-B').click()
  await expect(b.getByTestId('result-B')).toContainText('Other parcel finding')
  await expect(b.getByTestId('result-B')).toContainText('9/28/2026')
  await page.getByLabel('Parcel ID').fill(parcelId)
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText(`Saved parcel ${parcelId}.`)).toBeVisible()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Unsaved after quota')
  await expect(b.getByTestId('result-B')).toContainText('Needs review')
  await expect(b.getByTestId('result-B')).toContainText('9/27/2026')
  await page.getByLabel('Parcel ID').fill(otherParcel)
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText(`Saved parcel ${otherParcel}.`)).toBeVisible()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Other parcel A')
  await expect(b.getByLabel('What would you do here?')).toHaveValue('Other parcel B')
  await expect(b.getByTestId('result-B')).toContainText('Other parcel finding')
  await expect(b.getByTestId('result-B')).toContainText('9/28/2026')
  await page.getByLabel('Parcel ID').fill(parcelId)
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText(`Saved parcel ${parcelId}.`)).toBeVisible()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Unsaved after quota')
  await page.evaluate(() => { Storage.prototype.setItem = window.__comparisonOriginalSetItem })
  await a.getByLabel('What would you do here?').fill('Saved after quota')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.evaluate(id => { localStorage.setItem(`housing-navigator-comparison-v1:${encodeURIComponent(id)}`, '{broken') }, parcelId)
  await page.getByRole('button', { name: 'Load current parcel records' }).click()
  await expect(page.getByRole('button', { name: 'Checking County records…' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load current parcel records' })).toBeVisible()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Saved after quota')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByLabel('Parcel ID').fill(otherParcel)
  await expect(page.getByTestId('run-B')).toBeDisabled()
  await page.getByRole('button', { name: 'Confirm parcel' }).click()
  await expect(page.getByText(`Saved parcel ${otherParcel}.`)).toBeVisible()
  await expect(a.getByLabel('What would you do here?')).toHaveValue('Other parcel A')
  await expect(b.getByLabel('What would you do here?')).toHaveValue('Other parcel B')
  await expect(b.getByTestId('result-B')).toContainText('Other parcel finding')
  await expect(b.getByTestId('result-B')).toContainText('9/28/2026')
  assert.equal(assistantRequests, 0)
  assert.equal(screeningCalls, 5)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ flow: 'confirmed parcel, A/B screens, failed refresh, edit, reload and cached parcel return', screeningCalls, assistantRequests, screenshots, errors }))
  await context.close()
} finally {
  await browser.close()
}
