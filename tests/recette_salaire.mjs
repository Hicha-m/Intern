// Real browser → API → PostgreSQL acceptance of a fictitious published salary.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
if (!process.env.RECETTE_PASSWORD || !process.env.RECETTE_SALARY_MANIFEST) throw new Error('Set RECETTE_PASSWORD and RECETTE_SALARY_MANIFEST.')
const fixture = JSON.parse(await readFile(process.env.RECETTE_SALARY_MANIFEST, 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ baseURL: process.env.RECETTE_URL || 'http://127.0.0.1:5173' })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill('alice@example.test')
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.RECETTE_PASSWORD)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await page.waitForURL(/\/dashboard$/)
  const response = await context.request.get(`/api/v1/offers/${fixture.offer_id}/`)
  assert.equal(response.status(), 200)
  const offer = await response.json()
  assert.equal(offer.compensation_bands.length, 1)
  const band = offer.compensation_bands[0]
  assert.equal(band.minimum, '20.50')
  assert.equal(band.maximum, '30.75')
  assert.equal(band.period, 'hour')
  assert.equal(band.currency, 'EUR')
  assert.equal(band.gross_net, 'unknown')
  console.log('PASS real API keeps published bounds, hourly period, currency and unknown gross/net')
  await page.goto(`/offers/${fixture.offer_id}`)
  await page.getByRole('heading', { name: fixture.title, exact: true }).waitFor()
  const salary = page.locator('.offer-key-facts div').filter({ has: page.getByText('Rémunération', { exact: true }) })
  await salary.getByText(/20,5.*30,75.*heure/).waitFor()
  console.log('PASS real browser displays hourly amounts without annualization')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  console.log('PASS salary detail remains usable on mobile')
  console.log('Salary acceptance: 3 checks passed with real Chrome/API/PostgreSQL; fictitious data only.')
} finally { await browser.close() }
