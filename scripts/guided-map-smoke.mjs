import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const liveTiles = process.argv.includes('--live-tiles')
const tilePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/3ioAAAAASUVORK5CYII=', 'base64')
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
const screenshots = '/tmp/housing-guided-map'

async function installNetworkGuards(page, initialTileMode = 'success') {
  let tileMode = initialTileMode
  const state = { assistantRequests: 0, tileRequests: 0 }
  const appOrigin = new URL(origin).origin
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/assist') {
      state.assistantRequests += 1
      await route.abort()
      return
    }
    if (url.hostname.endsWith('tile.openstreetmap.org')) {
      state.tileRequests += 1
      if (liveTiles) {
        await route.continue()
      } else if (tileMode === 'failure') {
        await route.fulfill({ status: 503, contentType: 'text/plain', body: 'synthetic tile failure' })
      } else {
        await route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: tilePng })
      }
      return
    }
    if (url.origin === appOrigin) {
      await route.continue()
      return
    }
    await route.abort()
  })
  return { state, setTileMode: mode => { tileMode = mode } }
}

async function loadedTiles(map) {
  return map.locator('img.leaflet-tile').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth > 0).length)
}

async function tileUrls(map) {
  return map.locator('img.leaflet-tile').evaluateAll(images => images.map(image => image.src).sort())
}

async function storedDraft(page) {
  return page.evaluate(async () => (await import('/src/features/projects/draft-store.ts')).loadDraft())
}

async function enterPropertyStep(page) {
  await page.goto(`${origin}/projects/new`)
  await expect(page.getByTestId('guided-workspace')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Start with a place.' })).toBeVisible()
}

async function seedLanark(page) {
  await page.evaluate(async () => {
    const { createDraft } = await import('/src/features/projects/contracts.ts')
    const { saveDraft } = await import('/src/features/projects/draft-store.ts')
    const draft = createDraft()
    draft.step = 1
    draft.propertyQuery = '1623 LANARK ST, PITTSBURGH, PA 15214'
    draft.parcelId = '0023C00208000000'
    draft.propertyConfirmed = true
    draft.propertyEvidence = 'historical'
    await saveDraft(draft)
  })
  await page.reload()
}

try {
  if (liveTiles) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const network = await installNetworkGuards(page)
    await page.goto(`${origin}/projects/new`)
    await expect(page.getByTestId('guided-workspace')).toBeVisible()
    await page.evaluate(async () => {
      const { createDraft } = await import('/src/features/projects/contracts.ts')
      const { saveDraft } = await import('/src/features/projects/draft-store.ts')
      const draft = createDraft()
      draft.step = 1
      draft.propertyQuery = '0042 Example Avenue'
      await saveDraft(draft)
    })
    await page.reload()
    const map = page.getByTestId('site-context-map')
    await expect(map).toBeVisible()
    await expect.poll(() => loadedTiles(map), { timeout: 15000 }).toBeGreaterThan(0)
    await expect(page.locator('.gp-site.is-selected')).toHaveCount(0)
    await expect(map.locator('.leaflet-control-attribution')).toBeVisible()
    await mkdir(screenshots, { recursive: true })
    const viewports = {}
    const visibleTileCount = () => map.locator('img.leaflet-tile').evaluateAll(images => {
      const bounds = document.querySelector('.leaflet-container').getBoundingClientRect()
      return images.filter(image => {
        if (!image.complete || image.naturalWidth === 0) return false
        const tile = image.getBoundingClientRect()
        return tile.right > bounds.left && tile.left < bounds.right && tile.bottom > bounds.top && tile.top < bounds.bottom
      }).length
    })
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await expect.poll(visibleTileCount, { timeout: 8000 }).toBeGreaterThan(0)
      const metrics = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))
      metrics.horizontalOverflow = metrics.documentWidth > metrics.width
      metrics.visibleTiles = await visibleTileCount()
      viewports[width] = metrics
      await page.screenshot({ path: `${screenshots}/live-tiles-${width}.png`, fullPage: true })
    }
    assert.equal(network.state.assistantRequests, 0)
    assert.deepEqual(errors, [])
    assert.ok(Object.values(viewports).every(viewport => !viewport.horizontalOverflow))
    console.log(JSON.stringify({ liveTileImages: await loadedTiles(map), assistantRequests: network.state.assistantRequests, pageErrors: errors, viewports }, null, 2))
    await context.close()
  } else {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const network = await installNetworkGuards(page)
    await enterPropertyStep(page)
    const map = page.getByTestId('site-context-map')
    await expect(map).toBeVisible({ timeout: 2500 })
    await expect.poll(() => loadedTiles(map), { timeout: 8000 }).toBeGreaterThan(0)
    await expect(map.locator('.leaflet-control-attribution')).toBeVisible()
    await expect(map.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
    const overviewTiles = await tileUrls(map)
    const property = page.getByLabel('Street address or parcel ID')
    await property.fill('0042 Example Avenue')
    await expect(page.getByText(/property unresolved until you search and confirm/i)).toBeVisible()
    await expect(page.locator('.gp-site.is-selected')).toHaveCount(0)
    assert.deepEqual(await tileUrls(map), overviewTiles, 'An unknown address must not geocode or move the map')
    assert.equal(network.state.tileRequests > 0, true)

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'What do you have in mind?' })).toBeVisible()
    const description = 'Repair the existing house, with a possible addition.'
    await page.getByLabel('Describe the work in your own words').fill(description)
    await page.getByLabel('Repair/remodel', { exact: true }).check()
    await page.getByRole('button', { name: 'Mark Addition as tentative' }).click()
    await expect.poll(() => storedDraft(page)).toMatchObject({ description, activities: ['repair_remodel'], tentativeActivities: ['addition'] })
    await expect(map).toBeVisible()
    const beforeZoom = await tileUrls(map)
    await map.locator('.leaflet-control-zoom-in').click()
    await expect.poll(() => tileUrls(map), { timeout: 5000 }).not.toEqual(beforeZoom)
    const beforePan = await tileUrls(map)
    const bounds = await map.boundingBox()
    assert.ok(bounds)
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + 70, bounds.y + bounds.height / 2 + 35, { steps: 5 })
    await page.mouse.up()
    await expect.poll(() => tileUrls(map), { timeout: 5000 }).not.toEqual(beforePan)
    assert.deepEqual(await storedDraft(page).then(draft => ({ description: draft.description, activities: draft.activities, tentativeActivities: draft.tentativeActivities })), { description, activities: ['repair_remodel'], tentativeActivities: ['addition'] }, 'Map navigation must preserve manual proposal choices')
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await expect(map).toBeVisible()
      const metrics = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
      assert.ok(metrics.documentWidth <= metrics.width, `Horizontal overflow at ${width}px: ${metrics.documentWidth}px`)
    }
    assert.equal(network.state.assistantRequests, 0)
    assert.deepEqual(errors, [])
    await context.close()

    const selectedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const selectedPage = await selectedContext.newPage()
    const selectedErrors = []
    selectedPage.on('pageerror', error => selectedErrors.push(error.message))
    const selectedNetwork = await installNetworkGuards(selectedPage)
    await selectedPage.goto(`${origin}/projects/new`)
    await seedLanark(selectedPage)
    const selectedMap = selectedPage.getByTestId('site-context-map')
    await expect(selectedMap).toBeVisible()
    await expect.poll(() => loadedTiles(selectedMap), { timeout: 8000 }).toBeGreaterThan(0)
    await expect(selectedPage.locator('.gp-site.is-selected')).toBeVisible()
    await expect(selectedPage.getByTestId('site-map-parcel-boundary')).toBeVisible()
    await expect(selectedPage.locator('.gp-site.is-selected')).toContainText('0023C00208000000')
    const overview = selectedPage.getByRole('button', { name: 'Overview', exact: true })
    const viewParcel = selectedPage.getByRole('button', { name: 'View parcel', exact: true })
    await expect(overview).toBeVisible()
    await expect(viewParcel).toBeVisible()
    await overview.click()
    const overviewState = await tileUrls(selectedMap)
    await viewParcel.click()
    await expect.poll(() => tileUrls(selectedMap), { timeout: 5000 }).not.toEqual(overviewState)
    await mkdir(screenshots, { recursive: true })
    for (const width of [1440, 390, 320]) {
      await selectedPage.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await selectedPage.screenshot({ path: `${screenshots}/lanark-${width}.png`, fullPage: true })
    }
    assert.equal(selectedNetwork.state.assistantRequests, 0)
    assert.deepEqual(selectedErrors, [])
    await selectedContext.close()

    const failureContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const failurePage = await failureContext.newPage()
    const failureErrors = []
    failurePage.on('pageerror', error => failureErrors.push(error.message))
    const failureNetwork = await installNetworkGuards(failurePage, 'failure')
    await enterPropertyStep(failurePage)
    const failureMap = failurePage.getByTestId('site-context-map')
    await expect(failureMap).toBeVisible()
    await expect(failurePage.getByTestId('site-map-tiles-error')).toBeVisible({ timeout: 8000 })
    failureNetwork.setTileMode('success')
    await failurePage.getByRole('button', { name: 'Retry map' }).click()
    await expect.poll(() => loadedTiles(failureMap), { timeout: 8000 }).toBeGreaterThan(0)
    await expect(failurePage.getByTestId('site-map-tiles-error')).toBeHidden()
    assert.equal(failureNetwork.state.assistantRequests, 0)
    assert.deepEqual(failureErrors, [])
    await failureContext.close()
    console.log('Guided map browser flow passed: unknown-property isolation, selected parcel boundary, map movement with saved proposal, tile recovery, attribution, responsive widths, and no AI requests')
  }
} finally {
  await browser.close()
}
