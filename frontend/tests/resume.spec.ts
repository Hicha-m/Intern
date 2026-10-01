import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const pdf = { name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nfixture') }
async function prepare(page: Page, current: number | null = null) {
  await page.route('**/api/v1/auth/me/', route => route.fulfill({ json: { user: { id: 1, username: 'ada', email: 'ada@example.test' } } }))
  await page.route('**/api/v1/auth/csrf/', route => route.fulfill({ json: { csrf_token: 'resume-csrf' } }))
  await page.route('**/api/v1/profile/', route => route.fulfill({ json: { current_resume_id: current } }))
  await page.route(/\/api\/v1\/(?:profile\/(?:education|experiences|projects|work-authorizations)|catalogue|documents)\/(?:\?.*)?$/, route => route.fulfill({ json: { results: [], count: 0, page: 1, page_size: 100 } }))
  await page.route('**/api/v1/preferences/', route => route.fulfill({ json: { contracts: [], work_modes: [], role_ids: [], location_ids: [] } }))
  await page.route('**/api/v1/onboarding/', route => route.fulfill({ json: { address: {}, citizenships: [], countries: [], work_authorizations: [] } }))
}
test('multipart upload then failed association retries without duplicate upload', async ({ page }) => {
  await prepare(page)
  let uploads = 0, associations = 0
  await page.route('**/api/v1/documents/', async route => {
    uploads++
    expect(route.request().headers()['x-csrftoken']).toBe('resume-csrf')
    expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=')
    expect(route.request().postDataBuffer()?.toString()).toContain('name="kind"\r\n\r\nresume')
    await route.fulfill({ json: { id: 42, original_name: 'cv.pdf' } })
  })
  await page.route('**/api/v1/profile/resume/', async route => {
    associations++
    expect(route.request().postDataJSON()).toEqual({ document_id: 42 })
    await route.fulfill(associations === 1 ? { status: 503, json: { error: { code: 'storage_unavailable' } } } : { json: { current_resume_id: 42 } })
  })
  await page.goto('/onboarding/resume')
  await page.getByLabel('Déposez votre PDF').setInputFiles(pdf)
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click()
  await expect(page.getByRole('alert')).toContainText('stockage')
  await expect(page).toHaveURL(/\/onboarding\/resume$/)
  await page.getByRole('button', { name: 'Réessayer l’association du CV' }).click()
  await expect(page).toHaveURL(/\/onboarding\/address$/)
  expect(uploads).toBe(1)
})
test('validates size and type, preserves current CV and supports mobile', async ({ page }, info) => {
  await prepare(page, 12)
  await page.goto('/profil')
  await expect(page.getByRole('link', { name: 'Télécharger mon CV actuel' })).toHaveAttribute('href', '/api/v1/documents/12/download/')
  await page.getByRole('button', { name: 'Remplacer', exact: true }).click()
  const input = page.getByLabel('Déposez votre PDF')
  await input.setInputFiles({ name: 'cv.txt', mimeType: 'text/plain', buffer: Buffer.from('text') })
  await expect(page.getByRole('alert')).toContainText('Choisissez un fichier PDF')
  await input.setInputFiles({ ...pdf, buffer: Buffer.alloc(10 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('10 Mo maximum')
  await expect(page.getByRole('button', { name: 'Enregistrer mon CV' })).toBeDisabled()
  await input.setInputFiles(pdf)
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const drop = await page.locator('.resume-drop').boundingBox()
    expect(drop!.x + drop!.width).toBeLessThanOrEqual(width)
    await page.screenshot({ path: info.outputPath(`resume-${width}.png`), fullPage: true })
  }
})
test('onboarding header and upload layout at desktop and mobile sizes', async ({ page }, info) => {
  await prepare(page)
  await page.goto('/onboarding/resume')
  await expect(page.getByLabel('Déposez votre PDF')).toBeAttached()
  await expect(page.getByRole('banner')).toContainText('ada@example.test')
  await expect(page.getByRole('navigation')).toHaveCount(0)
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    const drop = await page.locator('.resume-drop').boundingBox()
    expect(drop!.x + drop!.width).toBeLessThanOrEqual(width)
    await page.screenshot({ path: info.outputPath(`onboarding-${width}.png`), fullPage: true })
  }
})
test('storage failure retains file and does not allow skipping onboarding', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/v1/documents/', route => route.fulfill({ status: 503, json: { error: { code: 'storage_unavailable' } } }))
  await page.goto('/onboarding/resume')
  await page.getByLabel('Déposez votre PDF').setInputFiles(pdf)
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click()
  await expect(page.getByRole('alert')).toContainText('stockage')
  await expect(page.getByRole('button', { name: 'Enregistrer et continuer' })).toBeEnabled()
  await expect(page.getByRole('link', { name: 'Ajouter mon CV plus tard' })).toHaveCount(0)
  await expect(page).toHaveURL(/\/onboarding\/resume$/)
})

test('saved CV has one enabled primary action; replacement is optional and reversible', async ({ page }, info) => {
  await prepare(page, 12)
  await page.goto('/onboarding/resume')
  const next = page.getByRole('button', { name: 'Continuer', exact: true })
  await expect(next).toBeEnabled()
  await expect(page.locator('.resume-drop')).toHaveCount(0)
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`saved-cv-${width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Remplacer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enregistrer et continuer' })).toBeDisabled()
  const input = page.getByLabel('Déposez votre PDF')
  await input.focus()
  await expect(page.locator('.resume-drop')).toHaveCSS('outline-style', 'solid')
  await input.setInputFiles(pdf)
  await expect(page.getByRole('button', { name: 'Enregistrer et continuer' })).toBeEnabled()
  await page.screenshot({ path: info.outputPath('replacement-selected.png'), fullPage: true })
  await page.getByRole('button', { name: 'Garder mon CV actuel' }).click()
  await expect(next).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await next.focus()
  await expect(next).toHaveCSS('transition-duration', '0s')
  await next.click()
  await expect(page).toHaveURL(/\/onboarding\/address$/)
})

test('upload pending keeps one busy action and prevents replacing the file', async ({ page }) => {
  await prepare(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/documents/', async route => {
    await gate
    await route.fulfill({ status: 503, json: { error: { code: 'storage_unavailable' } } })
  })
  await page.goto('/onboarding/resume')
  await page.getByLabel('Déposez votre PDF').setInputFiles(pdf)
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click()
  await expect(page.getByRole('button', { name: 'Envoi de votre CV…' })).toBeDisabled()
  await expect(page.locator('input[type="file"]')).toBeDisabled()
  release()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enregistrer et continuer' })).toBeEnabled()
})
