import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5195'
const userId = '33333333-3333-4333-8333-333333333333'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: '2026-09-27T12:00:00Z' }
const session = { access_token: 'synthetic-guest-token', refresh_token: 'synthetic-guest-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
const cors = { 'access-control-allow-origin': '*' }
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true })

async function setup(context, failGuest = false) {
  let signups = 0
  await context.route('**/api/config', route => route.fulfill({ json: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_synthetic_guest', aiEnabled: false } }))
  await context.route('**/api/assist', route => route.abort())
  await context.route('https://example.supabase.co/**', route => route.fulfill({ status: 500, contentType: 'application/json', headers: cors, body: '{}' }))
  await context.route('https://example.supabase.co/auth/v1/signup', route => {
    signups += 1
    assert.equal(route.request().method(), 'POST')
    return route.fulfill(failGuest
      ? { status: 400, contentType: 'application/json', headers: cors, body: '{"msg":"Guest unavailable"}' }
      : { status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(session) })
  })
  await context.route('https://example.supabase.co/auth/v1/logout**', route => route.fulfill({ status: 204, headers: cors, body: '' }))
  await context.route('https://example.supabase.co/rest/v1/saved_projects?*', route => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify([{ id: 'guest-snapshot', owner_id: userId, kind: 'comparison', title: 'Guest saved project', created_at: '2026-09-27T14:00:00Z' }]) }))
  return () => signups
}

try {
  {
    const context = await browser.newContext()
    const signups = await setup(context)
    const page = await context.newPage()
    await page.goto(`${origin}/account`)
    await expect(page.getByRole('button', { name: 'Try as a guest' })).toBeVisible()
    await expect(page.getByText(/email links.*team/i)).toBeVisible()
    assert.equal(signups(), 0)
    await page.evaluate(() => localStorage.setItem('housing-navigator-device-test', 'retained'))
    await page.getByRole('button', { name: 'Try as a guest' }).click()
    await expect(page.getByRole('heading', { name: 'Guest account' })).toBeVisible()
    await expect(page.getByText('Guest saved project')).toBeVisible()
    await expect(page.getByText(/cannot be recovered after.*sign out/i)).toBeVisible()
    assert.equal(signups(), 1)
    page.once('dialog', dialog => { assert.match(dialog.message(), /cannot be recovered/i); return dialog.dismiss() })
    await page.getByRole('button', { name: 'Sign out of guest account' }).click()
    await expect(page.getByRole('heading', { name: 'Guest account' })).toBeVisible()
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Sign out of guest account' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in by email' })).toBeVisible()
    await expect(page.getByText('Guest saved project')).toHaveCount(0)
    assert.equal(await page.evaluate(() => localStorage.getItem('housing-navigator-device-test')), 'retained')
    await context.close()
    console.log('PASS explicit guest session, owned list, recovery warning and confirmed sign-out')
  }

  {
    const context = await browser.newContext()
    const signups = await setup(context, true)
    const page = await context.newPage()
    await page.goto(`${origin}/account`)
    await page.evaluate(() => localStorage.setItem('housing-navigator-device-test', 'retained'))
    await page.getByRole('button', { name: 'Try as a guest' }).click()
    await expect(page.getByRole('alert')).toContainText('Guest access could not start')
    await expect(page.getByRole('heading', { name: 'Sign in by email' })).toBeVisible()
    assert.equal(signups(), 1)
    assert.equal(await page.evaluate(() => localStorage.getItem('housing-navigator-device-test')), 'retained')
    await context.close()
    console.log('PASS failed guest signup preserves email option and device work')
  }
} finally {
  await browser.close()
}
