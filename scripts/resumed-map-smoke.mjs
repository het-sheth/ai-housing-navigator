import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5195'
const pin = '0046R00029000000'
const at = '2026-09-27T12:00:00.000Z'
const detail = { parcelId: pin, assessment: { status: 'available', sourceDate: '2026-09-01', retrievedAt: at, sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', record: { parcelId: pin, address: '2003 MOUNTFORD AVE', city: 'PITTSBURGH', municipality: 'PITTSBURGH', zip: '15214', classification: 'RESIDENTIAL', useDescription: 'Residential', lotAreaSqFt: 2000, yearBuilt: null } }, boundary: { status: 'available', sourceDate: null, retrievedAt: at, sourceUrl: 'https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Web_Parcels/MapServer/0', sourceCrs: 'EPSG:4326', displayCrs: 'EPSG:4326', modifiedOn: null, geometry: { type: 'Polygon', coordinates: [[[-80.01, 40.45], [-80.0097, 40.45], [-80.0097, 40.4503], [-80.01, 40.4503], [-80.01, 40.45]]] } } }
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
try {
  for (const mode of ['success', 'retry', 'stale']) {
    const context = await browser.newContext()
    const page = await context.newPage()
    let requests = 0
    let release
    const gate = new Promise(resolve => { release = resolve })
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/config') return route.fulfill({ json: { supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false } })
      if (path === '/api/property/parcel') {
        requests += 1
        if (mode === 'stale') await gate
        if (mode === 'retry' && requests === 1) return route.fulfill({ status: 502, json: { error: 'source_unavailable' } })
        return route.fulfill({ json: detail }).catch(() => {})
      }
      return route.abort()
    })
    await page.goto(origin)
    await page.evaluate(({ pin, at }) => new Promise((resolve, reject) => {
      const request = indexedDB.open('housing-navigator-drafts', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('drafts')
      request.onerror = reject
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('drafts', 'readwrite')
        tx.objectStore('drafts').put({ schemaVersion: 1, id: crypto.randomUUID(), revision: 0, step: 4, role: '', decision: '', propertyQuery: '2003 Mountford Ave', parcelId: pin, propertyConfirmed: true, propertyEvidence: 'live', description: '', activities: ['repair_remodel', 'interior_conversion'], tentativeActivities: [], housingForm: 'attached', groundDisturbance: 'unknown', existingHomes: null, proposedHomes: null, homesRetained: null, affordabilityGoal: '', essentialUses: '', financial: { budget: 'unknown', value: 'unknown', funding: 'unknown' }, confirmedAt: null, updatedAt: at }, 'current')
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = reject
      }
    }), { pin, at })
    await page.goto(`${origin}/projects/new`)
    await expect.poll(() => requests).toBe(1)
    if (mode === 'stale') {
      await page.getByRole('button', { name: 'Change parcel', exact: true }).click()
      release()
      await expect(page.locator('[data-testid="site-map-parcel-boundary"]')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Allegheny County area' })).toBeVisible()
    } else {
      if (mode === 'retry') {
        await page.getByRole('button', { name: 'Retry current records', exact: true }).click()
      }
      await expect(page.locator('[data-testid="site-map-parcel-boundary"]').first()).toBeVisible()
      await expect(page.getByText('Repair/remodel', { exact: true }).first()).toBeVisible()
      assert.equal(requests, mode === 'retry' ? 2 : 1)
    }
    await context.close()
  }
  console.log('Resumed map passed: automatic boundary, failed-load retry, stale response rejection; saved proposal preserved.')
} finally { await browser.close() }
