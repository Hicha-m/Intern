import { expect, test } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

test('coverage distinguishes publication, pagination and errors', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/coverage/', route => route.fulfill({ json: {
    ats_queue: { enrolled: 100, tested: 80, states: { active: 3, waiting: 75, error: 2 }, visible_offers: 12, next_attempt_at: null },
    published_offers: 123, measured_at: new Date().toISOString(), deduplication: { merged: 2, candidate: 3 },
    countries: [{ locations__country_code: 'DE', offers: 100 }, { locations__country_code: 'FR', offers: 40 }],
    providers: [{ provider: 'bundesagentur', offers: 100, queries: { remaining: 2, error: 1 }, boards: { paused: 1 }, errors: [{ code: 'upstream_rate_limited', count: 1 }] }],
  } }))
  await page.goto('/engine')
  await expect(page.getByRole('heading', { name: '123 offres publiées' })).toBeVisible()
  await expect(page.getByText('Emplois informatiques en Europe, non expirés', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Offres par pays' })).toBeVisible()
  await expect(page.getByText('80 / 100 entreprises vérifiées · 3 sources actives · 12 fiches visibles.')).toBeVisible()
  await expect(page.getByText('2 avec pages restantes · 1 en erreur')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Allemagne', exact: true })).toHaveAttribute('href', '/stages?country_codes=DE')
  await page.getByText('Voir les erreurs').click()
  await expect(page.getByText('upstream_rate_limited (1)')).toBeVisible()
  await page.screenshot({ path: '/tmp/intern-engine-coverage-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Actualiser' })).toBeVisible()
  await expect(page.getByText('2 avec pages restantes · 1 en erreur')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Offres publiées' })).toBeVisible()
  await page.screenshot({ path: '/tmp/intern-engine-coverage-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
})

test('coverage fetch failure is recoverable', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/coverage/', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/engine')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '0 offres publiées' })).toHaveCount(0)
})
