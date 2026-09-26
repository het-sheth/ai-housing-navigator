import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/welcome')
  await page.getByTestId('welcome-screen').waitFor({ timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  assert.equal(await page.getByRole('link', { name: 'Start a project', exact: true }).getAttribute('href'), '/projects/new')
  await page.getByTestId('neighborhood-scene').waitFor()
  await page.waitForFunction(() => ['ready', 'fallback'].includes(document.querySelector('[data-testid="neighborhood-scene"]')?.getAttribute('data-render-state')))
  const sceneState = await page.getByTestId('neighborhood-scene').getAttribute('data-render-state')
  assert.ok(['ready', 'fallback'].includes(sceneState))
  await page.screenshot({ path: '/tmp/housing-welcome-desktop.png', fullPage: true })
  const pause = page.getByRole('button', { name: /pause animation/i })
  if (sceneState === 'ready') {
    await pause.click()
    await page.getByRole('button', { name: /resume animation/i }).waitFor()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile intro must not overflow')
  await page.screenshot({ path: '/tmp/housing-welcome-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 320, height: 780 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '320px intro must not overflow')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await page.getByTestId('welcome-screen').waitFor()
  await page.getByRole('link', { name: 'Start a project', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.getByTestId('guided-workspace').waitFor()
  assert.deepEqual(errors, [], 'Intro and transition must not throw browser errors')
  console.log(`Welcome desktop/mobile/keyboard passed; scene renderer: ${sceneState}`)
} finally {
  await browser.close()
}
