import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const baseUrl = process.env.WELCOME_BASE_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  const consoleMessages = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => consoleMessages.push(`${message.type()}: ${message.text()}`))
  await page.goto(`${baseUrl}/welcome`)
  await page.getByTestId('welcome-screen').waitFor({ timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)

  const start = page.getByRole('link', { name: 'Start a project', exact: true }).first()
  assert.equal(await start.getAttribute('href'), '/projects/new')
  const scene = page.getByTestId('neighborhood-scene')
  await scene.waitFor()
  await page.waitForFunction(() => ['ready', 'fallback'].includes(document.querySelector('[data-testid="neighborhood-scene"]')?.getAttribute('data-render-state')))
  const sceneState = await scene.getAttribute('data-render-state')
  assert.equal(sceneState, 'ready', `Software WebGL should render the scene. Browser messages: ${consoleMessages.join(' | ')}`)
  await page.getByText(/illustrative neighborhood, not a model of your property/i).waitFor()
  await page.screenshot({ path: '/tmp/housing-welcome-desktop.png', fullPage: true })
  const pause = page.getByRole('button', { name: /pause animation/i })
  assert.equal(await pause.isEnabled(), true)
  await pause.click()
  await page.getByRole('button', { name: /resume animation/i }).waitFor()
  await page.getByRole('button', { name: /resume animation/i }).click()
  await page.getByRole('button', { name: /pause animation/i }).waitFor()

  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '390px introduction must not overflow horizontally')
  await page.screenshot({ path: '/tmp/housing-welcome-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 320, height: 780 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '320px introduction must not overflow horizontally')
  await page.screenshot({ path: '/tmp/housing-welcome-320.png', fullPage: true })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await page.getByTestId('welcome-screen').waitFor()
  const reducedMotionPause = page.getByRole('button', { name: /motion reduced/i })
  await reducedMotionPause.waitFor()
  assert.equal(await reducedMotionPause.isDisabled(), true, 'Reduced motion should disable manual animation control')
  assert.equal(await reducedMotionPause.getAttribute('aria-pressed'), 'true', 'Reduced motion should keep the scene paused')

  await page.getByRole('link', { name: 'Start a project', exact: true }).first().focus()
  await page.keyboard.press('Enter')
  await page.getByTestId('guided-workspace').waitFor()
  assert.deepEqual(errors, [], 'Introduction and project transition should not throw browser errors')
  console.log(`Welcome browser flow passed: desktop, mobile, reduced motion, keyboard CTA, and ${sceneState} scene`)
  await context.close()

  // Force WebGL unavailable to verify the explicit, static illustration fallback.
  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const fallbackPage = await fallbackContext.newPage()
  await fallbackPage.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (typeof type === 'string' && /webgl/i.test(type)) return null
      return getContext.call(this, type, ...args)
    }
  })
  await fallbackPage.goto(`${baseUrl}/welcome`)
  const fallbackScene = fallbackPage.getByTestId('neighborhood-scene')
  await fallbackPage.waitForFunction(() => document.querySelector('[data-testid="neighborhood-scene"]')?.getAttribute('data-render-state') === 'fallback')
  await fallbackPage.getByTestId('scene-fallback').waitFor()
  await fallbackPage.getByText(/static illustration/i).waitFor()
  assert.equal(await fallbackScene.getAttribute('data-render-state'), 'fallback')
  assert.equal(await fallbackPage.getByRole('button', { name: /animation/i }).count(), 0, 'Fallback should not present animation controls')
  await fallbackPage.screenshot({ path: '/tmp/housing-welcome-fallback.png', fullPage: true })
  console.log('Welcome forced WebGL-unavailable fallback passed')
  await fallbackContext.close()
} finally {
  await browser.close()
}
