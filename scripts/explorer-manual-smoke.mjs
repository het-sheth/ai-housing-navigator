import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5195'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  let searches = 0
  let aiRequests = 0
  await page.route('**/api/config', route => route.fulfill({ json: { supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false } }))
  await page.route('**/api/assist', route => { aiRequests += 1; return route.abort() })
  await page.route('**/api/property/candidates?*', route => {
    searches += 1
    return route.fulfill({ json: { status: 'no_match', candidates: [], truncated: false, sourceUrl: 'https://data.wprdc.org/dataset/property-assessments', sourceDate: null, retrievedAt: '2026-09-27T18:00:00Z', coverage: 'Synthetic search scope', unknowns: ['Proposal suitability'] } })
  })
  await page.goto(`${origin}/explore`)
  await page.getByLabel('Repair/remodel', { exact: true }).check()
  await page.getByLabel('Addition', { exact: true }).check()
  const search = page.getByRole('button', { name: 'Confirm criteria and find records', exact: true })
  await expect(search).toBeEnabled()
  await search.click()
  await expect(page.getByRole('heading', { name: 'No matching assessment records' })).toBeVisible()
  assert.equal(searches, 1)
  assert.equal(aiRequests, 0)
  await expect(page.getByText('Activities: Repair/remodel, Addition')).toBeVisible()
  console.log('Manual two-activity search without prose passed, one search request, zero AI requests.')
} finally {
  await browser.close()
}
