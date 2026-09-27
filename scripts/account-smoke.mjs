import { chromium } from 'playwright'

const origin = new URL(process.env.APP_ORIGIN ?? 'http://127.0.0.1:5195').origin
const browser = await chromium.launch({ headless: true })
const errors = []
try {
  const missing = await browser.newPage()
  missing.on('pageerror', error => errors.push(error.message))
  await missing.route('**/api/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false }) }))
  await missing.goto(`${origin}/account`)
  await missing.getByRole('heading', { name: 'Account saving is unavailable' }).waitFor()
  console.log('PASS unavailable account state')
  await missing.close()

  const failed = await browser.newPage()
  failed.on('pageerror', error => errors.push(error.message))
  await failed.route('**/api/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_mock', aiEnabled: false }) }))
  await failed.route('https://example.supabase.co/auth/v1/otp', route => route.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ msg: 'Test denial' }) }))
  await failed.goto(`${origin}/account`)
  await failed.getByLabel('Email address').fill('someone@example.com')
  await failed.getByRole('button', { name: 'Send sign-in link' }).click()
  await failed.getByRole('alert').getByText('The sign-in link could not be sent.').waitFor()
  console.log('PASS failed magic-link request')
  await failed.close()

  const callback = await browser.newPage()
  callback.on('pageerror', error => errors.push(error.message))
  await callback.route('**/api/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: null, supabasePublishableKey: null, aiEnabled: false }) }))
  await callback.goto(`${origin}/account#error=access_denied&error_description=expired`)
  await callback.getByRole('heading', { name: 'Account saving is unavailable' }).waitFor()
  if (callback.url() !== `${origin}/account`) throw new Error('Failed callback URL was not cleared')
  await callback.getByRole('alert').getByText('That sign-in link could not be completed.').waitFor()
  console.log('PASS failed callback and URL cleanup')
  await callback.close()

  const paged = await browser.newPage()
  paged.on('pageerror', error => errors.push(error.message))
  await paged.addInitScript(() => {
    localStorage.setItem('sb-example-auth-token', JSON.stringify({ access_token: 'mock-user-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'mock-refresh', user: { id: 'user-a', aud: 'authenticated', role: 'authenticated', email: 'user-a@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-09-27T12:00:00Z' } }))
  })
  await paged.route('**/api/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_mock', aiEnabled: false }) }))
  await paged.route('https://example.supabase.co/rest/v1/saved_projects**', route => {
    const older = route.request().url().includes('offset=100')
    const rows = older ? [{ id: 'older-1', owner_id: 'user-a', kind: 'walkthrough', title: 'Older project', created_at: '2026-09-26T14:00:00Z' }]
      : Array.from({ length: 100 }, (_, index) => ({ id: `recent-${index}`, owner_id: 'user-a', kind: 'walkthrough', title: `Recent project ${index}`, created_at: '2026-09-27T14:00:00Z' }))
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rows) })
  })
  await paged.goto(`${origin}/account`)
  await paged.getByRole('button', { name: 'Load older projects' }).click()
  await paged.getByText('Older project').waitFor()
  console.log('PASS older cloud snapshots remain reachable')
  await paged.close()

  const saved = await browser.newPage()
  saved.on('pageerror', error => errors.push(error.message))
  const parcelId = '0046R00029000000'
  const proposal = { description: '', activities: [], proposedHomes: null, housingForm: 'unknown', groundDisturbance: 'unknown' }
  const comparison = { version: 1, parcelId, confirmedAt: '2026-09-27T14:00:00.000Z', proposals: { A: { input: proposal, result: null }, B: { input: { ...proposal, description: 'Cloud proposal' }, result: null } } }
  let savedRequest = null
  await saved.addInitScript(() => {
    localStorage.setItem('sb-example-auth-token', JSON.stringify({ access_token: 'mock-user-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'mock-refresh', user: { id: 'user-a', aud: 'authenticated', role: 'authenticated', email: 'user-a@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-09-27T12:00:00Z' } }))
  })
  await saved.route('**/api/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_mock', aiEnabled: false }) }))
  await saved.route('https://example.supabase.co/**', route => {
    const url = route.request().url()
    if (url.includes('/rest/v1/saved_projects')) {
      const row = { id: 'snapshot-1', owner_id: 'user-a', kind: 'comparison', title: 'Mock parcel comparison', created_at: '2026-09-27T14:00:00Z' }
      if (route.request().method() === 'POST') savedRequest = { headers: route.request().headers(), body: JSON.parse(route.request().postData()) }
      const body = url.includes('id=eq.') ? [{ ...row, data: comparison }] : [row]
      return route.fulfill({ status: route.request().method() === 'POST' ? 201 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' })
  })
  await saved.goto(`${origin}/account`)
  await saved.getByRole('heading', { name: 'user-a@example.com' }).waitFor({ timeout: 10000 })
  await saved.getByText('Mock parcel comparison').waitFor()
  await saved.screenshot({ path: '/tmp/account-page.png', fullPage: true })
  console.log('PASS synthetic signed-in cloud list')
  await saved.evaluate(({ parcelId, proposal }) => {
    const local = { version: 1, parcelId, confirmedAt: '2026-09-27T13:00:00.000Z', proposals: { A: { input: { ...proposal, description: 'Device proposal' }, result: null }, B: { input: proposal, result: null } } }
    localStorage.setItem(`housing-navigator-comparison-v1:${parcelId}`, JSON.stringify(local))
  }, { parcelId, proposal })
  await saved.getByRole('button', { name: 'Open', exact: true }).click()
  await saved.waitForURL(`${origin}/compare?parcelId=${parcelId}`)
  const restored = await saved.evaluate(parcelId => ({ current: JSON.parse(localStorage.getItem(`housing-navigator-comparison-v1:${parcelId}`)), backup: Object.keys(localStorage).find(key => key.startsWith('housing-navigator-comparison-backup-v1:')) }), parcelId)
  if (restored.current.proposals.B.input.description !== 'Cloud proposal' || !restored.backup) throw new Error('Cloud restore did not retain the device comparison')
  console.log('PASS cloud comparison restore with device backup')
  await saved.getByRole('button', { name: 'Save to account' }).click()
  await saved.getByText('Saved to your account. Your device copy is still here.').waitFor()
  await saved.screenshot({ path: '/tmp/account-compare.png', fullPage: false })
  if (savedRequest?.headers.authorization !== 'Bearer mock-user-token' || savedRequest.body.owner_id !== undefined) throw new Error('Cloud save did not use the captured user token')
  console.log('PASS explicit cloud save with captured token')
  await saved.goto(`${origin}/account`)
  await saved.getByRole('button', { name: 'Sign out' }).click()
  await saved.getByRole('heading', { name: 'Sign in by email' }).waitFor()
  if (await saved.getByText('Mock parcel comparison').count()) throw new Error('Signed-out account still exposes its saved projects')
  console.log('PASS sign-out clears the account list')
  await saved.close()

  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
} finally {
  await browser.close()
}
