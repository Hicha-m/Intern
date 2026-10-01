import type { Page } from '@playwright/test'

export const taxonomy = { version: 'job-taxonomy-1', domains: [
  { slug: 'software-it', name: 'Informatique et systèmes', count: 8, subdomains: [
    { slug: 'backend', name: 'Backend', aliases: ['développement serveur', 'back-end'], count: 5, generalist: false },
    { slug: 'frontend', name: 'Frontend', aliases: ['front-end'], count: 4, generalist: false },
    { slug: 'mobile', name: 'Mobile', aliases: [], count: 0, generalist: false },
  ] },
  { slug: 'finance', name: 'Finance, banque et assurance', count: 2, subdomains: [
    { slug: 'asset-management', name: 'Gestion d’actifs', aliases: ['asset management'], count: 2, generalist: false },
  ] },
] }
export async function prepareTaxonomy(page: Page) {
  await page.route('**/api/v1/taxonomy/**', route => route.fulfill({ json: taxonomy }))
}
