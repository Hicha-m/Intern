// Real recruiter → catalogue → candidate acceptance on the isolated fictitious DB.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const baseURL = process.env.RECETTE_URL || 'http://127.0.0.1:5173'
const password = process.env.RECETTE_PASSWORD
if (!password) throw new Error('Set RECETTE_PASSWORD to the fictitious DEV password.')
const prefix = `E13${Date.now()}`
const cases = [
  ['internship', 'entry', 'Stage'], ['apprenticeship', 'entry', 'Alternance'],
  ['permanent', 'senior', 'CDI'], ['fixed_term', 'mid', 'CDD'],
  ['contractor', 'lead', 'Mission indépendante'], ['unknown', 'unknown', 'Contrat non précisé'],
  ['employment', 'unknown', 'Emploi salarié (durée non précisée)'],
  ['temporary', 'mid', 'Temporaire (durée non précisée)'],
]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function login(page, email) {
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await page.waitForURL(email.startsWith('recruteur') ? /\/recruiter\/dashboard$/ : /\/dashboard$/)
}
try {
  const recruiter = await browser.newContext({ baseURL })
  const page = await recruiter.newPage()
  await login(page, 'recruteur_a@example.test')
  const created = []
  for (const [contract, seniority, label] of cases) {
    await page.goto('/recruiter/jobs/new')
    await page.getByLabel('Intitulé du poste').fill(`${prefix} Backend Engineer ${label}`)
    await page.getByLabel('Ville / localisation').fill('Paris')
    await page.getByLabel('Type de contrat', { exact: true }).selectOption(contract)
    await page.getByLabel('Séniorité', { exact: true }).selectOption(seniority)
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByLabel('Missions et description').fill('Construire et maintenir des services backend avec notre équipe informatique.')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByRole('button', { name: 'Continuer' }).click()
    const published = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/recruiter/jobs/' && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Publier l’offre' }).click()
    const response = await published
    assert.equal(response.status(), 201, await response.text())
    const job = await response.json()
    assert.equal(job.contract_type, contract)
    assert.equal(job.seniority, seniority)
    created.push(job)
    await page.waitForURL(/\/recruiter\/jobs$/)
    console.log(`PASS real recruiter wizard/publication: ${contract} / ${seniority}`)
  }
  const candidate = await browser.newContext({ baseURL })
  const reader = await candidate.newPage()
  await login(reader, 'alice@example.test')
  for (const [contract, seniority, label] of cases) {
    await reader.goto(`/stages?q=${prefix}&contract_type=${contract}&seniority=${seniority}`)
    if (contract === 'employment') await reader.setViewportSize({ width: 390, height: 844 })
    const card = reader.locator('.catalogue-card').filter({ hasText: `${prefix} Backend Engineer ${label}` })
    await card.getByRole('heading').waitFor()
    if (contract === 'employment') assert.ok(await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    assert.ok((await card.locator('.catalogue-card-meta').textContent()).includes(label))
    const response = await candidate.request.get(`/api/v1/offers/?q=${prefix}&contract_type=${contract}&seniority=${seniority}`)
    assert.equal(response.status(), 200)
    const result = await response.json()
    assert.equal(result.count, 1)
    assert.equal(result.results[0].contract_type, contract)
    assert.equal(result.results[0].seniority, seniority)
    await card.getByRole('link').click()
    await reader.locator('.offer-detail-tags').getByText(label, { exact: true }).waitFor()
    console.log(`PASS real candidate filter/card/detail: ${contract} / ${seniority}`)
  }
  const csrf = (await (await candidate.request.get('/api/v1/auth/csrf/')).json()).csrf_token
  const forbidden = await candidate.request.post('/api/v1/recruiter/jobs/', { data: { title: 'Forbidden' }, headers: { 'X-CSRFToken': csrf } })
  assert.equal(forbidden.status(), 403)
  console.log('PASS candidate cannot create recruiter jobs')
  const other = await browser.newContext({ baseURL })
  const otherPage = await other.newPage()
  await login(otherPage, 'recruteur_b@example.test')
  assert.equal((await other.request.get(`/api/v1/recruiter/jobs/${created[0].id}/`)).status(), 404)
  console.log('PASS recruiter cannot read another owner’s job')
  console.log(`Employment flows acceptance: ${cases.length * 2 + 2} checks passed on real Chrome/API/PostgreSQL, including generic-contract mobile layout; fictitious accounts only.`)
} finally {
  await browser.close()
}
