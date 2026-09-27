import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5202'
const output = process.env.DEMO_OUTPUT ?? '/tmp/housing-one-home-rehearsal'
const parcelId = '0042J00243000000'
const description = 'Build one detached home on this parcel, with ground work for the new building.'
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
  await page.getByLabel('Street address or parcel ID').fill(parcelId)
  await page.getByTestId('property-search-button').click()
  await page.getByTestId(`property-candidate-${parcelId}`).check()
  await page.getByTestId('property-confirm-button').click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Describe the work in your own words').fill(description)
  await page.getByLabel('New construction', { exact: true }).check()
  await page.getByRole('radio', { name: 'Detached / standalone', exact: true }).check()
  await page.getByLabel('Proposed total homes', { exact: true }).fill('1')
  await page.getByRole('group', { name: 'Will the work disturb the ground?' }).getByRole('radio', { name: 'Yes', exact: true }).check()
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
  if (result.score !== null || slope?.status !== 'screened_low_friction' || result.checks.find(check => check.id === 'zoning-use')?.metricScore?.value !== 2 || flood?.metricScore?.value !== 2) throw new Error('Live evidence changed. Review before recording; do not substitute a fixture.')
  await expect(page.getByTestId('assessment-panel')).toContainText('Screen score 2/2')
  const focused = result.oneHomeAssessment
  if (focused?.applicability !== 'applicable' || focused.mappedDistrict !== 'R1D-H' || focused.rule.status !== 'reviewed_baseline' || focused.recordedLotArea.status !== 'available' || focused.lotAreaComparison.baseMinimumSqFt !== 1200) throw new Error('One-home evidence unavailable or changed; inspect source results before recording.')
  await expect(page.getByTestId('assessment-panel')).toContainText('R1D-H')
  await expect(page.getByTestId('assessment-panel')).toContainText('1,200')
  await writeFile(`${output}/screening.json`, JSON.stringify(result, null, 2))
  await page.locator('.gp-one-home summary').click()
  await expect(page.locator('.gp-one-home table')).toContainText('Base maximum height')
  await expect(page.locator('.gp-one-home table')).toContainText('40 ft')
  await page.screenshot({ path: `${output}/02-results.png`, fullPage: true })
  const downloadReady = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export brief/ }).click()
  await (await downloadReady).saveAs(`${output}/project-brief.md`)
  const brief = await readFile(`${output}/project-brief.md`, 'utf8')
  if (!brief.includes('R1D-H') || !brief.includes('1200') && !brief.includes('1,200') || !brief.includes('ecode360.com/45474194')) throw new Error('Export omitted one-home evidence or provenance')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${output}/03-results-mobile.png`, fullPage: true })
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile horizontal overflow')
  await page.reload()
  await page.getByRole('button', { name: 'Resume saved stage' }).click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await expect(page.getByTestId('assessment-panel')).toContainText('Run public property checks')
  await expect(page.locator('.gp-result-proposal')).toContainText(description)
  if (errors.length || aiRequests) throw new Error(`browser_errors_${errors.length}_ai_requests_${aiRequests}`)
  const evidence = { status: 'passed', origin, parcelId, description, recordedAt: new Date().toISOString(), checks: result.checks.length, scoredMetrics: result.checks.filter(check => check.metricScore).map(check => check.id), slopeStatus: slope.status, sourceObservations: result.sourceObservations.length, oneHomeApplicability: focused.applicability, district: focused.mappedDistrict, recordedLotAreaSqFt: focused.recordedLotArea.sqFt, baseMinimumSqFt: focused.lotAreaComparison.baseMinimumSqFt, lotAreaComparison: focused.lotAreaComparison.status, cloudTested: false, aiTested: false, publicSourcesMocked: false, exportPassed: true, localResumePassed: true, pageErrors: errors.length }
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
  await context.close()
} finally {
  await browser.close()
}
