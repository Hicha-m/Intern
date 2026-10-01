import { test, expect } from '@playwright/test'
import { prepareDashboard } from './fixtures/dashboard'

test.beforeEach(({ baseURL }, info) => {
  test.skip(!baseURL || !info.project.metadata.logoDevConfigured, 'Run with playwright.logos.config.ts for the configured CDN fallback.')
})

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')
const local = '/api/v1/companies/1/logo/?v=' + 'a'.repeat(64)

test('local logo falls back to the domain CDN, then to initials, without changing layout', async ({ page }) => {
  await prepareDashboard(page)
  await page.route(/\/api\/v1\/offers\/(?:\?.*)?$/,  route => route.fulfill({ json: { count: 3, page: 1, page_size: 12, results: [
    { id: 1, title: 'Stage logiciel', company: { id: 1, name: 'Example', domain: 'example.com', logo_url: local } },
    { id: 2, title: 'Stage data', company: { id: 2, name: 'Fallback', domain: 'fallback.com' } },
    { id: 3, title: 'Stage produit', company: { id: 3, name: 'Platform', domain: 'www.linkedin.com', logo_url: 'https://www.linkedin.com/logo.png' } },
  ] } }))
  await page.route('**/api/v1/companies/1/logo/**', route => route.fulfill({ status: 404 }))
  const cdnRequests: URL[] = []
  await page.route('https://img.logo.dev/**', route => {
    const url = new URL(route.request().url())
    cdnRequests.push(url)
    return route.fulfill(url.pathname === '/example.com' ? { contentType: 'image/png', body: image } : { status: 404 })
  })
  await page.goto('/stages')
  const marks = page.locator('.catalogue-card .company-mark')
  await expect(marks.nth(0).locator('img')).toHaveAttribute('src', /^https:\/\/img.logo.dev\/example.com\?/)
  await expect.poll(() => marks.nth(0).locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await expect(marks.nth(1)).toHaveText('F')
  await expect(marks.nth(2)).toHaveText('P')
  await expect(page.getByRole('link', { name: 'Logos fournis par Logo.dev' })).toBeVisible()
  expect(cdnRequests.map(url => url.pathname).sort()).toEqual(['/example.com', '/fallback.com'])
  expect(cdnRequests.every(url => url.searchParams.get('fallback') === '404' && url.searchParams.get('token')?.startsWith('pk_'))).toBe(true)
  const sizes = await marks.evaluateAll(nodes => nodes.map(node => [node.clientWidth, node.clientHeight]))
  expect(sizes.every(size => size[0] === sizes[0][0] && size[1] === sizes[0][1])).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/login')
  await expect(page.getByRole('link', { name: 'Logos fournis par Logo.dev' })).toBeVisible()
})

test('a successful local logo does not call the CDN', async ({ page }) => {
  await prepareDashboard(page)
  await page.route(/\/api\/v1\/offers\/(?:\?.*)?$/,  route => route.fulfill({ json: { count: 1, page: 1, page_size: 12, results: [
    { id: 1, title: 'Stage logiciel', company: { id: 1, name: 'Example', domain: 'example.com', logo_url: local } },
  ] } }))
  await page.route('**/api/v1/companies/1/logo/**', route => route.fulfill({ contentType: 'image/png', body: image }))
  const cdnRequests: string[] = []
  await page.route('https://img.logo.dev/**', route => { cdnRequests.push(route.request().url()); return route.fulfill({ status: 404 }) })
  await page.goto('/stages')
  const img = page.locator('.catalogue-card .company-mark img')
  await expect(img).toHaveAttribute('src', local)
  await expect.poll(() => img.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  expect(cdnRequests).toEqual([])
})

test('changing a previously broken logo URL retries the new image', async ({ page }) => {
  await prepareDashboard(page)
  let version = 'a'
  await page.route('**/api/v1/offers/**', route => {
    const url = new URL(route.request().url())
    if (/\/offers\/\d+\/$/.test(url.pathname)) return route.fulfill({ json: { id: 1, title: 'Stage', company: { id: 1, name: 'Example', logo_url: `/api/v1/companies/1/logo/?v=${version.repeat(64)}` } } })
    return route.fulfill({ json: { results: [], count: 0, page: 1, page_size: 12 } })
  })
  await page.route('**/api/v1/companies/1/logo/**', route => route.fulfill(version === 'a' ? { status: 404 } : { contentType: 'image/png', body: image }))
  await page.goto('/offers/1')
  await expect(page.locator('.offer-detail-company .company-mark')).toHaveText('E')
  version = 'b'
  await page.goto('/offers/2')
  await expect(page.locator('.offer-detail-company .company-mark img')).toHaveAttribute('src', `/api/v1/companies/1/logo/?v=${'b'.repeat(64)}`)
})
