import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'

async function storedValue(page) {
  return page.evaluate(async () => {
    const { loadDraft } = await import('/src/features/projects/draft-store.ts')
    return loadDraft()
  })
}

async function writeRawDraft(page, value) {
  return page.evaluate(async payload => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('housing-navigator-drafts', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite')
      const store = transaction.objectStore('drafts')
      if (payload === null) store.delete('current')
      else store.put(payload, 'current')
      transaction.oncomplete = resolve
      transaction.onabort = () => reject(transaction.error)
    })
    db.close()
  }, value)
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  let assistantRequests = 0
  await context.route('**/*', async route => {
    if (new URL(route.request().url()).pathname === '/api/assist') {
      assistantRequests += 1
      await route.abort()
      return
    }
    await route.continue()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto(`${origin}/projects/new`)
  const workspace = page.getByTestId('guided-workspace')
  await expect(workspace).toBeVisible()
  await expect(page.getByTestId('draft-save-status')).toContainText(/device|saved|draft/i)

  // Exercise concurrent IndexedDB calls through the public store contract.
  await page.evaluate(async () => {
    const { createDraft } = await import('/src/features/projects/contracts.ts')
    const { saveDraft, loadDraft, clearDraft } = await import('/src/features/projects/draft-store.ts')
    const first = createDraft()
    first.description = 'Synthetic serialized write check'
    const olderSave = saveDraft(first)
    const newerSave = saveDraft({ ...first, revision: 1, description: 'Newest synthetic revision' })
    const queuedRead = loadDraft()
    await Promise.all([olderSave, newerSave])
    if ((await queuedRead)?.description !== 'Newest synthetic revision') throw Error('Queued load did not observe the latest committed write')
    await clearDraft()
    if (await loadDraft() !== null) throw Error('Clear did not remove the stored draft')
  })
  await page.reload()
  await expect(workspace).toBeVisible()
  await expect(page.getByTestId('draft-save-status')).toContainText(/saved on this device/i)

  // Invalid persisted data must remain recoverable until the user explicitly clears it.
  const invalid = { schemaVersion: 999, id: 'synthetic-invalid-draft' }
  await writeRawDraft(page, invalid)
  await page.reload()
  await expect(workspace).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(/saved draft|invalid|recover|reset|clear/i)
  assert.deepEqual(await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('housing-navigator-drafts', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const value = await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get('current')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return value
  }), invalid, 'Invalid draft should not be overwritten automatically')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: /clear saved draft and start fresh/i }).click()
  await expect.poll(() => storedValue(page)).toBeNull()
  await page.reload()
  await expect(workspace).toBeVisible()

  // Generic addresses stay unresolved, while multiple and tentative activities remain distinct.
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Street address or parcel ID').fill('0042 Example Avenue')
  await expect.poll(async () => (await storedValue(page))?.propertyQuery).toBe('0042 Example Avenue')
  await expect(page.getByText(/search and confirm a parcel to see its boundary/i)).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('site-context-map')).toBeVisible()
  await expect(page.locator('.gp-site.is-selected')).toHaveCount(0)
  await page.getByLabel('Describe the work in your own words').fill('Repair the existing house, with a possible addition.')
  await page.getByLabel('Repair/remodel', { exact: true }).check()
  await page.getByRole('button', { name: 'Mark Addition as tentative' }).click()
  await page.getByLabel('Proposed total homes').fill('-1')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByLabel('Proposed total homes')).toBeVisible()
  await expect(page.getByLabel('Proposed total homes')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Proposed total homes').fill('3')
  await expect.poll(async () => (await storedValue(page))?.proposedHomes).toBe(3)
  await page.getByRole('button', { name: 'Continue' }).click()

  // Unknown financial inputs remain saved for a later source check.
  await expect(page.getByText('Unknown', { exact: true }).first()).toBeVisible()
  await page.getByText('Homes and community outcomes').click()
  await page.getByLabel('Homes retained').fill('2')
  await page.getByLabel('Existing homes').fill('1')
  await expect(page.getByRole('alert')).toContainText(/entered value has not been saved/i)
  await expect(page.getByLabel('Existing homes')).toHaveValue('1')
  await expect(page.getByLabel('Existing homes')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Homes retained')).toHaveValue('2')
  assert.equal((await storedValue(page))?.existingHomes, null, 'Contradictory existing-home input must not autosave')
  await page.getByLabel('Homes retained').fill('1')
  await page.getByLabel('Existing homes').fill('1')
  await expect.poll(async () => (await storedValue(page))?.existingHomes).toBe(1)
  assert.equal((await storedValue(page))?.proposedHomes, 3, 'Proposal home count must remain saved from the proposal step')
  await page.getByText('Homes and community outcomes').click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Check your project' })).toBeVisible()
  await expect(page.getByText('0042 Example Avenue', { exact: false }).first()).toBeVisible()
  await expect(page.getByTestId('run-assessment-button')).toHaveText('Choose a property')
  await page.getByTestId('run-assessment-button').click()
  await expect(page.getByLabel('Street address or parcel ID')).toBeFocused()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  const actions = page.getByTestId('next-action-list')
  await expect(actions).toHaveCount(0)
  await expect(page.getByTestId('assessment-panel')).toHaveCount(0)
  const coverage = page.locator('.gp-result-details')
  await expect(coverage).toHaveCount(0)

  // Editing confirmed inputs returns the project to an unconfirmed review state.
  await expect(page.getByRole('heading', { name: 'Check your project' })).toBeVisible()
  await page.getByRole('button', { name: /edit work/i }).click()
  await expect(page.getByRole('heading', { name: 'What do you have in mind?' })).toBeVisible()
  await page.getByLabel('Describe the work in your own words').fill('Repair the existing house, with a possible addition. Updated after review.')
  await expect.poll(async () => (await storedValue(page))?.confirmedAt).toBeNull()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('run-assessment-button')).toHaveText('Choose a property')
  await expect(page.getByRole('button', { name: /export project brief/i })).toHaveCount(0)
  assert.equal((await storedValue(page))?.propertyQuery, '0042 Example Avenue')
  assert.equal((await storedValue(page))?.tentativeActivities.includes('addition'), true)

  assert.deepEqual(errors, [], 'Guided route should not throw browser errors')
  assert.equal(assistantRequests, 0, 'Guided storage flow must not call AI')
  console.log('Guided browser flow passed: storage recovery, generic-property isolation, mixed scope, unresolved review, and invalidation')
  await context.close()

  const failureContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
  let failureAssistantRequests = 0
  await failureContext.route('**/*', async route => {
    if (new URL(route.request().url()).pathname === '/api/assist') {
      failureAssistantRequests += 1
      await route.abort()
      return
    }
    await route.continue()
  })
  const failurePage = await failureContext.newPage()
  const failureErrors = []
  failurePage.on('pageerror', error => failureErrors.push(error.message))
  await failurePage.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }))
  await failurePage.goto(`${origin}/projects/new`)
  await expect(failurePage.getByTestId('guided-workspace')).toBeVisible()
  await expect(failurePage.getByTestId('draft-save-status')).toContainText(/not saved|storage unavailable|could not be opened/i)
  await failurePage.getByRole('button', { name: 'Continue' }).click()
  const property = failurePage.getByLabel('Street address or parcel ID')
  await property.fill('0042 Unsaved Avenue')
  await expect(property).toHaveValue('0042 Unsaved Avenue')
  await expect(failurePage.getByTestId('draft-save-status')).toContainText(/keep this page open and export your work/i)
  const failureDownloadPromise = failurePage.waitForEvent('download')
  await failurePage.getByRole('button', { name: 'Export brief' }).click()
  const failureDownload = await failureDownloadPromise
  const failureBrief = await (await import('node:fs/promises')).readFile(await failureDownload.path(), 'utf8')
  assert.match(failureBrief, /0042 Unsaved Avenue/)
  assert.match(failureBrief, /Unresolved; address retained as user input/)
  assert.deepEqual(failureErrors, [], 'Storage failure should keep the guided route usable')
  assert.equal(failureAssistantRequests, 0, 'Storage failure flow must not call AI')
  console.log('Guided storage-failure browser flow passed: unsaved input remains exportable with a visible warning')
  await failureContext.close()
} finally {
  await browser.close()
}
