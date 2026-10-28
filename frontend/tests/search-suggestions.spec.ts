import { test, expect } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

test('suggestions run only for empty searches and preserve filters when chosen with the keyboard', async ({ page }, info) => {
  await prepareDashboard(page)
  const suggestionQueries: URL[] = []
  await page.route('**/api/v1/offers/?*', route => {
    const query = new URL(route.request().url()).searchParams.get('q')
    const results = query === 'pythonn' ? [] : [{ id: 1, title: 'Python Internship', company: { id: 1, name: 'Example' } }]
    return route.fulfill({ json: { results, count: results.length, page: 1, page_size: 36 } })
  })
  await page.route('**/api/v1/offers/suggestions/?*', route => {
    suggestionQueries.push(new URL(route.request().url()))
    return route.fulfill({ json: { suggestions: [{ query: 'Python Internship' }] } })
  })
  await page.goto('/stages?q=Python&country_codes=FR')
  await expect(page.getByRole('heading', { name: 'Python Internship', exact: true })).toBeVisible()
  expect(suggestionQueries).toHaveLength(0)
  await page.goto('/stages?q=pythonn&country_codes=FR&work_mode=remote&sort=newest&page=3')
  const region = page.getByRole('region', { name: 'Suggestions de recherche' })
  await expect(region).toBeVisible()
  expect(suggestionQueries.at(-1)?.searchParams.get('country_codes')).toBe('FR')
  expect(suggestionQueries.at(-1)?.searchParams.get('work_mode')).toBe('remote')
  expect(suggestionQueries.at(-1)?.searchParams.has('page')).toBe(false)
  const link = region.getByRole('link', { name: 'Python Internship' })
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/q=Python\+Internship/)
  await expect(page).toHaveURL(/country_codes=FR&work_mode=remote&sort=newest$/)
  await expect(page).not.toHaveURL(/page=/)
  await expect(region).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Python Internship', exact: true })).toBeVisible()
  await page.goBack()
  await expect(region).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('suggestions-mobile.png'), fullPage: true })
})

test('an unavailable suggestion service keeps the empty result usable', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/?*', route => route.fulfill({ json: { results: [], count: 0, page: 1, page_size: 36 } }))
  await page.route('**/api/v1/offers/suggestions/?*', route => route.fulfill({ status: 503 }))
  await page.goto('/stages?q=pythonn')
  await expect(page.getByRole('heading', { name: 'Aucune offre trouvée' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Suggestions de recherche' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Rechercher', exact: true })).toBeEnabled()
})

test('a stale suggestion response cannot replace a newer successful search', async ({ page }) => {
  await prepareDashboard(page)
  let release: () => void = () => {}
  const delayed = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/offers/?*', route => {
    const query = new URL(route.request().url()).searchParams.get('q')
    const results = query === 'Rust' ? [{ id: 2, title: 'Rust Internship', company: { id: 1, name: 'Example' } }] : []
    return route.fulfill({ json: { results, count: results.length, page: 1, page_size: 36 } })
  })
  let started = false
  await page.route('**/api/v1/offers/suggestions/?*', async route => {
    started = true
    await delayed
    await route.fulfill({ json: { suggestions: [{ query: 'Python Internship' }] } })
  })
  await page.goto('/stages?q=pythonn')
  await expect.poll(() => started).toBe(true)
  const input = page.getByRole('searchbox', { name: 'Rechercher un emploi' })
  await input.fill('Rust')
  await input.press('Enter')
  await expect(page.getByRole('heading', { name: 'Rust Internship', exact: true })).toBeVisible()
  release()
  await expect(page.getByRole('region', { name: 'Suggestions de recherche' })).toHaveCount(0)
  await expect(page).toHaveURL(/q=Rust/)
})
