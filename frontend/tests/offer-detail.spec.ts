import { test, expect } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

const offer = { id: 2, title: 'Sommerjobb 2027 – Design', company: { id: 1, name: 'Sopra Steria' }, locations: [{ name: 'Oslo, Norway' }], description: 'Vil du tilbringe neste sommer på en av Norges beste arbeidsplasser?\n\nEn sommer som gir deg et innblikk i konsulentverdenen, prosjektarbeid og nytt nettverk.\n\nI løpet av sommeren hos oss vil du:\n• Jobbe med design\n• Samarbeide med teamet', quality: { classification: 'confirmed', domain: 'design-arts' }, facts: { duration: { value: { minimum: 6, maximum: 6, unit: 'weeks' }, evidence_text: '6 ukers periode' } }, sources: [{ id: 1, provider: 'SmartRecruiters', apply_url: 'https://example.test/apply' }], last_verified_at: '2026-09-30T18:00:00Z' }

test('offer detail prioritizes application and readable description across viewports', async ({ page }, info) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: offer }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/offers/2')
  const apply = page.getByRole('link', { name: 'Postuler sur SmartRecruiters' })
  await expect(apply).toBeInViewport()
  await expect(apply).toHaveAttribute('target', '_blank')
  await expect(apply).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByText('6 semaines', { exact: true })).toBeVisible()
  await expect(page.locator('.offer-description-copy p')).toHaveCount(3)
  await expect(page.getByText('6 ukers periode', { exact: true })).toBeHidden()
  await page.getByText('Informations extraites et preuves').click()
  await expect(page.getByText('6 ukers periode', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('offer-detail-desktop.png'), fullPage: true })
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const application = await page.locator('.offer-application-panel').boundingBox()
    const description = await page.locator('.offer-description-panel').boundingBox()
    expect(application!.y).toBeLessThan(description!.y)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('offer-detail-mobile.png'), fullPage: true })
})

test('detail handles missing description and rejects unsafe application URLs', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, description: '', facts: {}, sources: [{ id: 1, provider: 'Unsafe', apply_url: 'javascript:alert(1)' }] } }))
  await page.goto('/offers/2')
  await expect(page.getByText('Aucun lien de candidature disponible pour le moment.')).toBeVisible()
  await expect(page.getByText('La description n’est pas disponible.', { exact: false })).toBeVisible()
  await expect(page.locator('.offer-key-facts dd')).toHaveText(['Non précisé', 'Non précisé', 'Non précisé'])
  await expect(page.locator('.offer-primary-apply')).toHaveCount(0)
})

test('back to catalogue keeps search and page', async ({ page }) => {
  await prepareDashboard(page)
  await page.goto('/stages?q=software&country_codes=FR&page=2')
  const firstCard = page.locator('.catalogue-card').first()
  await expect(firstCard.getByRole('link')).toHaveCount(1)
  await expect(firstCard.getByRole('link', { name: /^Postuler/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Voir l’offre : Software Engineer chez Stripe', exact: true }).first().click()
  await expect(page.getByRole('link', { name: 'Toutes les offres', exact: true })).toHaveAttribute('href', '/stages?q=software&country_codes=FR&page=2')
  await page.getByRole('link', { name: 'Toutes les offres', exact: true }).click()
  await expect(page).toHaveURL(/q=software&country_codes=FR&page=2/)
})

test('source text has readable headings and lists without interpreting markup', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, description: 'À propos du poste\n\nRecherche &amp; développement\nsur plusieurs lignes.\n\nPrincipales responsabilités :\n\n• Tester le produit\n• Documenter les résultats\n\n<script>alert(1)</script>' } }))
  await page.goto('/offers/2')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(offer.title)
  await expect(page.getByRole('heading', { name: 'Principales responsabilités :' })).toBeVisible()
  await expect(page.locator('.offer-description-copy li')).toHaveText(['Tester le produit', 'Documenter les résultats'])
  await expect(page.locator('.offer-description-copy')).toContainText('Recherche & développement sur plusieurs lignes.')
  await expect(page.locator('.offer-description-copy script')).toHaveCount(0)
  await expect(page.locator('.offer-description-copy')).toContainText('<script>alert(1)</script>')
})
