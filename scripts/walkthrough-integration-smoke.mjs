import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const output = '/tmp/housing-walkthrough-integration'
const firstParcel = '0000000000000042'
const secondParcel = '0000000000000043'
const retrievedAt = '2026-09-27T14:00:00.000Z'
const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/3ioAAAAASUVORK5CYII=', 'base64')
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })

function candidate(parcelId) {
  return {
    parcelId,
    address: parcelId === firstParcel ? '42 EXAMPLE AVE' : '43 EXAMPLE AVE',
    city: 'PITTSBURGH',
    municipality: 'PITTSBURGH',
    zip: '15214',
  }
}

function parcelDetail(parcelId) {
  const record = candidate(parcelId)
  return {
    parcelId,
    assessment: {
      status: 'available', sourceDate: '2026-09-01', retrievedAt,
      sourceUrl: 'https://data.wprdc.org/dataset/property-assessments',
      record: { ...record, classification: 'RESIDENTIAL', useDescription: 'Residential', lotAreaSqFt: 2000, yearBuilt: null },
    },
    boundary: {
      status: 'available', sourceDate: null, retrievedAt,
      sourceUrl: 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0',
      sourceCrs: 'EPSG:4326', displayCrs: 'EPSG:4326', modifiedOn: null,
      geometry: { type: 'Polygon', coordinates: [[[-80.0100, 40.4500], [-80.0097, 40.4500], [-80.0097, 40.4503], [-80.0100, 40.4503], [-80.0100, 40.4500]]] },
    },
  }
}

function screeningResult(input) {
  const check = (id, label, status, reason, sourceUrl = null) => ({
    id, label, status, reason, sourceUrl, sourceDate: null, retrievedAt: sourceUrl ? retrievedAt : null,
  })
  return {
    status: 'pending', score: null, rubricVersion: 'synthetic-browser-v1',
    parcelId: input.parcelId, proposal: input.proposal, municipality: 'Pittsburgh',
    checks: [
      check('zoning-use', 'Bounded zoning use-table screen', 'screened_low_friction', 'Mapped residential district. Confirm current code, exceptions and lawful use with the City.', 'https://ecode360.com/45476538'),
      check('zoning-other', 'Other zoning requirements', 'unknown', 'Setbacks, lot coverage and exceptions need project-specific review.'),
      check('flood', 'Mapped flood hazard', 'error', 'FEMA flood layer could not be checked.', 'https://hazards.fema.gov/'),
      check('slope', 'Mapped 25 percent slope', 'mapped_flag', 'The parcel intersects a mapped slope feature. Confirm site conditions with a qualified professional.', 'https://services1.arcgis.com/'),
      check('undermining', 'Mapped undermining', 'unknown', 'Mine map evidence and site conditions remain unassessed.'),
      check('process', 'Review route and documents', 'unknown', 'Confirm the current City review route and required documents.'),
      check('infrastructure', 'Utility availability and capacity', 'unknown', 'Provider availability and capacity need direct confirmation.'),
    ],
    sourceObservations: [],
    nextActions: [
      'Ask a qualified site professional to review the mapped slope and planned ground disturbance.',
      'Confirm the current City review route and required documents.',
      'Request utility availability and capacity evidence from the actual provider.',
      'Establish project budget, rents or sales assumptions, and funding path; financial feasibility is unassessed.',
    ],
    retrievedAt,
    caveat: 'Development Ease Score withheld until all required rubric checks are assessed. No permission or financial feasibility determination.',
  }
}

async function storedDraft(page) {
  return page.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft())
}

async function searchAndConfirm(page, query, parcelId) {
  await page.getByLabel('Street address or parcel ID').fill(query)
  await page.getByTestId('property-search-button').click()
  await expect(page.getByTestId(`property-candidate-${parcelId}`)).toBeVisible()
  await page.getByTestId(`property-candidate-${parcelId}`).check()
  await page.getByTestId('property-confirm-button').click()
  await expect(page.getByTestId('property-summary')).toContainText(candidate(parcelId).address)
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
}

async function goToResults(page) {
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: /Confirm & prepare brief/ }).click()
  await expect(page.getByTestId('assessment-panel')).toBeVisible()
}

try {
  await mkdir(output, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const requests = { assist: 0, search: 0, parcel: 0, screening: 0 }
  let screeningMode = 'result'
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/assist') {
      requests.assist += 1
      await route.abort()
      return
    }
    if (url.pathname === '/api/property/search') {
      requests.search += 1
      const parcelId = url.searchParams.get('q')?.includes('43') ? secondParcel : firstParcel
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'candidates', candidates: [candidate(parcelId)], truncated: false, retrievedAt, sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', sourceDate: '2026-09-01' }) })
      return
    }
    if (url.pathname === '/api/property/parcel') {
      requests.parcel += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(parcelDetail(url.searchParams.get('pin'))) })
      return
    }
    if (url.pathname === '/api/screening/run') {
      requests.screening += 1
      if (screeningMode === 'error') {
        await route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"synthetic_source_failure"}' })
        return
      }
      const input = route.request().postDataJSON()
      assert.equal(typeof input.parcelId, 'string')
      assert.deepEqual(input.proposal, { activities: ['new_construction'], proposedHomes: 1, housingForm: 'detached', groundDisturbance: 'yes' })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(screeningResult(input)) })
      return
    }
    if (url.hostname.endsWith('tile.openstreetmap.org')) {
      await route.fulfill({ status: 200, contentType: 'image/png', body: tilePng })
      return
    }
    if (url.origin === new URL(origin).origin) {
      await route.continue()
      return
    }
    await route.abort()
  })

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(`${origin}/projects/new`)
  await expect(page.getByTestId('guided-workspace')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await searchAndConfirm(page, '42 Example Ave', firstParcel)
  const sources = page.getByTestId('property-source-results')
  await sources.locator('summary').click()
  await expect(sources).toContainText('Record found')
  await expect(sources).toContainText('Sep 1, 2026')
  await expect(sources).toContainText('Boundary found')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Describe the work in your own words').fill('Build one detached home on the confirmed parcel.')
  await page.getByLabel('New construction', { exact: true }).check()
  await page.getByRole('radio', { name: 'Detached' }).check()
  await page.getByRole('radio', { name: 'Yes' }).last().check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByText('Homes and community outcomes').click()
  await page.getByLabel('Proposed total homes').fill('1')
  await page.getByRole('group', { name: 'Expected rents, sales or completed value' }).getByRole('radio', { name: 'Yes' }).check()
  await page.getByRole('group', { name: 'A preliminary project budget' }).getByRole('radio', { name: 'Not yet' }).check()
  await page.getByRole('group', { name: 'A potential funding or subsidy path' }).getByRole('radio', { name: 'Not yet' }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Financial feasibility: Unassessed')).toBeVisible()
  await page.getByRole('button', { name: /Confirm & prepare brief/ }).click()

  const panel = page.getByTestId('assessment-panel')
  await expect(panel).toContainText('Ready to check')
  await expect(page.getByTestId('next-action-list')).toHaveCount(0)
  await page.getByTestId('run-assessment-button').click()
  await expect(panel).toContainText('Assessment incomplete')
  await expect(panel).toContainText('No Development Ease Score yet')
  await expect(panel).toContainText('Mapped 25 percent slope')
  await expect(panel).toContainText('The parcel intersects a mapped slope feature')
  await panel.getByText('Unknown and unfinished checks').click()
  await expect(panel).toContainText('FEMA flood layer could not be checked')
  await expect(panel).toContainText('Provider availability and capacity need direct confirmation')
  await panel.getByText('Screening source details').click()
  await expect(panel).toContainText('Rubric: synthetic-browser-v1')
  await expect(panel).toContainText('Source date: Unknown')
  await expect(panel).toContainText('Retrieved:')
  const actions = page.getByTestId('next-action-list')
  await expect(actions).toContainText('First action from these checks')
  await expect(actions).toContainText('Ask a qualified site professional')
  await actions.getByText('Other actions').click()
  await expect(actions).toContainText('Request utility availability and capacity evidence')
  await expect(actions).toContainText('Gather financial assumptions before further spending')
  await expect(actions).toContainText('preliminary project budget, funding or subsidy path')
  const visibleActions = await actions.locator('h2').allTextContents()
  assert.match(visibleActions[0], /Ask a qualified site professional/)
  assert.match(visibleActions[1], /Gather financial assumptions before further spending/)
  await expect(panel).not.toContainText(/\d+\s*[–-]\s*\d+\s*\/\s*100/)
  await page.screenshot({ path: `${output}/walkthrough-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(panel).toBeVisible()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile results must not overflow horizontally')
  await page.screenshot({ path: `${output}/walkthrough-mobile.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export project brief/ }).click()
  const download = await downloadPromise
  assert.equal(download.suggestedFilename(), '412-project-brief.md')
  const briefPath = `${output}/walkthrough-project-brief.md`
  await download.saveAs(briefPath)
  const brief = await readFile(briefPath, 'utf8')
  for (const expected of [firstParcel, 'Build one detached home', 'Incomplete, no Development Ease Score', 'Mapped 25 percent slope: mapped_flag', 'Mapped flood hazard: error', 'Utility availability and capacity: unknown', 'source date: Unknown', 'Ask a qualified site professional', 'Gather financial assumptions before further spending', 'preliminary project budget, funding or subsidy path']) assert.ok(brief.includes(expected), `Brief missing ${expected}`)
  const nextTasks = brief.split('## Next diligence tasks\n')[1]?.split('\n## ')[0]
  assert.ok(nextTasks, 'Brief must include a Next diligence tasks section')
  for (const [index, action] of visibleActions.entries()) assert.ok(nextTasks.includes(`${index + 1}. ${action}`), `Brief task ${index + 1} must match the visible action`)
  assert.equal((brief.match(/Gather financial assumptions before further spending/g) ?? []).length, 1, 'Tailored finance action must appear once in the brief')
  assert.doesNotMatch(brief, /Establish project budget, rents or sales assumptions, and funding path; financial feasibility is unassessed\./)
  assert.doesNotMatch(brief, /\b\d+\s*[–-]\s*\d+\s*\/\s*100\b/)
  assert.doesNotMatch(brief, /permission granted|approval probability/i)

  await expect.poll(async () => (await storedDraft(page))?.step).toBe(5)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Resume saved stage' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume saved stage' }).click()
  await expect(panel).toContainText('Ready to check')
  await expect(page.getByTestId('next-action-list')).toHaveCount(0)
  await expect(page.getByText('Build one detached home on the confirmed parcel.')).toBeVisible()

  await page.getByRole('button', { name: 'Change parcel' }).first().click()
  await expect(page.getByLabel('Street address or parcel ID')).toBeFocused()
  await expect.poll(async () => (await storedDraft(page))?.parcelId).toBeNull()
  await searchAndConfirm(page, '43 Example Ave', secondParcel)
  await expect.poll(async () => (await storedDraft(page))?.description).toBe('Build one detached home on the confirmed parcel.')
  await goToResults(page)
  await page.getByTestId('run-assessment-button').click()
  await expect(panel).toContainText('Assessment incomplete')
  await expect(page.getByTestId('next-action-list')).toBeVisible()
  await page.getByRole('button', { name: 'Edit proposal' }).click()
  await page.getByLabel('Describe the work in your own words').fill('Build one detached home with revised access.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: /Confirm & prepare brief/ }).click()
  await expect(panel).toContainText('Ready to check')
  await expect(page.getByTestId('next-action-list')).toHaveCount(0)
  screeningMode = 'error'
  await page.getByTestId('run-assessment-button').click()
  await expect(panel).toContainText('Checks unavailable')
  await expect(panel.getByRole('alert')).toContainText('Property checks could not run')
  await expect(page.getByTestId('next-action-list')).toHaveCount(0)
  await expect(panel).not.toContainText(/\d+\s*[–-]\s*\d+\s*\/\s*100/)
  await expect(page.getByText('Build one detached home with revised access.')).toBeVisible()
  screeningMode = 'result'
  await page.getByTestId('run-assessment-button').click()
  await expect(panel).toContainText('Assessment incomplete')
  await expect(page.getByTestId('next-action-list')).toBeVisible()
  await expect(page.getByText('Build one detached home with revised access.')).toBeVisible()
  assert.deepEqual(pageErrors, [], 'Walkthrough must not throw browser errors')
  assert.equal(requests.assist, 0, 'Walkthrough must not request paid AI')
  assert.deepEqual({ search: requests.search, parcel: requests.parcel, screening: requests.screening }, { search: 2, parcel: 2, screening: 4 })
  console.log(JSON.stringify({ result: 'passed', requests, screenshots: [`${output}/walkthrough-desktop.png`, `${output}/walkthrough-mobile.png`], briefPath, pageErrors }, null, 2))
  await context.close()
} finally {
  await browser.close()
}
