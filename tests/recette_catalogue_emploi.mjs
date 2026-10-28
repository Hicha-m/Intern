// Real Chrome → Vite → Django → PostgreSQL, using only the fictitious E1 seed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const baseURL = process.env.RECETTE_URL || 'http://127.0.0.1:5173'
if (!process.env.RECETTE_PASSWORD || !process.env.RECETTE_CATALOGUE_MANIFEST) throw new Error('Set RECETTE_PASSWORD and RECETTE_CATALOGUE_MANIFEST.')
const fixture = JSON.parse(await readFile(process.env.RECETTE_CATALOGUE_MANIFEST, 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  const response = await context.request.get('/api/v1/offers/?q=E1')
  assert.equal(response.status(), 200)
  assert.equal((await response.json()).count, 6)
  for (const contract of ['internship', 'apprenticeship', 'permanent', 'fixed_term', 'contractor', 'unknown']) {
    const list = await context.request.get(`/api/v1/offers/?q=E1&contract_type=${contract}`)
    assert.equal(list.status(), 200)
    const body = await list.json()
    assert.equal(body.count, 1, contract)
    assert.equal(body.results[0].id, fixture[contract].id)
    assert.equal(body.results[0].contract_type, contract)
    const detail = await context.request.get(`/api/v1/offers/${fixture[contract].id}/`)
    assert.equal(detail.status(), 200)
    console.log(`PASS real API list/filter/detail: ${contract}`)
  }
  assert.equal((await context.request.get(`/api/v1/offers/${fixture['outside-it'].id}/`)).status(), 404)
  console.log('PASS non-IT offer excluded from the public list and detail')
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill('alice@example.test')
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.RECETTE_PASSWORD)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await page.waitForURL(/\/dashboard$/)
  await page.goto('/stages?q=E1')
  await page.getByText(fixture.permanent.title, { exact: true }).first().waitFor()
  await page.getByText(fixture.fixed_term.title, { exact: true }).first().waitFor()
  await page.getByText(fixture.permanent.title, { exact: true }).first().click()
  await page.getByRole('heading', { name: fixture.permanent.title, exact: true }).waitFor()
  console.log('PASS real browser: candidate opens a permanent IT offer from the catalogue')
  console.log('E1 acceptance: 8 checks passed; no mocked API or live job source.')
} finally {
  await browser.close()
}
