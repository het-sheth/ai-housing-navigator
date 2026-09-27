import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5198'
const output = process.env.DEMO_OUTPUT ?? '/tmp/housing-video-rehearsal'
const parcelId = '0046R00029000000'
const description = 'Repair and remodel the existing home, with an interior conversion. Keep the total at one home and do not disturb the ground.'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
try {
  await mkdir(output, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true })
  let aiRequests = 0
  await context.route('**/api/assist', route => { aiRequests += 1; return route.abort() })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/projects/new`)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Street address or parcel ID').fill('2003 Mountford Ave')
  await page.getByTestId('property-search-button').click()
  await page.getByTestId(`property-candidate-${parcelId}`).check()
  await page.getByTestId('property-confirm-button').click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Describe the work in your own words').fill(description)
  await page.getByLabel('Repair/remodel', { exact: true }).check()
  await page.getByLabel('Interior conversion', { exact: true }).check()
  await page.getByLabel('Proposed total homes', { exact: true }).fill('1')
  await page.getByRole('group', { name: 'Will the work disturb the ground?' }).getByRole('radio', { name: 'No', exact: true }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Check your project' })).toBeVisible()
  await expect(page.locator('.gp-review')).toContainText('Inputs used by property checks')
  await page.screenshot({ path: `${output}/01-review.png`, fullPage: true })
  const responseReady = page.waitForResponse(r => new URL(r.url()).pathname === '/api/screening/run', { timeout: 60000 })
  await page.getByTestId('run-assessment-button').click()
  const response = await responseReady
  if (response.status() !== 200) throw new Error(`screening_http_${response.status()}`)
  const result = await response.json()
  const slope = result.checks.find(check => check.id === 'slope')
  const flood = result.checks.find(check => check.id === 'flood')
  if (result.score !== null || slope?.status !== 'mapped_flag' || !slope.reason.includes('ground disturbance is no') || flood?.metricScore?.value !== 2) throw new Error('Live evidence changed. Review before recording; do not substitute a fixture.')
  await expect(page.getByTestId('assessment-panel')).toContainText('Screen score 2/2')
  await expect(page.getByTestId('next-action-list')).toContainText('surveyor')
  await page.screenshot({ path: `${output}/02-results.png`, fullPage: true })
  const downloadReady = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export brief/ }).click()
  await (await downloadReady).saveAs(`${output}/project-brief.md`)
  await page.reload()
  await page.getByRole('button', { name: 'Resume saved stage' }).click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await expect(page.getByTestId('assessment-panel')).toContainText('Run public property checks')
  await expect(page.locator('.gp-result-proposal')).toContainText(description)
  if (errors.length || aiRequests) throw new Error(`browser_errors_${errors.length}_ai_requests_${aiRequests}`)
  const evidence = { status: 'passed', origin, parcelId, description, recordedAt: new Date().toISOString(), checks: result.checks.length, scoredMetrics: result.checks.filter(check => check.metricScore).map(check => check.id), slopeStatus: slope.status, sourceObservations: result.sourceObservations.length, cloudTested: false, aiTested: false, publicSourcesMocked: false, exportPassed: true, localResumePassed: true, pageErrors: errors.length }
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
  await context.close()
} finally {
  await browser.close()
}
