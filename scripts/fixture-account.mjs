export async function mockSignedInAccount(context) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-09-27T12:00:00Z' }
  const session = { access_token: 'synthetic-browser-test-token', refresh_token: 'synthetic-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
  await context.addInitScript(value => localStorage.setItem('sb-example-auth-token', JSON.stringify(value)), session)
  await context.route('**/api/config', route => route.fulfill({ json: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_synthetic_browser_fixture', aiEnabled: true } }))
  await context.route('https://example.supabase.co/**', route => route.fulfill({ json: user }))
}
