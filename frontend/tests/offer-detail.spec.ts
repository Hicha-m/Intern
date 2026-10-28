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
  await expect(page.locator('#offer-panel-summary p')).toHaveCount(3)
  await expect(page.locator('.engine-evidence').getByText('6 ukers periode', { exact: true })).toBeHidden()
  await page.getByText('Informations extraites et preuves').click()
  await expect(page.locator('.engine-evidence').getByText('6 ukers periode', { exact: true })).toBeVisible()
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
  await expect(page.locator('.offer-key-facts dd')).toHaveText(['Non précisé', 'Non précisé', 'Non précisée'])
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
  await expect(page.locator('#offer-panel-summary li')).toHaveText(['Tester le produit', 'Documenter les résultats'])
  await expect(page.locator('#offer-panel-summary')).toContainText('Recherche & développement sur plusieurs lignes.')
  await expect(page.locator('.offer-description-copy script')).toHaveCount(0)
  await expect(page.locator('#offer-panel-summary')).toContainText('<script>alert(1)</script>')
})

const structured = {
  schema_version: 'offer-content-1', source_revision_id: 12,
  blocks: [
    { id: 'b0', kind: 'heading', text: 'About the role' },
    { id: 'b1', kind: 'paragraph', text: 'Build web planning tools with our product team.' },
    { id: 'b2', kind: 'heading', text: 'Responsibilities' },
    { id: 'b3', kind: 'bullet_list', items: [{ text: 'Develop and test features.', children: [] }, { text: 'Review code with an engineer.', children: [] }] },
    { id: 'b4', kind: 'heading', text: 'Requirements' },
    { id: 'b5', kind: 'bullet_list', items: [{ text: 'Experience in Python or Java.', children: [] }, { text: 'React preferred.', children: [] }] },
    { id: 'b6', kind: 'heading', text: 'Internship details' },
    { id: 'b7', kind: 'paragraph', text: 'Minimum 3 months, ideally 6 months. Start from May 2027. Internship agreement required.' },
  ],
  sections: [
    { kind: 'about_role', original_heading: 'About the role', block_ids: ['b1'] },
    { kind: 'responsibilities', original_heading: 'Responsibilities', block_ids: ['b3'] },
    { kind: 'requirements', original_heading: 'Requirements', block_ids: ['b5'] },
    { kind: 'conditions', original_heading: 'Internship details', block_ids: ['b7'] },
  ],
  requirements: [
    { text: 'Experience in Python or Java.', category: 'skill', modality: 'required', alternative: true, block_id: 'b5' },
    { text: 'React preferred.', category: 'skill', modality: 'preferred', alternative: false, block_id: 'b5' },
  ],
}

test('essential view separates preferences, preserves original and supports keyboard tabs', async ({ page }, info) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, title: 'Software Engineer Intern', description: 'Build web planning tools.', content: structured, facts: {
    duration: { value: { minimum: 3, maximum: null, unit: 'months' }, required: true, evidence_text: 'Minimum 3 months' },
    preferred_duration: { value: { minimum: 6, maximum: 6, unit: 'months' }, required: false, evidence_text: 'ideally 6 months' },
    start_period: { value: { precision: 'month', value: '2027-05', relation: 'from' }, evidence_text: 'Start from May 2027' },
  } } }))
  await page.goto('/offers/2')
  const summary = page.getByRole('tabpanel', { name: 'L’essentiel' })
  await expect(summary.getByRole('heading', { name: 'Ce que tu feras' })).toBeVisible()
  await expect(summary.getByRole('heading', { name: 'Un plus et compétences facultatives' })).toBeVisible()
  await expect(summary.getByText('Experience in Python or Java.', { exact: true })).toBeVisible()
  await expect(page.locator('.offer-key-facts')).toContainText('3 mois minimum')
  await expect(page.locator('.offer-key-facts')).toContainText('À partir de mai 2027')
  await expect(page.locator('.offer-key-facts')).toContainText('Durée souhaitée6 mois')
  await page.getByRole('tab', { name: 'L’essentiel' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Annonce complète' })).toBeFocused()
  await expect(page.getByRole('tabpanel', { name: 'Annonce complète' }).getByRole('heading', { name: 'Requirements' })).toBeVisible()
  await page.keyboard.press('Home')
  await expect(page.getByRole('tab', { name: 'L’essentiel' })).toBeFocused()
  await expect(page.getByText('Voir l’extrait', { exact: false })).toHaveCount(0)
  await expect(page.locator('.offer-key-facts details')).toHaveCount(0)
  await page.getByRole('link', { name: 'Sources et détails' }).click()
  await expect(page.getByRole('heading', { name: 'Sources et informations sur l’offre' })).toBeInViewport()
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: info.outputPath('offer-essential-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('offer-essential-mobile.png'), fullPage: true })
})

test('contradictory facts and literal hostile text remain safe', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, content: { ...structured, blocks: [{ id: 'b1', kind: 'paragraph', text: '<img src=x onerror="window.unsafe=true">' }], sections: [{ kind: 'other', original_heading: 'Original text', block_ids: ['b1'] }], requirements: [] }, facts: { duration: { value: null, status: 'conflict', evidence_text: 'Duration: 3 months | Duration: 6 months' } } } }))
  await page.goto('/offers/2')
  await expect(page.locator('.offer-key-facts')).toContainText('À confirmer')
  await expect(page.locator('#offer-panel-summary')).toContainText('<img src=x')
  await expect(page.locator('#offer-panel-summary img')).toHaveCount(0)
  expect(await page.evaluate(() => 'unsafe' in window)).toBe(false)
})

test('repeated sections keep all passages and an unzoned deadline stays uncertain', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, content: { ...structured,
    sections: [...structured.sections, { kind: 'about_role', original_heading: 'Role context', block_ids: ['b7'] }],
  }, facts: { start_period: { value: { precision: 'month', value: '2026-10', relation: 'from' }, evidence_text: "à partir d'octobre 2026" }, application_deadline: { value: '2027-03-15T18:00:00', evidence_text: 'Applications close March 15, 2027 at 18:00' } } } }))
  await page.goto('/offers/2')
  const summary = page.getByRole('tabpanel', { name: 'L’essentiel' })
  await expect(summary.getByRole('heading', { name: 'À propos du poste', exact: true })).toHaveCount(1)
  await expect(summary.getByText('Build web planning tools with our product team.', { exact: true })).toBeVisible()
  await expect(summary.locator('section').filter({ has: page.getByRole('heading', { name: 'À propos du poste', exact: true }) })).toContainText('Minimum 3 months')
  await expect(page.locator('.offer-key-facts')).toContainText('2027-03-15T18:00:00 · Fuseau à confirmer')
  await expect(page.locator('.offer-key-facts')).toContainText('À partir d’octobre 2026')
})

test('language requirements, preferences and alternatives have separate labels', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, facts: {
    required_languages: { value: [{ code: 'fr' }, { code: 'en' }] },
    preferred_languages: { value: [{ code: 'de' }], required: false },
    language_alternatives: { value: [{ codes: ['nl', 'sv'], operator: 'any', modality: 'required' }] },
  } } }))
  await page.goto('/offers/2')
  const facts = page.getByRole('definition').locator('..')
  await expect(facts.filter({ hasText: 'Langues requises' })).toContainText('français, anglais')
  await expect(facts.filter({ hasText: 'Langues souhaitées' })).toContainText('allemand')
  await expect(facts.filter({ hasText: 'Langues au choix' })).toContainText('néerlandais ou suédois')
  await expect(page.getByText('Voir l’extrait', { exact: false })).toHaveCount(0)
})

test('contract evidence explains why an atypical title is confirmed', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, facts: { classification: { value: 'confirmed', reason: 'placement_description', evidence_text: 'Objectif du stage' } } } }))
  await page.goto('/offers/2')
  await page.getByText('Informations extraites et preuves').click()
  await expect(page.getByText('Le stage est précisé dans la description.', { exact: true })).toBeVisible()
  await expect(page.getByText('Objectif du stage', { exact: true })).toBeVisible()
})

test('known contract and seniority appear without calling generic employment a permanent job', async ({ page }) => {
  await prepareDashboard(page)
  for (const [contract, label] of [['permanent', 'CDI'], ['fixed_term', 'CDD'], ['employment', 'Emploi salarié (durée non précisée)'], ['unknown', 'Contrat non précisé']]) {
    await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: { ...offer, title: 'Backend Engineer', contract_type: contract, seniority: 'senior' } }))
    await page.goto('/offers/2/')
    await expect(page.locator('.offer-detail-tags')).toContainText(label)
    await expect(page.locator('.offer-detail-tags')).toContainText('Senior')
    if (contract !== 'permanent') await expect(page.locator('.offer-detail-tags')).not.toContainText('CDI')
    await page.unroute('**/api/v1/offers/2/')
  }
})

test('published hourly salary and a long employer name stay readable on mobile', async ({ page }) => {
  await prepareDashboard(page)
  await page.route('**/api/v1/offers/2/', route => route.fulfill({ json: {
    ...offer, company: { id: 1, name: `Entreprise ${'Q'.repeat(90)}` },
    compensation_bands: [{ minimum: '20.50', maximum: '30.75', currency: 'EUR', period: 'hour', gross_net: 'unknown' }],
  } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/offers/2')
  await expect(page.locator('.offer-key-facts')).toContainText(/20,5.*30,75.*heure/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})
