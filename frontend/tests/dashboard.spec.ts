import { expect, test } from '@playwright/test'
import { dashboard, prepareDashboard } from './fixtures/dashboard'

test('reference composition: four editorial offers, application table and no match percentages', async ({ page }, info) => {
  const requests = await prepareDashboard(page)
  await page.setViewportSize({ width: 1860, height: 1096 })
  await page.goto('/dashboard')
  await expect(page).toHaveTitle('Tableau de bord — Intern')
  await expect(page.locator('.workspace-header')).toHaveCount(0)
  await expect(page.locator('.offer-card')).toHaveCount(4)
  await expect(page.locator('.dashboard-table tbody tr')).toHaveCount(5)
  await expect(page.getByRole('main')).not.toContainText(/\d+%/)
  const cards = await page.locator('.offer-card').all()
  const boxes = await Promise.all(cards.map(card => card.boundingBox()))
  expect(boxes.every(box => box?.y === boxes[0]?.y)).toBe(true)
  await page.screenshot({ path: info.outputPath('dashboard-desktop.png'), fullPage: true })
  await page.getByRole('link', { name: 'Voir l’offre chez Stripe : Software Engineer' }).click()
  await expect(page).toHaveURL(/\/offers\/2$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Software Engineer', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Postuler sur Example' })).toHaveAttribute('href', 'https://example.test/apply')
  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'Blue Origin Software Development Engineer II' }).click()
  await expect(page).toHaveURL(/\/applications\/1$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Software Development Engineer II' })).toBeVisible()
  expect(requests.some(url => /approve|prepare|submit/.test(url.pathname))).toBe(false)
})

test('filters and search use the API, persist in the URL and show an honest empty state', async ({ page }) => {
  const requests = await prepareDashboard(page)
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'À valider', exact: true }).click()
  await expect(page.locator('.dashboard-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.dashboard-table')).toContainText('Dremio')
  await expect(page).toHaveURL(/filter=needs_input/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'À valider', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Échecs' }).click()
  await expect(page.getByText('Aucune candidature dans cette sélection')).toBeVisible()
  await page.getByRole('button', { name: 'Toutes', exact: true }).click()
  await page.goto('/dashboard?q=Stripe')
  await expect(page.locator('.offer-card')).toHaveCount(1)
  expect(requests.some(url => url.searchParams.get('q') === 'Stripe')).toBe(true)
  await page.getByRole('link', { name: 'Tout vérifier', exact: true }).click()
  await expect(page).toHaveURL(/\/a-valider$/)
  await expect(page.locator('.dashboard-table tbody tr')).toHaveCount(1)
})

test('loading, empty and failure states do not invent offers or submissions; retry recovers', async ({ page }) => {
  await prepareDashboard(page)
  let finish!: () => void
  const gate = new Promise<void>(resolve => { finish = resolve })
  await page.route('**/api/v1/dashboard/**', async route => { await gate; await route.fulfill({ status: 503, json: { error: { code: 'unavailable' } } }) })
  await page.goto('/dashboard')
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('link', { name: /Voir l’offre chez/ })).toHaveCount(0)
  finish()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.route('**/api/v1/dashboard/**', route => route.fulfill({ json: { ...dashboard, offers: [], applications: { results: [], count: 0, page: 1, page_size: 8 }, counts: { applications: 0, needs_input: 0 } } }))
  await page.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByText('Aucune candidature')).toBeVisible()
  await expect(page.getByText('Aucune offre disponible')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('responsive layout and keyboard navigation remain usable', async ({ page }, info) => {
  await prepareDashboard(page)
  await page.goto('/dashboard')
  await expect(page.locator('.offer-card')).toHaveCount(4)
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload()
    await expect(page.locator('.offer-card')).toHaveCount(4)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('link', { name: /Tableau de bord/ }).first()).toBeVisible()
    await page.screenshot({ path: info.outputPath(`dashboard-${width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => { document.documentElement.className = 'dark' })
  await page.screenshot({ path: info.outputPath('dashboard-dark.png'), fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Toutes', exact: true }).focus()
  await expect(page.getByRole('button', { name: 'Toutes', exact: true })).toHaveCSS('transition-duration', '0s')
})

test('dashboard uses the catalogue background and shares login typography and buttons', async ({ page }) => {
  await prepareDashboard(page)
  let signedIn = false
  await page.route('**/api/v1/auth/me/', route => route.fulfill(signedIn
    ? { json: { user: { id: 1, username: 'alex', email: 'alex@example.test', onboarding_step: 'complete' } } }
    : { status: 401, json: { error: { code: 'not_authenticated' } } }))
  await page.goto('/login')
  const palette = await page.locator('.auth-layout').evaluate(element => {
    const style = getComputedStyle(element), button = getComputedStyle(document.querySelector('.auth-submit')!)
    return { paper: style.backgroundColor, ink: style.color, font: style.fontFamily, action: button.backgroundColor, radius: button.borderRadius }
  })
  signedIn = true
  await page.goto('/dashboard')
  await expect(page.locator('.offer-card')).toHaveCount(4)
  const catalogueBackground = await page.locator('.workspace').evaluate(element => {
    const sample = document.createElement('div')
    sample.style.backgroundColor = 'var(--dashboard-card)'
    element.append(sample)
    const color = getComputedStyle(sample).backgroundColor
    sample.remove()
    return color
  })
  await expect(page.locator('.workspace')).toHaveCSS('background-color', catalogueBackground)
  await expect(page.locator('.workspace')).toHaveCSS('color', palette.ink)
  await expect(page.locator('.workspace')).toHaveCSS('font-family', palette.font)
  const action = page.getByRole('link', { name: 'Tout vérifier', exact: true })
  await expect(action).toHaveClass('dashboard-text-link')
})

test('horizontal navigation and account stay above content on every candidate page', async ({ page }) => {
  await prepareDashboard(page)
  const email = 'candidate.with.a.long.address@example.test'
  await page.route('**/api/v1/auth/me/', route => route.fulfill({ json: { user: { id: 1, username: 'candidate', email, onboarding_step: 'complete' } } }))
  await page.route('**/api/v1/dashboard/**', route => route.fulfill({ json: { ...dashboard, full_name: '' } }))
  await page.setViewportSize({ width: 1440, height: 720 })
  await page.goto('/dashboard')
  await expect(page.locator('.offer-card')).toHaveCount(4)
  const account = page.locator('.workspace-account')
  const contained = () => account.evaluate(element => {
    const account = element.getBoundingClientRect()
    const navbar = element.closest('.workspace-navbar')!.getBoundingClientRect()
    return account.left >= navbar.left && account.right <= navbar.right && account.bottom <= navbar.bottom
  })
  expect(await contained()).toBe(true)
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeInViewport()
  for (const path of ['/dashboard', '/stages', '/candidatures', '/a-valider', '/tracker', '/profil', '/offers/2', '/applications/1']) {
    await page.goto(path)
    const navbar = page.locator('.workspace-navbar')
    await expect(navbar).toBeVisible()
    await expect(page.locator('.workspace-sidebar')).toHaveCount(0)
    const bounds = await navbar.boundingBox()
    const main = await page.locator('.workspace-main').boundingBox()
    expect(main!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height)
    const active = page.getByRole('navigation', { name: 'Navigation principale' }).locator('[aria-current="page"]')
    await expect(active).toHaveCount(1)
    expect(await contained()).toBe(true)
  }
  await page.goto('/dashboard')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.locator('.offer-card')).toHaveCount(4)
  expect(await contained()).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('settings is absent from navigation and old links open the profile', async ({ page }) => {
  await prepareDashboard(page)
  await page.goto('/dashboard')
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Paramètres' })).toHaveCount(0)
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible()
})
