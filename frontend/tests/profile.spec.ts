import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

async function prepare(page: Page) {
  await prepareDashboard(page)
  let profile = { full_name: 'Alex Morgan', first_name: '', last_name: '', headline: '', phone: '', presentation: '', location_text: 'Paris, France', available_from: null, current_resume_id: 42, skill_ids: [1] }
  let prefs = { contracts: ['internship'], work_modes: ['hybrid'], role_ids: [], location_ids: [], minimum_salary: null, salary_currency: null, salary_period: null, salary_gross_net: 'gross', willing_to_relocate: null }
  const children: Record<string, Record<string, unknown>[]> = { experiences: [], education: [], projects: [], 'work-authorizations': [{ id: 8, country_code: 'FR', authorized: null, needs_sponsorship: false }] }
  const writes: { path: string; method: string; body: Record<string, unknown> }[] = []
  let fail = false
  await page.route('**/api/v1/auth/csrf/', route => route.fulfill({ json: { csrf_token: 'profile-csrf' } }))
  await page.route(/\/api\/v1\/(profile|preferences|catalogue|onboarding|documents)\//, async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', ''), method = request.method()
    const body = method === 'GET' || method === 'DELETE' ? {} : request.postDataJSON()
    if (method !== 'GET') {
      expect(request.headers()['x-csrftoken']).toBe('profile-csrf')
      writes.push({ path, method, body })
      if (fail) return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Service indisponible. Réessayez.' } } })
    }
    if (path === '/profile/') { if (method === 'PATCH') profile = { ...profile, ...body }; return route.fulfill({ json: profile }) }
    if (path === '/preferences/') { if (method === 'PUT') prefs = { ...prefs, ...body }; return route.fulfill({ json: prefs }) }
    if (path === '/onboarding/' || path === '/onboarding/address/') return route.fulfill({ json: { address: { street_address: '1 rue Exemple', city: 'Paris', postal_code: '75001', district: '', region: '', country_code: 'FR' }, citizenships: ['FR'], countries: ['FR', 'MA', 'US'] } })
    if (path === '/documents/') return route.fulfill({ json: { results: [{ id: 42, original_name: 'Alex_Morgan.pdf', kind: 'resume', status: 'ready', byte_size: 1024 }], count: 1, page: 1, page_size: 100 } })
    if (path === '/catalogue/') return route.fulfill({ json: { results: [{ id: 1, name: url.searchParams.get('kind') === 'skills' ? 'TypeScript' : 'Software Engineer' }, { id: 2, name: 'Python' }], count: 2, page: 1, page_size: 20 } })
    const match = path.match(/^\/profile\/([^/]+)\/(?:(\d+)\/)?$/)
    if (match && children[match[1]]) {
      const kind = match[1], id = Number(match[2])
      if (method === 'POST') { const item = { id: 9, ...body }; children[kind].push(item); return route.fulfill({ json: item }) }
      if (method === 'PATCH') { const item = children[kind].find(row => row.id === id)!; Object.assign(item, body); return route.fulfill({ json: item }) }
      if (method === 'DELETE') { children[kind] = children[kind].filter(row => row.id !== id); return route.fulfill({ status: 204 }) }
      return route.fulfill({ json: { results: children[kind], count: children[kind].length, page: 1, page_size: 10 } })
    }
    return route.fulfill({ status: 404, json: { error: { code: 'not_found' } } })
  })
  return { writes, fail: (value: boolean) => { fail = value } }
}

test('profile edits persist without inferring identity or discarding another section draft', async ({ page }) => {
  const { writes } = await prepare(page)
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Modifier Informations personnelles' }).click()
  await expect(page.getByLabel('Prénom', { exact: true })).toHaveValue('')
  await page.getByLabel('Prénom', { exact: true }).fill('Alex')
  await page.getByLabel('Nom de famille', { exact: true }).fill('Morgan')
  await page.getByLabel('Titre du profil', { exact: true }).fill('Software Engineer')
  await page.getByRole('button', { name: 'Ajouter Projets' }).click()
  await page.getByLabel('Nom du projet', { exact: false }).fill('Draft project')
  await page.locator('#identity').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Modifications enregistrées.' })).toBeVisible()
  await expect(page.locator('#identity .auth-notice')).toHaveCount(0)
  await page.getByRole('button', { name: 'Fermer la notification' }).click()
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  await expect(page.getByLabel('Nom du projet', { exact: false })).toHaveValue('Draft project')
  await page.locator('#projects').getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.reload()
  await expect(page.locator('#identity')).toContainText('Software Engineer')
  expect(writes[0].body.first_name).toBe('Alex')
  expect(writes[0].body).not.toHaveProperty('skill_ids')
})

test('experience CRUD, dates, null answers and failure preserve entered values', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Ajouter Expériences' }).click()
  await page.getByLabel('Intitulé du poste').fill('Développeur')
  await page.getByLabel('Entreprise ou organisation').fill('Example')
  await page.getByLabel('Mois et année de début', { exact: true }).fill('2026-05')
  await page.getByLabel('Mois et année de fin', { exact: true }).fill('2025-05')
  await page.locator('#experiences').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('date de fin')
  expect(state.writes).toHaveLength(0)
  await page.getByLabel('En cours', { exact: true }).selectOption('true')
  state.fail(true)
  await page.locator('#experiences').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Service indisponible')
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  await expect(page.getByLabel('Intitulé du poste')).toHaveValue('Développeur')
  state.fail(false)
  await page.locator('#experiences').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('#experiences').getByRole('heading', { name: 'Développeur' })).toBeVisible()
  await expect(page.locator('#experiences')).toContainText('Example')
  await expect(page.locator('#experiences')).toContainText('En cours')
  expect(state.writes.at(-1)?.body).toMatchObject({ start_date: '2026-05-01', end_date: null, date_precision: 'month' })
  await expect(page.locator('#experiences .profile-record-period')).toHaveText('mai 2026 — En cours')
  await page.getByRole('button', { name: 'Modifier Développeur' }).click()
  await expect(page.getByLabel('Mois et année de début')).toHaveValue('2026-05')
  await page.getByLabel('Intitulé du poste').fill('Ingénieur logiciel')
  await page.locator('#experiences').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer Ingénieur logiciel' }).click()
  expect(state.writes.at(-1)?.method).toBe('PATCH')
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(page.locator('#experiences').getByRole('heading', { name: 'Expériences' })).toBeVisible()
  await expect(page.locator('#experiences').getByRole('button', { name: 'Ajouter Expériences' })).toBeVisible()
  await page.getByRole('button', { name: 'Modifier France', exact: true }).click()
  await expect(page.getByLabel('Autorisé à travailler', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Besoin d’un visa sponsorisé')).toHaveValue('false')
})

test('skills and preferences send catalogue IDs and valid contract/salary values', async ({ page }) => {
  const { writes } = await prepare(page)
  await page.goto('/profil')
  await expect(page.locator('#preferences')).toContainText('Stage')
  await expect(page.locator('#preferences')).not.toContainText('Base de rémunération')
  await page.getByRole('button', { name: 'Modifier Compétences', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Python', exact: true }).check()
  await page.locator('#skills').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Modifications enregistrées.' })).toBeVisible()
  await expect(page.locator('#skills')).toContainText('Python')
  expect(writes.at(-1)?.body).toEqual({ skill_ids: [1, 2] })
  await page.getByRole('button', { name: 'Modifier Préférences de recherche' }).click()
  await page.getByRole('checkbox', { name: 'Emploi salarié' }).check()
  await page.getByLabel('Rémunération minimum', { exact: true }).fill('1200')
  await page.locator('#preferences').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('devise et la période')
  await page.getByLabel('Devise', { exact: true }).fill('eur')
  await page.getByLabel('Période', { exact: true }).selectOption('month')
  await page.locator('#preferences').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('#preferences').getByRole('button', { name: 'Modifier Préférences de recherche' })).toBeVisible()
  expect(writes.at(-1)?.body).toMatchObject({ salary_currency: 'EUR', salary_period: 'month', minimum_salary: '1200', contracts: ['internship', 'employment'] })
})

test('mobile and desktop profile, embedded resume and cancel focus', async ({ page }, info) => {
  await prepare(page)
  await page.goto('/profil')
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Télécharger mon CV actuel' })).toHaveAttribute('href', '/api/v1/documents/42/download/')
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect(page.locator('#identity')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`profile-${width}.png`), fullPage: false })
  }
  await page.getByRole('button', { name: 'Modifier Informations personnelles' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('Nom affiché').fill('À annuler')
  await page.locator('#identity').getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Modifier Informations personnelles' })).toBeFocused()
  await expect(page.locator('#identity')).not.toContainText('À annuler')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.evaluate(() => { document.documentElement.className = 'dark' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#identity').scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath('profile-dark.png') })
  await page.getByRole('button', { name: 'Modifier Informations personnelles' }).click()
  await expect(page.getByLabel('Nom affiché')).toBeFocused()
  await expect(page.locator('#identity form')).toBeVisible()
  await page.screenshot({ path: info.outputPath('profile-editor-dark.png') })
})


test('profile read failure retries and section errors do not hide the rest of the page', async ({ page }) => {
  await prepare(page)
  let unavailable = true
  await page.route('**/api/v1/profile/', async route => {
    if (unavailable) return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Profil indisponible' } } })
    return route.fallback()
  })
  await page.goto('/profil')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier Informations personnelles' })).toHaveCount(0)
  unavailable = false
  await page.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByRole('button', { name: 'Modifier Informations personnelles' })).toBeVisible()
  await page.route('**/api/v1/profile/education/**', route => route.fulfill({ status: 503, json: { error: { code: 'unavailable' } } }))
  await page.reload()
  await expect(page.locator('#education').getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier Informations personnelles' })).toBeVisible()
})

test('address and project forms send only their fields; unsaved edits can block navigation', async ({ page }) => {
  const { writes } = await prepare(page)
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Modifier Adresse' }).click()
  await page.getByLabel('Ville', { exact: false }).fill('Lyon')
  await page.locator('#address').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Modifications enregistrées.' })).toBeVisible()
  expect(writes.at(-1)).toMatchObject({ path: '/onboarding/address/', method: 'PUT', body: { city: 'Lyon', country_code: 'FR' } })
  expect(writes.at(-1)?.body).not.toHaveProperty('citizenships')
  await page.getByRole('button', { name: 'Ajouter Projets' }).click()
  await page.getByLabel('Nom du projet').fill('Portfolio')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: 'Tableau de bord', exact: true }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Portfolio')
  await page.locator('#projects').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('#projects').getByRole('heading', { name: 'Portfolio' })).toBeVisible()
  expect(writes.at(-1)).toMatchObject({ path: '/profile/projects/', method: 'POST', body: { title: 'Portfolio', url: null, description: '' } })
})


test('profile opens on editable information and mobile navigation reaches a section', async ({ page }) => {
  await prepare(page)
  await page.goto('/profil')
  await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier Informations personnelles' })).toBeInViewport()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('navigation', { name: 'Rubriques du profil' }).getByRole('link', { name: 'Candidatures' }).click()
  await expect(page).toHaveURL(/#preferences$/)
  await expect(page.getByRole('heading', { name: 'Préférences de recherche', exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Modifier Préférences de recherche' })).toBeInViewport()
})


test('profile anchors focus their section and keep drafts when moving between panels', async ({ page }) => {
  await prepare(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/profil#identity')
  await expect(page.getByRole('heading', { name: 'Informations personnelles', exact: true })).toBeFocused()
  const navigation = page.getByRole('navigation', { name: 'Rubriques du profil' })
  await page.getByRole('button', { name: 'Modifier Informations personnelles' }).click()
  await page.getByLabel('Prénom', { exact: true }).fill('Draft')
  await navigation.getByRole('link', { name: 'CV' }).click()
  await expect(page).toHaveURL(/#resume$/)
  await expect(page.getByRole('heading', { name: 'CV', exact: true })).toBeFocused()
  await page.evaluate(() => { window.location.hash = 'identity' })
  await expect(page.getByLabel('Prénom', { exact: true })).toHaveValue('Draft')
  await page.locator('#identity').getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Modifier Informations personnelles' })).toBeFocused()
  await navigation.getByRole('link', { name: 'Parcours' }).click()
  await expect(page.getByRole('heading', { name: 'Présentation', exact: true })).toBeFocused()
})


test('education accepts years and preserves them when editing', async ({ page }) => {
  const { writes } = await prepare(page)
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Ajouter Formations' }).click()
  await page.getByLabel('Établissement').fill('Polytech')
  await page.getByLabel('Année de début', { exact: true }).fill('2024')
  await page.getByLabel('Année de fin', { exact: true }).fill('2028')
  await page.locator('#education').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('#education .profile-record-period')).toHaveText('2024 — 2028')
  expect(writes.at(-1)?.body).toMatchObject({ start_date: '2024-01-01', end_date: '2028-01-01', date_precision: 'year' })
  await page.getByRole('button', { name: 'Modifier Polytech' }).click()
  await expect(page.getByLabel('Année de début', { exact: true })).toHaveValue('2024')
  await expect(page.getByLabel('Année de fin', { exact: true })).toHaveValue('2028')
  await expect(page.getByLabel('Précision des dates')).toHaveCount(0)
})
