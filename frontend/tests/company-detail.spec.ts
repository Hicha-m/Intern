import { test, expect, type Page } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

const source = { source_url: 'https://stripe.com/about', observed_at: '2026-09-30T17:00:00Z', source_kind: 'employer' }
const company = {
  id: 1, name: 'Stripe', domain: 'stripe.com', website_url: 'https://stripe.com', description: '', offers_count: 14,
  hiring_locations: [{ locations__name: 'Paris', locations__city: 'Paris', locations__country_code: 'FR' }],
  profile: { facts: [{ ...source, key: 'industry', label: 'Secteur', value: 'Infrastructure financière' }],
    sections: [{ ...source, key: 'presentation', label: 'Présentation', value: 'Stripe développe une infrastructure financière pour les entreprises.\n\nSes outils permettent de gérer les paiements.' }, { ...source, key: 'early_careers', label: 'Stages et jeunes talents', value: 'Accompagnement par un mentor pour les jeunes talents.', scope: 'Programme jeunes talents' }],
    updated_at: source.observed_at, missing_sections: [{ key: 'benefits', label: 'Avantages et conditions de travail' }, { key: 'recruitment', label: 'Processus de recrutement' }] },
}
const offers = Array.from({ length: 14 }, (_, i) => ({ id: i + 2, title: `Software internship ${i + 1}`, company: { id: 1, name: 'Stripe' }, locations: [{ name: 'Paris', country_code: 'FR' }] }))

async function prepare(page: Page) {
  await prepareDashboard(page)
  await page.route('**/api/v1/companies/1/', route => route.fulfill({ json: company }))
  await page.route('**/api/v1/companies/1/offers/?*', route => {
    const params = new URL(route.request().url()).searchParams
    const number = Number(params.get('page') ?? '1')
    const results = params.has('q') ? offers.filter(offer => offer.title.includes(params.get('q')!)) : offers
    return route.fulfill({ json: { results: results.slice((number - 1) * 12, number * 12), count: results.length, page: number, page_size: 12 } })
  })
  await page.route('**/api/v1/recommendations/?*', route => {
    expect(new URL(route.request().url()).searchParams.get('company')).toBe('1')
    return route.fulfill({ json: { results: [{ offer: offers[0], reasons: [{ code: 'preferred_role' }, { code: 'profile_skills' }], ranking: { score: 16 } }], count: 1, page: 1, page_size: 12 } })
  })
  await page.route(/\/api\/v1\/offers\/\d+\/$/, route => {
    const id = Number(new URL(route.request().url()).pathname.split('/').at(-2))
    return route.fulfill({ json: { ...offers.find(offer => offer.id === id), description: 'Work with the engineering team on software projects.', sources: [] } })
  })
}

test('company page presents sources, all jobs and responsive layout', async ({ page }, info) => {
  await prepare(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/companies/1')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stripe')
  await expect(page.getByText('14 offres en Europe sur Intern')).toBeVisible()
  await expect(page.locator('.company-key-info').getByText('Paris · France')).toBeVisible()
  await expect(page.locator('.catalogue-card')).toHaveCount(12)
  await expect(page.getByRole('link', { name: 'Site de l’entreprise' })).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByRole('link', { name: 'Source entreprise' }).first()).toHaveAttribute('href', source.source_url)
  await page.getByText('Informations encore à compléter', { exact: true }).click()
  await expect(page.getByText('Processus de recrutement', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('company-desktop.png'), fullPage: true })
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('company-mobile.png'), fullPage: true })
})

test('company feed pagination, search and recommendations keep company scope', async ({ page }) => {
  await prepare(page)
  await page.goto('/companies/1')
  await page.getByRole('link', { name: 'Page suivante' }).click()
  await expect(page).toHaveURL(/companies\/1\?page=2/)
  await expect(page.locator('.catalogue-card')).toHaveCount(2)
  await page.getByRole('searchbox', { name: 'Rechercher un poste' }).fill('internship 14')
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click()
  await expect(page.locator('.catalogue-card')).toHaveCount(1)
  await expect(page).not.toHaveURL(/page=2/)
  await page.getByRole('button', { name: 'Pour vous', exact: true }).click()
  await expect(page.locator('.company-match-reasons')).toHaveText('Poste recherché · Compétences en commun')
  await expect(page.getByRole('button', { name: 'Pour vous', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Toutes les offres', exact: true }).click()
  await expect(page.locator('.catalogue-card')).toHaveCount(1)
})

test('company links connect offer details and preserve return to company feed', async ({ page }) => {
  await prepare(page)
  await page.goto('/offers/2')
  await page.getByRole('link', { name: 'Découvrir Stripe' }).click()
  await expect(page).toHaveURL('/companies/1')
  await page.getByRole('link', { name: 'Page suivante' }).click()
  await page.getByRole('link', { name: /^Voir l’offre :/ }).first().click()
  const back = page.getByRole('link', { name: 'Retour à l’entreprise' })
  await expect(back).toHaveAttribute('href', '/companies/1?page=2')
  await back.click()
  await expect(page.locator('.catalogue-card')).toHaveCount(2)
})

test('missing information, literal employer markup and unsafe links stay explicit', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/v1/companies/1/', route => route.fulfill({ json: { ...company, website_url: 'javascript:alert(1)', profile: { ...company.profile, facts: [], sections: [{ ...source, key: 'presentation', label: 'Présentation', value: '<script>window.unsafe = true</script>' }] } } }))
  await page.goto('/companies/1')
  await expect(page.getByRole('link', { name: 'Site de l’entreprise' })).toHaveCount(0)
  await expect(page.locator('.company-prose')).toContainText('<script>window.unsafe = true</script>')
  await expect(page.locator('.company-prose script')).toHaveCount(0)
  await expect(page.locator('.company-key-info dd').filter({ hasText: 'Non renseigné' })).toHaveCount(4)
  await page.route('**/api/v1/companies/1/', route => route.fulfill({ json: { ...company, description: '', profile: { ...company.profile, sections: [] } } }))
  await page.reload()
  await expect(page.getByText('La présentation de cette entreprise n’est pas encore disponible.', { exact: false })).toBeVisible()
})

test('company request errors can be retried and empty feeds remain useful', async ({ page }) => {
  await prepare(page)
  let unavailable = true
  await page.route('**/api/v1/companies/1/', route => unavailable ? route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Company unavailable' } } }) : route.fulfill({ json: { ...company, offers_count: 0 } }))
  await page.route('**/api/v1/companies/1/offers/?*', route => route.fulfill({ json: { results: [], count: 0, page: 1, page_size: 12 } }))
  await page.goto('/companies/1')
  await expect(page.getByRole('alert')).toBeVisible()
  unavailable = false
  await page.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByRole('heading', { name: 'Aucune offre publiée pour le moment' })).toBeVisible()
})

test('company cards distinguish permanent, legacy and unknown contracts without inferring seniority', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/v1/companies/1/offers/?*', route => route.fulfill({ json: {
    results: [
      { ...offers[0], title: 'Senior Backend Engineer', contract_type: 'employment', seniority: 'unknown' },
      { ...offers[1], title: 'Backend Engineer', contract_type: 'permanent', seniority: 'senior' },
      { ...offers[2], title: 'Junior Backend Engineer', contract_type: 'unknown', seniority: 'unknown' },
    ], count: 3, page: 1, page_size: 12,
  } }))
  await page.goto('/companies/1')
  await expect(page.locator('.company-offer-type')).toHaveText([
    'Emploi salarié (durée non précisée)', 'CDI · Senior', 'Contrat non précisé',
  ])
  await expect(page.getByRole('heading', { name: 'Les offres chez Stripe' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Toutes les offres', exact: true })).toBeVisible()
  await expect(page.locator('.company-offer-action').first()).toHaveText('Découvrir l’offre')
})
