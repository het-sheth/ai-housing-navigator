import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const parcelId = '0046R00029000000'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
const screenshots = '/tmp/housing-guided-screening'

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  let assistantRequests = 0
  await context.route('**/api/assist', async route => { assistantRequests += 1; await route.abort() })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/projects/new`)
  await expect(page.getByTestId('guided-workspace')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Street address or parcel ID').fill('2003 Mountford Ave')
  await page.getByTestId('property-search-button').click()
  await expect(page.getByTestId(`property-candidate-${parcelId}`)).toBeVisible({ timeout: 20000 })
  await page.getByTestId(`property-candidate-${parcelId}`).check()
  await page.getByTestId('property-confirm-button').click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Describe the work in your own words').fill('Build one detached home.')
  await page.getByLabel('New construction', { exact: true }).check()
  await page.getByRole('radio', { name: 'Detached' }).check()
  await page.getByRole('radio', { name: 'Unknown' }).last().check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByText('Homes and community outcomes').click()
  await page.getByLabel('Proposed total homes').fill('1')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: /Confirm & prepare brief/ }).click()
  const panel = page.getByTestId('assessment-panel')
  await expect(panel).toContainText('Assessment incomplete')
  const screeningResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/screening/run')
  await page.getByTestId('run-assessment-button').click()
  const response = await screeningResponse
  assert.equal(response.status(), 200)
  const payload = await response.json()
  assert.equal(payload.parcelId, parcelId)
  assert.equal(payload.status, 'pending')
  assert.equal(payload.score, null)
  assert.deepEqual(payload.proposal, { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'unknown' })
  assert.ok(payload.checks.length > 0)
  assert.ok(payload.checks.every(check => !Object.hasOwn(check, 'points') && !Object.hasOwn(check, 'maxPoints')))
  await expect(panel).toContainText('No Development Ease Score yet.')
  await expect(panel).toContainText('Mapped 25 percent slope')
  await expect(panel).not.toContainText(/\d+\s*[–-]\s*\d+\s*\/\s*100/)
  const details = panel.getByText('Screening source details')
  await details.click()
  await expect(panel).toContainText('Source date: Unknown')
  await expect(panel).toContainText('Retrieved:')
  await mkdir(screenshots, { recursive: true })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
    await panel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`)
    await page.screenshot({ path: `${screenshots}/assessment-${width}.png`, fullPage: true })
  }
  await page.getByRole('button', { name: /back/i }).click()
  await page.getByRole('button', { name: /edit work/i }).click()
  await page.getByLabel('Describe the work in your own words').fill('Build one detached home with a revised scope.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: /Confirm & prepare brief/ }).click()
  await expect(panel).toContainText('Run checks when you are ready')
  await expect(panel).not.toContainText('Mapped 25 percent slope')
  await page.route('**/api/screening/run', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"synthetic_failure"}' }))
  await page.getByTestId('run-assessment-button').click()
  await expect(panel.getByRole('alert')).toContainText('Property checks could not run')
  await expect(page.getByTestId('next-action-list')).toBeVisible()
  await page.getByRole('button', { name: /back/i }).click()
  await expect(page.getByText('Build one detached home with a revised scope.')).toBeVisible()
  assert.equal(assistantRequests, 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ flow: 'live parcel, explicit proposal, pending property checks, edit invalidation, error retention', status: payload.status, score: payload.score, checks: payload.checks.length, assistantRequests, screenshots, errors }))
  await context.close()
} finally {
  await browser.close()
}
