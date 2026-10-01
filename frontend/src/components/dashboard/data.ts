import { useOutletContext } from 'react-router'

export type Offer = {
  id: number; title: string; company: { id: number; name: string; logo_url?: string | null }; description?: string
  locations?: { name: string; country_code?: string | null; city?: string | null }[]; contract_type?: string; work_mode?: string
  sources?: { id: number; apply_url: string; provider: string }[]
}
export type ApplicationRow = {
  id: number; offer: Offer; status: string; workflow_status: string | null
  resume_ready: boolean; cover_letter_ready: boolean; submitted_at: string | null; updated_at: string
}
export type PageData<T> = { results: T[]; count: number; page: number; page_size: number }
export type DashboardData = {
  offers: Offer[]; applications: PageData<ApplicationRow>
  counts: { applications: number; needs_input: number }; full_name: string
}
export type DashboardState = { data: DashboardData | null; loading: boolean; error: string | null; reload: () => void }
export const useDashboard = () => useOutletContext<DashboardState>()

export function applicationStatus(app: Pick<ApplicationRow, 'status' | 'workflow_status'>) {
  const recruitment: Record<string, [string, string]> = {
    submitted: ['Envoyée', 'success'], screening: ['En étude', 'info'], interview: ['Entretien', 'info'],
    offer_received: ['Offre reçue', 'success'], accepted: ['Acceptée', 'success'], rejected: ['Non retenue', 'danger'], withdrawn: ['Retirée', 'neutral'],
  }
  const workflow: Record<string, [string, string]> = {
    queued: ['En attente', 'warning'], running: ['En préparation', 'info'], needs_input: ['À compléter', 'danger'],
    uncertain: ['À vérifier', 'warning'], failed: ['Échec', 'danger'], cancelled: ['Annulée', 'neutral'],
  }
  return recruitment[app.status] ?? workflow[app.workflow_status ?? ''] ?? ['À valider', 'warning']
}
export function relativeDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const format = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return 'À l’instant'
  if (Math.abs(seconds) < 3600) return format.format(Math.round(seconds / 60), 'minute')
  if (Math.abs(seconds) < 86400) return format.format(Math.round(seconds / 3600), 'hour')
  return format.format(Math.round(seconds / 86400), 'day')
}
export function safeExternalUrl(value?: string) {
  try { const url = new URL(value ?? ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' })
const englishCountryNames = new Intl.DisplayNames(['en'], { type: 'region' })

export function offerLocationLabel(locations: Offer['locations']): string {
  if (!locations?.length) return 'Lieu et pays non précisés'
  return locations.map(location => {
    const code = location.country_code?.toUpperCase()
    const country = code && /^[A-Z]{2}$/.test(code) ? countryNames.of(code) : undefined
    const name = location.city?.trim() || location.name.trim() || 'Ville non précisée'
    if (!country || country === code) return `${name} · Pays non précisé`
    // Remove an existing country suffix before displaying its French label.
    const parts = name.split(/\s*[,·]\s*/)
    const last = parts.at(-1)?.toLocaleLowerCase()
    const aliases = [country, englishCountryNames.of(code!), code].map(value => value?.toLocaleLowerCase())
    if (aliases.includes(last)) parts.pop()
    return [...parts, country].join(' · ')
  }).join(' / ')
}
