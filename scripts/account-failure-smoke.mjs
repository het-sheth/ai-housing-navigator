import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

const origin = new URL(process.env.APP_ORIGIN ?? 'http://127.0.0.1:5195').origin
const assets = await readdir(new URL('../dist/assets/', import.meta.url))
const sessionAsset = assets.find(name => /^session-[\w-]+\.js$/.test(name))
if (!sessionAsset) throw new Error('Built account session module was not found. Run npm run build first.')

const parcelId = '0046R00029000000'
const accountA = { id: '11111111-1111-4111-8111-111111111111', email: 'account-a@example.test' }
const accountB = { id: '22222222-2222-4222-8222-222222222222', email: 'account-b@example.test' }
const proposal = { description: '', activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }
const comparison = { version: 1, parcelId, confirmedAt: '2026-09-27T14:00:00.000Z', proposals: { A: { input: { ...proposal, description: 'Device work' }, result: null }, B: { input: proposal, result: null } } }
const storageKey = `housing-navigator-comparison-v1:${parcelId}`
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })

function user(account) {
  return { ...account, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-09-27T12:00:00Z' }
}

function session(account) {
  return { access_token: `synthetic-${account.id}`, refresh_token: `synthetic-refresh-${account.id}`, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user(account) }
}

function row(account, title) {
  return { id: `snapshot-${account.id}`, owner_id: account.id, kind: 'comparison', title, created_at: '2026-09-27T14:00:00Z' }
}

function draft(description) {
  return { schemaVersion: 1, id: crypto.randomUUID(), revision: 0, step: 0, role: '', decision: '', propertyQuery: '', parcelId: null, propertyConfirmed: false, propertyEvidence: null, description, activities: [], tentativeActivities: [], housingForm: 'unknown', groundDisturbance: 'unknown', existingHomes: null, proposedHomes: null, homesRetained: null, affordabilityGoal: '', essentialUses: '', financial: { budget: 'unknown', value: 'unknown', funding: 'unknown' }, confirmedAt: null, updatedAt: '2026-09-27T14:00:00.000Z' }
}

async function setup(context) {
  await context.addInitScript(({ initial, key, local }) => {
    localStorage.setItem('sb-example-auth-token', JSON.stringify(initial))
    localStorage.setItem(key, JSON.stringify(local))
  }, { initial: session(accountA), key: storageKey, local: comparison })
  await context.route('**/api/config', route => route.fulfill({ json: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_synthetic_browser_fixture', aiEnabled: false } }))
  await context.route('**/api/assist', route => route.abort())
  await context.route('https://example.supabase.co/**', route => route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }))
  await context.route('https://example.supabase.co/auth/v1/token?grant_type=password', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(session(accountB)) }))
  await context.route('https://example.supabase.co/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(user(accountB)) }))
}

async function switchToB(page) {
  const changed = await page.evaluate(async asset => {
    const { g: getSupabase } = await import(`/assets/${asset}`)
    const client = await getSupabase()
    const result = await client.auth.signInWithPassword({ email: 'account-b@example.test', password: 'synthetic-password' })
    return { error: result.error?.message ?? null, userId: result.data.user?.id ?? null }
  }, sessionAsset)
  assert.deepEqual(changed, { error: null, userId: accountB.id })
}

async function deviceCopy(page) {
  return page.evaluate(key => localStorage.getItem(key), storageKey)
}

try {
  {
    const context = await browser.newContext()
    await setup(context)
    let saveCalls = 0
    await context.route('https://example.supabase.co/rest/v1/saved_projects', route => {
      saveCalls += 1
      assert.equal(route.request().method(), 'POST')
      assert.equal(route.request().headers().authorization, `Bearer ${session(accountA).access_token}`)
      return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' })
    })
    const page = await context.newPage()
    await page.goto(`${origin}/compare?parcelId=${parcelId}`)
    const before = await deviceCopy(page)
    await page.getByRole('button', { name: 'Save to account' }).click()
    await expect(page.getByRole('status').getByText('Saved projects could not be reached. Your device work is unchanged.')).toBeVisible()
    assert.equal(await deviceCopy(page), before)
    assert.equal(saveCalls, 1)
    await expect(page.getByRole('button', { name: 'Save to account' })).toBeEnabled()
    await context.close()
    console.log('PASS failed cloud save retains the device comparison')
  }

  {
    const context = await browser.newContext()
    await setup(context)
    let saveCalls = 0
    await context.route('https://example.supabase.co/rest/v1/saved_projects', route => {
      saveCalls += 1
      return route.fulfill({ status: 401, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' })
    })
    const page = await context.newPage()
    await page.goto(`${origin}/compare?parcelId=${parcelId}`)
    const before = await deviceCopy(page)
    await page.getByRole('button', { name: 'Save to account' }).click()
    await expect(page.getByRole('status').getByText('Your session expired or access was denied. Sign in again.')).toBeVisible()
    assert.equal(await deviceCopy(page), before)
    assert.equal(saveCalls, 1)
    await context.close()
    console.log('PASS expired-session save rejection retains the device comparison')
  }

  {
    const context = await browser.newContext()
    await setup(context)
    let releaseA
    const pendingA = new Promise(resolve => { releaseA = resolve })
    let sawA
    const startedA = new Promise(resolve => { sawA = resolve })
    await context.route('https://example.supabase.co/rest/v1/saved_projects?*', async route => {
      const url = new URL(route.request().url())
      const owner = url.searchParams.get('owner_id')
      if (owner === `eq.${accountA.id}`) {
        sawA()
        await pendingA
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([row(accountA, 'Old account secret row')]) })
      } else if (owner === `eq.${accountB.id}`) {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([row(accountB, 'Current account row')]) })
      } else throw new Error(`Unexpected list owner: ${owner}`)
    })
    const page = await context.newPage()
    await page.goto(`${origin}/account`)
    await startedA
    await switchToB(page)
    await expect(page.getByRole('heading', { name: accountB.email })).toBeVisible()
    await expect(page.getByText('Current account row')).toBeVisible()
    releaseA()
    await page.waitForTimeout(100)
    await expect(page.getByText('Old account secret row')).toHaveCount(0)
    await expect(page.getByText('Current account row')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await context.close()
    console.log('PASS late prior-account list response stays hidden after SDK account transition')
  }

  {
    const context = await browser.newContext()
    await setup(context)
    let releaseSave
    const pendingSave = new Promise(resolve => { releaseSave = resolve })
    let sawSave
    const startedSave = new Promise(resolve => { sawSave = resolve })
    await context.route('https://example.supabase.co/rest/v1/saved_projects', async route => {
      sawSave()
      assert.equal(route.request().headers().authorization, `Bearer ${session(accountA).access_token}`)
      await pendingSave
      await route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([row(accountA, 'Saved under old account')]) })
    })
    const page = await context.newPage()
    await page.goto(`${origin}/compare?parcelId=${parcelId}`)
    const before = await deviceCopy(page)
    await page.getByRole('button', { name: 'Save to account' }).click()
    await startedSave
    await switchToB(page)
    releaseSave()
    await page.waitForTimeout(100)
    await expect(page.getByText('Saved to your account. Your device copy is still here.')).toHaveCount(0)
    assert.equal(await deviceCopy(page), before)
    await expect(page.getByRole('button', { name: 'Save to account' })).toBeEnabled()
    await context.close()
    console.log('PASS late prior-account save response cannot show a success notice')
  }

  {
    const context = await browser.newContext()
    await setup(context)
    const device = draft('Device work under current account')
    const cloud = draft('Prior account cloud work')
    await context.route('https://example.supabase.co/rest/v1/saved_projects?*', route => {
      const url = new URL(route.request().url())
      const owner = url.searchParams.get('owner_id')
      if (owner === `eq.${accountA.id}`) {
        const full = url.searchParams.has('id')
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ ...row(accountA, 'Prior account walkthrough'), kind: 'walkthrough', ...(full ? { data: cloud } : {}) }]) })
      }
      if (owner === `eq.${accountB.id}`) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' })
      throw new Error(`Unexpected restore owner: ${owner}`)
    })
    const page = await context.newPage()
    await page.goto(`${origin}/account`)
    await expect(page.getByText('Prior account walkthrough')).toBeVisible()
    await page.evaluate(async current => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('housing-navigator-drafts', 1)
        request.onupgradeneeded = () => request.result.createObjectStore('drafts')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('drafts', 'readwrite')
          tx.objectStore('drafts').put(current, 'current')
          tx.oncomplete = () => { db.close(); resolve() }
          tx.onerror = () => reject(tx.error)
        }
      })
      const originalOpen = indexedDB.open.bind(indexedDB)
      const heldDb = await new Promise((resolve, reject) => {
        const request = originalOpen('housing-navigator-drafts', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      window.__originalOpen = originalOpen
      window.__draftGate = { reached: false, release: null }
      indexedDB.open = () => {
        const request = { result: heldDb, onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
        window.__draftGate.reached = true
        window.__draftGate.release = () => request.onsuccess?.()
        return request
      }
    }, device)
    await page.getByRole('button', { name: 'Open', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.__draftGate.reached)).toBe(true)
    await switchToB(page)
    await expect(page.getByRole('heading', { name: accountB.email })).toBeVisible()
    await page.evaluate(() => { indexedDB.open = window.__originalOpen; window.__draftGate.release() })
    await page.waitForTimeout(250)
    const current = await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('housing-navigator-drafts', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('drafts', 'readonly')
        const row = tx.objectStore('drafts').get('current')
        tx.oncomplete = () => { db.close(); resolve(row.result) }
        tx.onerror = () => reject(tx.error)
      }
    }))
    assert.equal(current.description, device.description)
    await context.close()
    console.log('PASS delayed walkthrough restore cannot overwrite device work after SDK account transition')
  }
} finally {
  await browser.close()
}
