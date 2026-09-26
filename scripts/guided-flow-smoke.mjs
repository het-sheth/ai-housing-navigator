import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })
const origin = 'http://127.0.0.1:5173'

async function readStored(page) {
  return page.evaluate(async () => {
    const { loadDraft } = await import('/src/features/projects/draft-store.ts')
    return loadDraft()
  })
}

async function rawStored(page, value) {
  return page.evaluate(async payload => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('housing-navigator-drafts', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite')
      const request = payload === null ? transaction.objectStore('drafts').get('current') : transaction.objectStore('drafts').put(payload, 'current')
      transaction.oncomplete = () => { db.close(); resolve(request.result) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    })
  }, value)
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/projects/new`)
  await expect(page.getByTestId('guided-workspace')).toBeVisible()

  await page.evaluate(async () => {
    const { createDraft } = await import('/src/features/projects/contracts.ts')
    const { saveDraft, loadDraft, clearDraft } = await import('/src/features/projects/draft-store.ts')
    const draft = createDraft()
    draft.description = 'Synthetic storage transaction test'
    const first = saveDraft(draft)
    const second = saveDraft({ ...draft, revision: 1, description: 'Newest synthetic revision' })
    const loaded = loadDraft()
    await Promise.all([first, second])
    if ((await loaded)?.description !== 'Newest synthetic revision') throw Error('Queued load must observe the latest committed save')
    await clearDraft()
    if (await loadDraft() !== null) throw Error('Clear must remove the stored draft')
  })
  await page.reload()
  await expect(page.getByTestId('guided-workspace')).toBeVisible()

  console.log('PASS: guided route, native IndexedDB serialized writes and clear')
  assert.deepEqual(errors, [])
  await context.close()
} finally {
  await browser.close()
}
