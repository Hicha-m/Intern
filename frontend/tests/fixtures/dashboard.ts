import type { Page } from '@playwright/test'
import type { ApplicationRow, DashboardData, Offer } from '../../src/components/dashboard/data'

export const offers: Offer[] = [
  { id: 1, title: 'Software Developer II – RIGHT', company: { id: 4, name: 'Rocket Companies' } },
  { id: 2, title: 'Software Engineer', company: { id: 1, name: 'Stripe' } },
  { id: 3, title: 'Backend Developer I', company: { id: 2, name: 'Vercel' } },
  { id: 4, title: 'Software Engineer', company: { id: 3, name: 'Notion' } },
]
export const applications: ApplicationRow[] = [
  { id: 1, offer: { id: 11, title: 'Software Development Engineer II', company: { id: 2, name: 'Blue Origin' } }, status: 'submitted', workflow_status: 'succeeded', resume_ready: true, cover_letter_ready: true, submitted_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' },
  { id: 2, offer: { id: 12, title: 'Software Engineer, Backend', company: { id: 3, name: 'Linktree' } }, status: 'submitted', workflow_status: 'succeeded', resume_ready: true, cover_letter_ready: false, submitted_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' },
  { id: 3, offer: { id: 13, title: 'Senior Frontend Engineer', company: { id: 2, name: 'Atlassian' } }, status: 'draft', workflow_status: 'running', resume_ready: true, cover_letter_ready: true, submitted_at: null, updated_at: '2026-09-30T12:00:00Z' },
  { id: 4, offer: { id: 14, title: 'Software Engineer, Platform', company: { id: 3, name: 'Dremio' } }, status: 'draft', workflow_status: 'needs_input', resume_ready: false, cover_letter_ready: false, submitted_at: null, updated_at: '2026-09-29T12:00:00Z' },
  { id: 5, offer: { id: 15, title: 'Member of Technical Staff', company: { id: 1, name: 'Astronomer' } }, status: 'draft', workflow_status: 'queued', resume_ready: true, cover_letter_ready: false, submitted_at: null, updated_at: '2026-09-30T12:00:00Z' },
]
export const dashboard: DashboardData = { offers, applications: { results: applications, count: 5, page: 1, page_size: 8 }, counts: { applications: 5, needs_input: 1 }, full_name: 'Alex Morgan' }
export async function prepareDashboard(page: Page) {
  const requests: URL[] = []
  await page.clock.setFixedTime(new Date('2026-09-30T18:30:00Z'))
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url())
    requests.push(url)
    if (request.method() !== 'GET') return route.fulfill({ status: 405, json: { error: { code: 'unexpected_mutation' } } })
    if (url.pathname.endsWith('/auth/me/')) return route.fulfill({ json: { user: { id: 1, username: 'alex', email: 'alex@example.test', onboarding_step: 'complete' } } })
    if (url.pathname.endsWith('/dashboard/')) {
      const filter = url.searchParams.get('filter'), query = url.searchParams.get('q')?.toLowerCase() ?? ''
      const rows = applications.filter(row => (filter !== 'needs_input' || row.workflow_status === 'needs_input') && (filter !== 'failed') && `${row.offer.company.name} ${row.offer.title}`.toLowerCase().includes(query))
      return route.fulfill({ json: { ...dashboard, offers: offers.filter(offer => `${offer.company.name} ${offer.title}`.toLowerCase().includes(query)), applications: { results: rows, count: rows.length, page: 1, page_size: 8 } } })
    }
    if (url.pathname.endsWith('/offers/')) return route.fulfill({ json: { results: offers, count: offers.length, page: 1, page_size: 12 } })
    if (/\/offers\/\d+\/$/.test(url.pathname)) {
      const offer = offers.find(offer => url.pathname.endsWith(`/${offer.id}/`))
      return route.fulfill({ json: { ...offer, description: 'Build thoughtful software with our engineering team.', sources: [{ id: 42, apply_url: 'https://example.test/apply', provider: 'Example' }] } })
    }
    if (/\/applications\/\d+\/$/.test(url.pathname)) {
      const app = applications.find(app => url.pathname.endsWith(`/${app.id}/`))!
      return route.fulfill({ json: { ...app, latest_run: { status: app.workflow_status }, latest_revision: { offer_snapshot: app.offer, missing_fields: [], document_ids: [42] } } })
    }
    return route.fulfill({ status: 404, json: { error: { code: 'not_found' } } })
  })
  return requests
}
