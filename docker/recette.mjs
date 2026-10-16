// Browser acceptance against the real, isolated three-container deployment.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../frontend/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const base = process.env.RECETTE_URL || 'http://127.0.0.1:8080'
const docs = fileURLToPath(new URL('./docs/', import.meta.url))
await mkdir(docs, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 960 } })
const page = await context.newPage()
const errors = []
const origins = new Set()
page.on('pageerror', error => errors.push(error.message))
context.on('request', request => {
  const url = new URL(request.url())
  if (url.pathname.startsWith('/api/')) origins.add(url.origin)
})
const results = []
async function check(label, action) {
  await action()
  results.push(`PASS — ${label}`)
  console.log(results.at(-1))
}
async function login(email, destination) {
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill('Intern-Demo-2026!')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await page.waitForURL(url => url.pathname === destination)
}
try {
  await check('chaîne proxy/API/PostgreSQL et CSRF', async () => {
    assert.equal((await context.request.get('/health/ready/')).status(), 200)
    assert.equal((await context.request.get('/api/v1/auth/me/')).status(), 401)
    assert.equal((await context.request.post('/api/v1/auth/login/', {
      data: { username: 'alice@example.test', password: 'Intern-Demo-2026!' },
    })).status(), 403)
  })
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').waitFor()
  await page.screenshot({ path: docs + 'connexion.png', fullPage: true })
  await check('connexion candidat, données réelles et session après rechargement', async () => {
    await login('alice@example.test', '/dashboard')
    await page.locator('.dashboard-table tbody .application-position').first().waitFor()
    await page.reload()
    await page.locator('.dashboard-table tbody .application-position').first().waitFor()
    assert.equal((await context.request.get('/api/v1/applications/')).status(), 200)
    await page.screenshot({ path: docs + 'candidat.png', fullPage: true })
  })
  await check('catalogue SQL et CV privé', async () => {
    assert.equal((await (await context.request.get('/api/v1/offers/')).json()).count, 4)
    const profile = await (await context.request.get('/api/v1/profile/')).json()
    const response = await context.request.get(`/api/v1/documents/${profile.current_resume_id}/download/`)
    assert.equal(response.status(), 200)
    assert.equal((await response.body()).subarray(0, 5).toString(), '%PDF-')
    assert.equal((await context.request.get('/api/v1/recruiter/dashboard/')).status(), 403)
  })
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click()
  await page.waitForURL(url => url.pathname === '/login')
  await check('connexion recruteur, offres et candidatures', async () => {
    await login('recruteur_a@example.test', '/recruiter/dashboard')
    await page.getByRole('heading', { name: /^Bonjour / }).waitFor()
    assert.equal((await context.request.get('/api/v1/recruiter/jobs/')).status(), 200)
    assert.equal((await context.request.get('/api/v1/recruiter/candidates/')).status(), 200)
    await page.screenshot({ path: docs + 'recruteur.png', fullPage: true })
  })
  await check('administration et statiques', async () => {
    assert.equal((await context.request.get('/admin/login/')).status(), 200)
    assert.match((await context.request.get('/static/admin/css/base.css')).headers()['content-type'], /text\/css/)
  })
  await check('client mobile, origine unique et absence d’erreur JavaScript', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/recruiter/jobs')
    await page.getByRole('heading', { name: 'Vos prochaines rencontres.' }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual([...origins], [new URL(base).origin])
    assert.deepEqual(errors, [])
  })
  try {
    const services = await readFile(docs + 'services.txt', 'utf8')
    const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.setContent(`<html><body style="padding:32px;font:20px monospace;background:#161b22;color:#eee"><h1>Intern — trois services Docker</h1><p>Sortie réelle de Docker Compose ; voir services.txt.</p><pre style="font-size:15px;white-space:pre-wrap">${escape(services)}</pre></body></html>`)
    await page.screenshot({ path: docs + 'trois-services.png', fullPage: true })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  await writeFile(docs + 'recette.txt', results.join('\n') + `\nNavigateur : ${browser.version()}\nOrigine : ${base}\n`)
} finally {
  await context.close()
  await browser.close()
}
