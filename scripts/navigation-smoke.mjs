import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5195'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/api/**', route => route.abort())
  await context.route('**/*.tile.openstreetmap.org/**', route => route.abort())
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(origin)
    await expect(page.getByTestId('welcome-screen')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Choose your starting point.' })).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Main navigation' })
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page')
    for (const [name, path, heading] of [
      ['Assess a property', '/projects/new', 'What brings you here?'],
      ['Explore properties', '/explore', 'Find a parcel to study.'],
      ['Compare proposals', '/compare', 'Compare what the evidence says.'],
    ]) {
      await nav.getByRole('link', { name, exact: true }).click()
      await expect(page).toHaveURL(`${origin}${path}`)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} must fit ${width}px`)
      const brand = await page.locator('.site-brand').boundingBox()
      const account = await page.locator('.site-account-link').boundingBox()
      assert.ok(brand && account && brand.width >= 130 && brand.x + brand.width <= account.x, `Header controls collide on ${path} at ${width}px`)
    }
    await page.getByRole('link', { name: 'Account', exact: true }).click()
    await expect(page).toHaveURL(`${origin}/account`)
    await expect(page.getByRole('heading', { name: 'Keep a copy you can reopen' })).toBeVisible()
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page.getByTestId('welcome-screen')).toBeVisible()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Home must fit ${width}px`)
    await page.screenshot({ path: `/tmp/housing-home-${width}.png`, fullPage: true })
  }
  await page.getByRole('link', { name: 'Historical Lanark example' }).click()
  await expect(page).toHaveURL(`${origin}/prototype`)
  await expect(page.getByLabel('Proposed homes').first()).toBeVisible()
  await page.goto(`${origin}/welcome`)
  await expect(page.getByTestId('welcome-screen')).toBeVisible()
  assert.deepEqual(errors, [])
  console.log('Navigation passed: home, all four pages, active links, 1440/390/320px, legacy routes, zero page errors.')
  await context.close()
} finally {
  await browser.close()
}
