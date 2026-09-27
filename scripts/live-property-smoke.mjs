import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
const screenshots = '/tmp/housing-guided-live-property'
const parcelId = '0046R00029000000'
const address = '2003 MOUNTFORD AVE'

async function isolate(context, mode = 'live') {
  const appOrigin = new URL(origin).origin
  const state = { assistantRequests: 0, searchRequests: 0, parcelRequests: 0 }
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/assist') {
      state.assistantRequests += 1
      await route.abort()
      return
    }
    if (url.pathname === '/api/property/search') {
      state.searchRequests += 1
      if (mode === 'live') return route.continue()
      const query = url.searchParams.get('q') ?? ''
      if (mode === 'no-match') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'no_match', candidates: [], retrievedAt: new Date().toISOString() }) })
        return
      }
      if (mode === 'error') {
        await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ status: 'error', candidates: [], retrievedAt: new Date().toISOString(), message: 'Synthetic property lookup failure.' }) })
        return
      }
      if (mode === 'stale') {
        if (query.includes('First')) await new Promise(resolve => setTimeout(resolve, 700))
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'candidates', candidates: [{ parcelId: query.includes('First') ? '0000000000000001' : '0000000000000002', address: query.includes('First') ? 'FIRST RESULT RD' : 'SECOND RESULT RD', city: 'PITTSBURGH', municipality: '25th Ward - PITTSBURGH', zip: '15214' }], retrievedAt: new Date().toISOString(), sourceUrl: 'https://data.wprdc.org/dataset/property-assessments' }) })
        return
      }
      if (mode === 'confirm-race') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'candidates', candidates: ['0000000000000001', '0000000000000002'].map((id, index) => ({ parcelId: id, address: `CANDIDATE ${index + 1} RD`, city: 'PITTSBURGH', municipality: '25th Ward - PITTSBURGH', zip: '15214' })), retrievedAt: new Date().toISOString(), sourceUrl: 'https://data.wprdc.org/dataset/property-assessments' }) })
        return
      }
      if (mode === 'partial-source-failure') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'candidates', candidates: [{ parcelId: '0000000000000003', address: 'SYNTHETIC TEST RD', city: 'PITTSBURGH', municipality: 'Synthetic test municipality', zip: '15214' }], retrievedAt: new Date().toISOString(), sourceUrl: 'https://data.wprdc.org/dataset/property-assessments' }) })
        return
      }
    }
    if (url.pathname === '/api/property/parcel') {
      state.parcelRequests += 1
      if (mode === 'live') return route.continue()
      if (mode === 'confirm-race') await new Promise(resolve => setTimeout(resolve, 500))
      if (mode === 'partial-source-failure') {
        const retrievedAt = new Date().toISOString()
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ parcelId: '0000000000000003', assessment: { status: 'error', sourceDate: null, retrievedAt, sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', record: null }, boundary: { status: 'available', sourceDate: null, retrievedAt, sourceUrl: 'https://example.invalid/synthetic-boundary', sourceCrs: 'EPSG:4326', displayCrs: 'EPSG:4326', geometry: { type: 'Polygon', coordinates: [[[-80.01, 40.45], [-80.0101, 40.4501], [-80.0102, 40.45], [-80.01, 40.45]]] } } }) })
        return
      }
      if (mode === 'confirm-race') {
        const parcelId = url.searchParams.get('pin')
        const retrievedAt = new Date().toISOString()
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ parcelId, assessment: { status: 'available', sourceDate: '2026-09-01', retrievedAt, sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', record: { parcelId, address: 'CANDIDATE 1 RD', city: 'PITTSBURGH', municipality: '25th Ward - PITTSBURGH', zip: '15214', classification: 'RESIDENTIAL', useDescription: 'Residential', lotAreaSqFt: 1600, yearBuilt: null } }, boundary: { status: 'unavailable', sourceDate: null, retrievedAt, sourceUrl: 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0', geometry: null } }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ parcelId: url.searchParams.get('pin'), assessment: { status: 'unavailable', sourceDate: null, retrievedAt: new Date().toISOString(), sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', record: null }, boundary: { status: 'unavailable', sourceDate: null, retrievedAt: new Date().toISOString(), sourceUrl: 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0', geometry: null } }) })
      return
    }
    if (url.origin === appOrigin || url.hostname.endsWith('tile.openstreetmap.org')) {
      await route.continue()
      return
    }
    await route.abort()
  })
  return state
}

async function enterPropertyStep(page) {
  await page.goto(`${origin}/projects/new`)
  await expect(page.getByTestId('guided-workspace')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Start with a place.' })).toBeVisible()
}

async function search(page, query) {
  await page.getByLabel('Street address or parcel ID').fill(query)
  await page.getByTestId('property-search-button').click()
}

async function seedHistoricalLanark(page) {
  await page.evaluate(async () => {
    const { createDraft } = await import('/src/features/projects/contracts.ts')
    const { saveDraft } = await import('/src/features/projects/draft-store.ts')
    const draft = createDraft()
    draft.propertyQuery = '1623 LANARK ST, PITTSBURGH, PA 15214'
    draft.parcelId = '0023C00208000000'
    draft.propertyConfirmed = true
    draft.propertyEvidence = 'historical'
    await saveDraft(draft)
  })
  await page.reload()
}

async function visibleLoadedTiles(map) {
  return map.locator('img.leaflet-tile').evaluateAll(images => {
    const bounds = document.querySelector('.leaflet-container')?.getBoundingClientRect()
    if (!bounds) return 0
    return images.filter(image => {
      if (!image.complete || image.naturalWidth === 0) return false
      const tile = image.getBoundingClientRect()
      return tile.right > bounds.left && tile.left < bounds.right && tile.bottom > bounds.top && tile.top < bounds.bottom
    }).length
  })
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const network = await isolate(context)

  await enterPropertyStep(page)
  await expect(page.getByLabel('Street address or parcel ID')).toHaveValue('')
  await expect(page.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
  await search(page, '2003 Mountford Ave')
  const status = page.getByTestId('property-search-status')
  await expect(status).toContainText(/choose your parcel/i, { timeout: 20000 })
  await expect(page.getByTestId(`property-candidate-${parcelId}`)).toBeVisible()
  const map = page.getByTestId('site-context-map')
  await expect(map).toBeVisible()
  await expect(page.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
  await page.getByTestId(`property-candidate-${parcelId}`).click()
  await expect(page.getByTestId('property-confirm-button')).toBeVisible()
  await expect(page.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
  const confirmationStartedAt = Date.now()
  await page.getByTestId('property-confirm-button').click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible({ timeout: 20000 })
  await expect(page.getByTestId('site-map-parcel-boundary')).toHaveAttribute('aria-label', /live allegheny county parcel boundary/i)
  const propertySummary = page.getByTestId('property-summary')
  await expect(propertySummary).toContainText(address)
  await expect(propertySummary).toContainText('1,620 sq ft')
  const sourceResults = page.getByTestId('property-source-results')
  await expect(sourceResults).toBeVisible()
  await expect(sourceResults).not.toHaveAttribute('open', '')
  await sourceResults.locator('summary').click()
  await expect(sourceResults).toContainText('Record found')
  await expect(sourceResults.locator('time').nth(0)).toHaveAttribute('datetime', '2026-09-01')
  await expect(sourceResults.locator('time').nth(0)).toHaveText('Sep 1, 2026')
  const retrievedAt = Date.parse(await sourceResults.locator('time').nth(1).getAttribute('datetime'))
  assert.ok(Number.isFinite(retrievedAt) && retrievedAt >= confirmationStartedAt && retrievedAt <= Date.now(), 'Retrieval timestamp must fall within this confirmation request')
  await expect.poll(async () => await page.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => draft?.parcelId))).toBe(parcelId)
  await page.reload()
  await expect(page.getByTestId('guided-workspace')).toBeVisible()
  await expect(page.getByLabel('Street address or parcel ID')).toHaveValue('2003 Mountford Ave')
  await expect(page.getByTestId('property-source-results')).toBeVisible({ timeout: 20000 })
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible({ timeout: 20000 })
  const refreshedSources = page.getByTestId('property-source-results')
  await refreshedSources.locator('summary').click()
  await expect(refreshedSources.locator('time').nth(0)).toHaveAttribute('datetime', '2026-09-01')
  await page.route('**/api/property/parcel?**', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"synthetic_refresh_failure"}' }))
  await page.getByRole('button', { name: 'Refresh records' }).click()
  await expect(page.locator('.gp-map-context').getByRole('alert')).toContainText('Parcel refresh failed')
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await page.reload()
  await expect(page.locator('.gp-map-context')).toContainText(`Parcel ${parcelId} saved`)
  await expect(page.locator('.gp-map-context').getByRole('alert')).toContainText('The saved parcel map could not load')
  await expect(page.locator('.gp-map-context').getByRole('button', { name: 'Retry current records' })).toBeVisible()
  await page.unroute('**/api/property/parcel?**')
  await page.locator('.gp-map-context').getByRole('button', { name: 'Retry current records' }).click()
  await expect(page.getByTestId('site-map-parcel-boundary')).toBeVisible({ timeout: 20000 })
  assert.equal(network.searchRequests, 1)
  assert.equal(network.parcelRequests, 3)
  assert.equal(network.assistantRequests, 0)
  assert.deepEqual(pageErrors, [])

  await mkdir(screenshots, { recursive: true })
  const widths = {}
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
    await map.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await expect.poll(() => visibleLoadedTiles(map), { timeout: 15000 }).toBeGreaterThan(0)
    const metrics = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
    metrics.horizontalOverflow = metrics.documentWidth > metrics.width
    metrics.visibleTiles = await visibleLoadedTiles(map)
    assert.equal(metrics.horizontalOverflow, false, `Horizontal overflow at ${width}px`)
    widths[width] = metrics
    await page.screenshot({ path: `${screenshots}/confirmed-live-parcel-${width}.png`, fullPage: true })
  }
  console.log(JSON.stringify({ flow: 'live search, explicit candidate selection and confirmation, actual parcel boundary, current assessment observation', parcelId, searchRequests: network.searchRequests, parcelRequests: network.parcelRequests, assistantRequests: network.assistantRequests, viewportMetrics: widths, screenshots, pageErrors }, null, 2))
  await context.close()

  for (const mode of ['no-match', 'error', 'stale', 'confirm-race', 'partial-source-failure']) {
    const mockedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const mockedPage = await mockedContext.newPage()
    const mockedErrors = []
    mockedPage.on('pageerror', error => mockedErrors.push(error.message))
    const mockedNetwork = await isolate(mockedContext, mode)
    await enterPropertyStep(mockedPage)
    if (mode === 'no-match') {
      await search(mockedPage, 'No Such Parcel Road')
      await expect(mockedPage.getByTestId('property-search-status')).toContainText(/no exact match|not found/i)
      await expect(mockedPage.getByTestId('property-confirm-button')).toHaveCount(0)
      await expect(mockedPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
    } else if (mode === 'error') {
      await search(mockedPage, '2003 Mountford Ave')
      await expect(mockedPage.getByRole('alert')).toContainText(/property search could not load/i)
      await expect(mockedPage.getByTestId('property-confirm-button')).toHaveCount(0)
      await expect(mockedPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
    } else if (mode === 'stale') {
      await mockedPage.getByLabel('Street address or parcel ID').fill('First result street')
      const firstSearch = mockedPage.getByTestId('property-search-button').click()
      await mockedPage.getByLabel('Street address or parcel ID').fill('Second result street')
      await mockedPage.getByTestId('property-search-button').click()
      await firstSearch
      await expect(mockedPage.getByTestId('property-candidate-0000000000000002')).toBeVisible()
      await expect(mockedPage.getByTestId('property-candidate-0000000000000001')).toHaveCount(0)
      await expect(mockedPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
    } else if (mode === 'confirm-race') {
      await search(mockedPage, 'Two candidate race')
      const firstCandidate = mockedPage.getByTestId('property-candidate-0000000000000001')
      const secondCandidate = mockedPage.getByTestId('property-candidate-0000000000000002')
      await firstCandidate.check()
      await mockedPage.getByTestId('property-confirm-button').click()
      await expect(firstCandidate).toBeDisabled()
      await expect(secondCandidate).toBeDisabled()
      const sources = mockedPage.getByTestId('property-source-results')
      await sources.locator('summary').click()
      await expect(sources).toContainText('0000000000000001')
      await expect(mockedPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
      await expect.poll(async () => await mockedPage.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => draft?.parcelId))).toBe('0000000000000001')
      await mockedPage.route('**/api/property/parcel?**', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"synthetic_refresh_failure"}' }))
      await mockedPage.getByRole('button', { name: 'Refresh records' }).click()
      const mapAlert = mockedPage.locator('.gp-map-context').getByRole('alert')
      await expect(mapAlert).toContainText('Parcel refresh failed')
      await expect(mapAlert).not.toContainText('last loaded boundary')
      await expect(mockedPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
    } else {
      await search(mockedPage, 'Synthetic Test Road')
      await mockedPage.getByTestId('property-candidate-0000000000000003').check()
      await mockedPage.getByTestId('property-confirm-button').click()
      const sources = mockedPage.getByTestId('property-source-results')
      await sources.locator('summary').click()
      await expect(sources).toContainText('Source error')
      await expect(sources).toContainText('Boundary found')
      await expect(sources).toContainText('Unknown')
      await expect(mockedPage.getByTestId('site-map-parcel-boundary')).toBeVisible()
    }
    assert.equal(mockedNetwork.assistantRequests, 0, `${mode} check must not call AI`)
    assert.deepEqual(mockedErrors, [], `${mode} state should not throw browser errors`)
    await mockedContext.close()
  }
  console.log('Isolated synthetic no-match, search error, stale response, confirmation lock, and assessment-error/boundary-available states passed')

  const switchContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const switchPage = await switchContext.newPage()
  const switchErrors = []
  switchPage.on('pageerror', error => switchErrors.push(error.message))
  const switchNetwork = await isolate(switchContext, 'stale')
  await switchPage.goto(`${origin}/projects/new`)
  await expect(switchPage.getByTestId('guided-workspace')).toBeVisible()
  await seedHistoricalLanark(switchPage)
  await switchPage.getByRole('button', { name: 'Continue' }).click()
  await switchPage.getByTestId('change-parcel-button').click()
  await switchPage.getByLabel('Street address or parcel ID').fill('First result street')
  await switchPage.getByTestId('property-search-button').click()
  await expect(switchPage.getByTestId('property-search-button')).toHaveText('Searching…')
  await switchPage.getByRole('button', { name: '← Back' }).click()
  const switchProjects = switchPage.getByTestId('projects-control')
  await switchProjects.locator('summary').click()
  await switchPage.getByRole('button', { name: 'Start new project' }).click()
  await expect(switchPage.getByLabel('Street address or parcel ID')).toHaveCount(0)
  await switchPage.waitForTimeout(850)
  await expect(switchPage.getByTestId('property-search-status')).toHaveCount(0)
  await expect(switchPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
  await expect.poll(async () => await switchPage.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => ({ propertyQuery: draft?.propertyQuery, parcelId: draft?.parcelId })))).toEqual({ propertyQuery: '', parcelId: null })
  assert.equal(switchNetwork.searchRequests, 1)
  assert.equal(switchNetwork.parcelRequests, 0)
  assert.equal(switchNetwork.assistantRequests, 0)
  assert.deepEqual(switchErrors, [])
  await switchContext.close()
  console.log('Switching to a blank project while a delayed property search is pending discards the stale response')

  const resumedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const resumedPage = await resumedContext.newPage()
  const resumedNetwork = await isolate(resumedContext, 'stale')
  await resumedPage.goto(`${origin}/projects/new`)
  await expect(resumedPage.getByTestId('guided-workspace')).toBeVisible()
  await resumedPage.evaluate(async () => {
    const { createDraft } = await import('/src/features/projects/contracts.ts')
    const { saveDraft } = await import('/src/features/projects/draft-store.ts')
    const draft = createDraft()
    draft.step = 5
    draft.description = 'Retained proposal from saved results'
    draft.propertyQuery = 'Saved query road'
    draft.parcelId = '0000000000000001'
    draft.propertyConfirmed = true
    draft.propertyEvidence = 'live'
    await saveDraft(draft)
  })
  await resumedPage.reload()
  await expect(resumedPage.getByRole('heading', { name: 'What brings you here?' })).toBeVisible()
  await expect(resumedPage.getByRole('button', { name: 'Resume saved stage' })).toBeVisible()
  await expect.poll(async () => await resumedPage.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => draft?.step))).toBe(5)
  await resumedPage.getByRole('button', { name: 'Resume saved stage' }).click()
  await expect(resumedPage.getByRole('heading', { name: 'What the checks found' })).toBeVisible()
  await expect(resumedPage.getByTestId('next-action-list')).toHaveCount(0)
  await resumedPage.getByRole('button', { name: 'Edit proposal' }).click()
  await expect(resumedPage.getByLabel('Describe the work in your own words')).toHaveValue('Retained proposal from saved results')
  await resumedPage.getByLabel('Describe the work in your own words').fill('Updated proposal after resume')
  await resumedPage.getByRole('button', { name: 'Continue' }).click()
  await resumedPage.getByRole('button', { name: 'Continue' }).click()
  await expect(resumedPage.getByRole('heading', { name: 'Check your project' })).toBeVisible()
  await resumedPage.getByRole('button', { name: 'Change parcel' }).click()
  await expect(resumedPage.getByLabel('Street address or parcel ID')).toBeFocused()
  await expect(resumedPage.getByLabel('Street address or parcel ID')).toHaveValue('Saved query road')
  await expect(resumedPage.locator('.gp-site')).not.toHaveClass(/is-selected/)
  await expect.poll(async () => await resumedPage.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => ({ parcelId: draft?.parcelId, confirmed: draft?.propertyConfirmed, evidence: draft?.propertyEvidence, description: draft?.description })))).toEqual({ parcelId: null, confirmed: false, evidence: null, description: 'Updated proposal after resume' })
  assert.equal(resumedNetwork.assistantRequests, 0)
  await resumedContext.close()
  console.log('Saved results require explicit resume without losing the stored stage or proposal')

  const savedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const savedPage = await savedContext.newPage()
  const savedErrors = []
  savedPage.on('pageerror', error => savedErrors.push(error.message))
  const savedNetwork = await isolate(savedContext)
  await savedPage.goto(`${origin}/projects/new`)
  await expect(savedPage.getByTestId('guided-workspace')).toBeVisible()
  await seedHistoricalLanark(savedPage)
  await expect(savedPage.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await expect(savedPage.getByText('Historical Lanark outline', { exact: true })).toBeVisible()
  const savedProjects = savedPage.getByTestId('projects-control')
  await savedProjects.locator('summary').click()
  await savedPage.getByRole('button', { name: 'Start new project' }).click()
  await expect(savedPage.getByLabel('Street address or parcel ID')).toHaveCount(0)
  await expect(savedProjects).toBeVisible()
  await expect(savedPage.getByTestId('site-map-parcel-boundary')).toHaveCount(0)
  await expect.poll(async () => await savedPage.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => ({ propertyQuery: draft?.propertyQuery, parcelId: draft?.parcelId, propertyConfirmed: draft?.propertyConfirmed })))).toEqual({ propertyQuery: '', parcelId: null, propertyConfirmed: false })
  await savedPage.getByRole('button', { name: /Restore 1623 LANARK ST/ }).click()
  await expect(savedPage.getByTestId('site-map-parcel-boundary')).toBeVisible()
  await expect(savedPage.getByText('Historical Lanark outline', { exact: true })).toBeVisible()
  await expect.poll(async () => await savedPage.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft().then(draft => ({ parcelId: draft?.parcelId, propertyEvidence: draft?.propertyEvidence })))).toEqual({ parcelId: '0023C00208000000', propertyEvidence: 'historical' })
  assert.equal(savedNetwork.searchRequests, 0)
  assert.equal(savedNetwork.parcelRequests, 0)
  assert.equal(savedNetwork.assistantRequests, 0)
  assert.deepEqual(savedErrors, [])
  await savedContext.close()
  console.log('Saved Lanark restoration and blank start-new flow passed in isolated IndexedDB; no draft data was removed')
} finally {
  await browser.close()
}
