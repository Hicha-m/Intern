import { test, expect } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

async function catalogue(page: import('@playwright/test').Page, count = 148) {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page') ?? 1)
    const results = Array.from({ length: Math.max(0, Math.min(12, count - (current - 1) * 12)) }, (_, index) => ({ id: (current - 1) * 12 + index + 1, title: `Stage ${index + 1}`, company: { id: 1, name: 'Entreprise' } }))
    return route.fulfill({ json: { results, count, page: current, page_size: 12 } })
  })
}

test('numbered pagination preserves filters, handles boundaries and focuses new results', async ({ page }, info) => {
  await catalogue(page)
  await page.goto('/stages?q=software&country_codes=FR&page=6')
  const nav = page.getByRole('navigation', { name: 'Pages des offres' })
  await expect(page.getByText('61–72 sur 148 offres')).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Page 6', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Page 13', exact: true })).toHaveAttribute('href', /q=software&country_codes=FR&page=13#offers-results/)
  await expect(nav.locator('.pagination-ellipsis')).toHaveCount(2)
  await page.screenshot({ path: info.outputPath('pagination-desktop.png'), fullPage: true })
  await nav.getByRole('link', { name: 'Page suivante', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/page=7/)
  await expect(page.locator('#offers-results')).toBeFocused()
  await expect(page.locator('#offers-results')).toBeInViewport()
  await expect(page.getByText('73–84 sur 148 offres')).toBeVisible()
  await nav.getByRole('link', { name: 'Page 13', exact: true }).click()
  await expect(page.getByText('145–148 sur 148 offres')).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Page suivante' })).toHaveCount(0)
  await nav.getByRole('link', { name: 'Page 1', exact: true }).click()
  await expect(page).toHaveURL(/q=software&country_codes=FR#offers-results$/)
  await expect(nav.getByRole('link', { name: 'Page précédente' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goBack()
  await expect(page.getByText('145–148 sur 148 offres')).toBeVisible()
})

test('mobile pagination stays compact and supports touch-sized links', async ({ page }, info) => {
  await catalogue(page)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/stages?page=2')
  const nav = page.getByRole('navigation', { name: 'Pages des offres' })
  await nav.scrollIntoViewIfNeeded()
  await expect(nav.getByText('Page 2 sur 13')).toBeVisible()
  await expect(nav.locator('.pagination-pages')).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const next = nav.getByRole('link', { name: 'Page suivante' })
  expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await page.screenshot({ path: info.outputPath('pagination-mobile.png') })
  await next.click()
  await expect(page).toHaveURL(/page=3/)
  await expect(page.locator('#offers-results')).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(next).toHaveCSS('transition-duration', '0s')
})

for (const count of [0, 8]) {
  test(`pagination is absent with ${count} offers`, async ({ page }) => {
    await catalogue(page, count)
    await page.goto('/stages')
    await expect(page.getByRole('heading', { name: 'Emplois informatiques en Europe' })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Chargement des offres…' })).toHaveCount(0)
    await expect(page.locator('.offers-count').last()).toHaveText(String(count))
    await expect(page.getByRole('navigation', { name: 'Pages des offres' })).toHaveCount(0)
  })
}
