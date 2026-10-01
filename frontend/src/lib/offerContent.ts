export type OfferFact = { value: unknown; evidence_text?: string; source_revision_id?: number | null; required?: boolean; reason?: string; status?: string }
export type ContentItem = { text: string; children?: ContentBlock[] }
export type ContentBlock = { id?: string; kind: string; text?: string; items?: ContentItem[] }
export type ContentSection = { kind: string; original_heading: string | null; block_ids: string[] }
export type OfferContent = {
  schema_version: string
  source_revision_id?: number | null
  blocks: ContentBlock[]
  sections: ContentSection[]
  requirements: { text: string; modality: string; category: string; alternative: boolean; block_id: string }[]
}

const dateFormat = new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
export function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

export function temporalLabel(value: unknown): string {
  if (typeof value === 'string') {
    if (/T\d/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return `${value} · Fuseau à confirmer`
    if (/T\d/.test(value) && !Number.isNaN(new Date(value).getTime())) return new Intl.DateTimeFormat('fr', { dateStyle: 'long', timeStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(value))
    return dateLabel(value)
  }
  if (!value || typeof value !== 'object') return 'Non précisé'
  const item = value as { precision?: string; value?: string; year?: number; relation?: string; time_text?: string; earliest?: string; latest?: string }
  let label = 'Non précisé'
  if (item.precision === 'immediate') return 'Dès que possible'
  if (item.precision === 'ambiguous') return `${item.value} · À confirmer`
  if (item.precision === 'day' && item.value) label = dateLabel(item.value)
  if (item.precision === 'month' && item.value) {
    const date = new Date(`${item.value}-01T00:00:00Z`)
    if (!Number.isNaN(date.getTime())) label = new Intl.DateTimeFormat('fr', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  }
  if (item.precision === 'month_range' && item.earliest && item.latest) {
    label = `${temporalLabel({ precision: 'month', value: item.earliest })} à ${temporalLabel({ precision: 'month', value: item.latest })}`
  }
  if (item.precision === 'season') {
    const seasons: Record<string, string> = { summer: 'Été', été: 'Été', ete: 'Été', sommer: 'Été', spring: 'Printemps', printemps: 'Printemps', fall: 'Automne', autumn: 'Automne', automne: 'Automne', winter: 'Hiver', hiver: 'Hiver' }
    label = `${seasons[item.value ?? ''] ?? item.value} ${item.year ?? ''}`.trim()
  }
  const prefix = item.relation !== 'from' ? '' : item.precision === 'day' ? 'À partir du ' : /^[aeiouhàâéèêëîïôöùûü]/i.test(label) ? 'À partir d’' : 'À partir de '
  return `${prefix}${label}${item.time_text ? ` · ${item.time_text}` : ''}`
}

export function durationLabel(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Non précisé'
  const item = value as { minimum: number | null; maximum: number | null; unit: string }
  const unit = item.unit === 'months' ? 'mois' : item.unit === 'weeks' ? 'semaines' : 'jours'
  if (item.minimum == null && item.maximum == null) return 'Non précisé'
  if (item.maximum == null) return `${item.minimum} ${unit} minimum`
  if (item.minimum == null) return `${item.maximum} ${unit} maximum`
  return `${item.minimum === item.maximum ? item.minimum : `${item.minimum} à ${item.maximum}`} ${unit}`
}
