import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon, FilterHorizontalIcon, ArrowDown01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { apiRequest } from '../lib/api'
import { useApiQuery } from '../lib/useApiQuery'
import { authError } from '../auth/errors'
import type { PageData, Offer } from '../components/dashboard/data'
import { relativeDate } from '../components/dashboard/data'
import { SearchSelect, type SelectOption } from '../components/ui/SearchSelect'
import './EngineControls.css'

export type EngineOffer = Offer & { quality?: { classification: string; europe_status: string; domain: string }; last_verified_at?: string; stale?: boolean; facts?: Record<string, { value: unknown; evidence_text?: string; source_revision_id?: number }> }
type Search = { id: number; name: string; criteria: Record<string, unknown>; frequency: string }
type Alert = { id: number; offer_id: number; payload: { title?: string }; read_at: string | null }
type External = { id: number; title: string; url: string; status: string; error_code: string }
export const domains: Record<string, string> = { 'it-data': 'Informatique et data', 'engineering-industry': 'Ingénierie et industrie', 'science-research': 'Sciences et recherche', health: 'Santé', 'finance-accounting': 'Finance et comptabilité', legal: 'Droit', 'marketing-communication': 'Marketing et communication', sales: 'Commerce', 'human-resources': 'Ressources humaines', 'design-arts': 'Design et arts', 'operations-logistics': 'Opérations et logistique', 'hospitality-tourism': 'Hôtellerie et tourisme', 'public-nonprofit': 'Public et associatif' }
const countries = 'AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO SM RS SK SI ES SE CH UA GB VA FO GI'.split(' ')
const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' })
export function engineCriteria(params: URLSearchParams) {
  const optional = Object.fromEntries(['work_mode', 'published_within', 'sort', 'required_language', 'start_from', 'start_to', 'domain'].flatMap(key => params.get(key) ? [[key, params.get(key)!]] : []))
  const duration = Object.fromEntries(['duration_min', 'duration_max'].flatMap(key => params.get(key) ? [[key, Number(params.get(key))]] : []))
  return { q: params.get('q') ?? '', classification: 'confirmed', europe_scope: 'in_scope', unknown_policy: params.get('unknown_policy') ?? 'include', ...(params.get('country_codes') ? { country_codes: params.get('country_codes')!.split(',').filter(Boolean) } : {}), include_unknown: params.get('unknown_policy') === 'exclude' ? 'false' : 'true', ...optional, ...duration, ...(Object.keys(duration).length ? { duration_unit: 'months' } : {}) }
}
const countryOptions = [{ value: '', label: 'Toute l’Europe' }, ...countries.map(value => ({ value, label: regionNames.of(value) ?? value })).sort((a, b) => a.label.localeCompare(b.label, 'fr'))]
const domainOptions = [{ value: '', label: 'Tous les domaines' }, ...Object.entries(domains).map(([value, label]) => ({ value, label }))]
const languageOptions = [{ value: '', label: 'Toutes les langues' }, ...Object.entries({ fr: 'Français', en: 'Anglais', de: 'Allemand', es: 'Espagnol', it: 'Italien', pt: 'Portugais', nl: 'Néerlandais', pl: 'Polonais' }).map(([value, label]) => ({ value, label }))]
const modeOptions = [{ value: '', label: 'Tous les modes' }, { value: 'remote', label: 'À distance' }, { value: 'hybrid', label: 'Hybride' }, { value: 'onsite', label: 'Sur place' }]
const publicationOptions = [{ value: '', label: 'Toutes les dates' }, { value: '1', label: 'Dernières 24 heures' }, { value: '7', label: '7 derniers jours' }, { value: '30', label: '30 derniers jours' }]
const sortOptions = [{ value: '', label: 'Automatique' }, { value: 'relevance', label: 'Pertinence' }, { value: 'newest', label: 'Plus récentes' }]
const filterKeys = ['q', 'country_codes', 'domain', 'duration_min', 'duration_max', 'required_language', 'start_from', 'start_to', 'work_mode', 'published_within', 'sort']
type FilterProps = { params: URLSearchParams; update: (params: URLSearchParams) => void }

function FilterSelect({ name, label, options, initial, onChange }: { name: string; label: string; options: SelectOption[]; initial: string; onChange: () => void }) {
  const [value, setValue] = useState(initial)
  return <div className="offers-filter-select" data-selected={Boolean(value) || undefined}>
    <SearchSelect label={label} placeholder={options[0].label} options={options} value={value} onChange={next => { setValue(next); onChange() }} />
    <input type="hidden" name={name} value={value} />
  </div>
}
export function EngineFilters(props: FilterProps) {
  // URL changes (including browser Back) restore every draft field together.
  return <FilterForm key={props.params.toString()} {...props} />
}
function FilterForm({ params, update }: FilterProps) {
  const advancedCount = ['duration_min', 'duration_max', 'required_language', 'start_from', 'start_to', 'work_mode', 'published_within'].filter(key => params.has(key)).length + (params.get('unknown_policy') === 'exclude' ? 1 : 0)
  const [advancedOpen, setAdvancedOpen] = useState(advancedCount > 0)
  const [dirty, setDirty] = useState(false)
  const [dateError, setDateError] = useState('')
  const [durationError, setDurationError] = useState('')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const queryInput = useRef<HTMLInputElement>(null)
  const dateLabel = (value: string) => value.split('-').reverse().join('/')
  const labels: Record<string, string> = {
    duration_min: `Durée : ${params.get('duration_min')} mois min.`, work_mode: `Mode : ${modeOptions.find(item => item.value === params.get('work_mode'))?.label}`, published_within: `Publication : ${publicationOptions.find(item => item.value === params.get('published_within'))?.label}`, sort: `Tri : ${sortOptions.find(item => item.value === params.get('sort'))?.label}`,
    q: `Recherche : ${params.get('q')}`, country_codes: `Pays : ${countryOptions.find(item => item.value === params.get('country_codes'))?.label ?? params.get('country_codes')}`,
    domain: `Domaine : ${domains[params.get('domain') ?? ''] ?? params.get('domain')}`, duration_max: `Durée : ${params.get('duration_max')} mois max.`,
    required_language: `Langue : ${languageOptions.find(item => item.value === params.get('required_language'))?.label ?? params.get('required_language')}`,
    start_from: `Dès le ${dateLabel(params.get('start_from') ?? '')}`, start_to: `Avant le ${dateLabel(params.get('start_to') ?? '')}`, unknown_policy: 'Critères renseignés uniquement',
  }
  const applied = [...filterKeys.filter(key => params.has(key)), ...(params.get('unknown_policy') === 'exclude' ? ['unknown_policy'] : [])]
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget), next = new URLSearchParams()
    const from = String(values.get('start_from') ?? ''), to = String(values.get('start_to') ?? '')
    const end = event.currentTarget.elements.namedItem('start_to') as HTMLInputElement
    if (from && to && from > to) {
      setDateError('La date de fin doit suivre la date de début.'); setAdvancedOpen(true)
      requestAnimationFrame(() => end.focus())
      return
    }
    setDateError('')
    const minimum = Number(values.get('duration_min')), maximum = Number(values.get('duration_max'))
    if (minimum && maximum && minimum > maximum) {
      setDurationError('La durée maximale doit être supérieure ou égale à la durée minimale.'); setAdvancedOpen(true)
      const durationEnd = event.currentTarget.elements.namedItem('duration_max') as HTMLInputElement
      requestAnimationFrame(() => durationEnd.focus())
      return
    }
    setDurationError('')
    for (const key of filterKeys) { const value = String(values.get(key) ?? '').trim(); if (value) next.set(key, value) }
    next.set('unknown_policy', values.has('unknown') ? 'include' : 'exclude')
    setDirty(false); update(next)
  }
  return <form className="engine-form offers-filters" onSubmit={submit} role="search" aria-label="Filtres des stages" onChange={event => { if (event.target instanceof HTMLInputElement && event.target.name) setDirty(true) }}>
    <div className="offers-search-bar">
      <label className="offers-query"><span className="offers-visually-hidden">Rechercher un stage</span><span className="offers-search-input"><HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} aria-hidden="true" /><input ref={queryInput} name="q" type="search" placeholder="Poste, entreprise ou mot-clé…" maxLength={300} autoComplete="off" enterKeyHint="search" spellCheck={false} value={query} onChange={event => setQuery(event.target.value)} /></span></label>
      <button type="button" className="offers-search-clear" aria-label="Effacer la recherche" style={{ visibility: query ? 'visible' : 'hidden' }} disabled={!query} onClick={() => { setQuery(''); setDirty(true); queryInput.current?.focus() }}><HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} aria-hidden="true" /></button>
      <button className="dashboard-button dashboard-button--primary offers-search-submit" type="submit" aria-label="Rechercher"><span>Rechercher</span><HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} aria-hidden="true" /></button>
    </div>
    <div className="offers-filter-footer">
      <FilterSelect onChange={() => setDirty(true)} name="country_codes" label="Pays" options={countryOptions} initial={params.get('country_codes') ?? ''} />
      <FilterSelect onChange={() => setDirty(true)} name="domain" label="Domaine" options={domainOptions} initial={params.get('domain') ?? ''} />
      <FilterSelect onChange={() => setDirty(true)} name="sort" label="Trier par" options={sortOptions} initial={params.get('sort') ?? ''} />
      <button className="offers-advanced-toggle" type="button" aria-expanded={advancedOpen} aria-controls="offers-advanced-fields" onClick={() => setAdvancedOpen(open => !open)}>
        <HugeiconsIcon icon={FilterHorizontalIcon} size={18} strokeWidth={1.5} aria-hidden="true" /><span>Filtres avancés</span>{advancedCount > 0 && <span className="offers-count">{advancedCount}</span>}<HugeiconsIcon className="offers-chevron" icon={ArrowDown01Icon} size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
    <div id="offers-advanced-fields" className="offers-advanced-fields" hidden={!advancedOpen}>
      <FilterSelect onChange={() => setDirty(true)} name="work_mode" label="Mode de travail" options={modeOptions} initial={params.get('work_mode') ?? ''} />
      <FilterSelect onChange={() => setDirty(true)} name="published_within" label="Date de publication" options={publicationOptions} initial={params.get('published_within') ?? ''} />
      <label>Durée minimale (mois)<input name="duration_min" type="number" min="1" max="36" placeholder="Ex. : 3" defaultValue={params.get('duration_min') ?? ''} onChange={() => setDurationError('')} /></label>
      <label>Durée maximale (mois)<input name="duration_max" type="number" min="1" max="36" placeholder="Ex. : 6" defaultValue={params.get('duration_max') ?? ''} aria-invalid={Boolean(durationError) || undefined} aria-describedby={durationError ? 'offers-duration-error' : undefined} onChange={() => setDurationError('')} /></label>
      <FilterSelect onChange={() => setDirty(true)} name="required_language" label="Langue requise" options={languageOptions} initial={params.get('required_language') ?? ''} />
      {durationError && <p id="offers-duration-error" role="alert">{durationError}</p>}
      <fieldset className="offers-date-range"><legend>Période de début du stage</legend><div><label>Début au plus tôt<input name="start_from" type="date" defaultValue={params.get('start_from') ?? ''} onChange={() => setDateError('')} /></label><label>Début au plus tard<input name="start_to" type="date" defaultValue={params.get('start_to') ?? ''} aria-invalid={Boolean(dateError) || undefined} aria-describedby={dateError ? 'offers-date-error' : undefined} onChange={() => setDateError('')} /></label></div>{dateError && <p id="offers-date-error" className="search-select-error" role="alert">{dateError}</p>}</fieldset>
      <label className="engine-checkbox"><input name="unknown" type="checkbox" defaultChecked={params.get('unknown_policy') !== 'exclude'} />Inclure les offres dont certains critères ne sont pas précisés</label>
      <button type="submit" className="dashboard-button dashboard-button--primary offers-apply">Appliquer les filtres</button>
    </div>
    <p className="offers-filter-hint" role="status">{dirty ? 'Modifications à appliquer avec « Rechercher ».' : 'Choisissez vos critères, puis lancez la recherche.'}</p>
    {applied.length > 0 && <div className="offers-applied" aria-label="Filtres appliqués"><span>Filtres appliqués</span>{applied.map(key => <button type="button" key={key} aria-label={`Retirer ${labels[key]}`} onClick={() => { const next = new URLSearchParams(params); next.delete(key); next.delete('page'); update(next) }}>{labels[key]}<HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} aria-hidden="true" /></button>)}<button type="button" className="offers-reset" onClick={() => update(new URLSearchParams())}>Réinitialiser les filtres</button></div>}
  </form>
}

function QueryState({ error, loading, reload }: { error: string | null; loading: boolean; reload: () => void }) { return error ? <p role="alert">{error} <button className="dashboard-button" onClick={reload}>Réessayer</button></p> : loading ? <p role="status">Chargement…</p> : null }
export function EngineControls({ params, update }: { params: URLSearchParams; update: (params: URLSearchParams) => void }) {
  const coverage = useApiQuery<{ active_sources: number; verified_sources: number; latest_verification: string | null }>('/coverage/')
  const searches = useApiQuery<PageData<Search>>('/saved-searches/'), alerts = useApiQuery<PageData<Alert>>('/alerts/'), external = useApiQuery<PageData<External>>('/external-opportunities/')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function mutate(action: () => Promise<unknown>, success: string, reload: () => void) { setBusy(true); setError(''); try { await action(); toast.success(success); reload() } catch (cause) { setError(authError(cause)) } finally { setBusy(false) } }
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); void mutate(() => apiRequest('/saved-searches/', { method: 'POST', body: { name: values.get('name'), frequency: values.get('frequency'), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, criteria: engineCriteria(params) } }), 'Recherche enregistrée.', searches.reload) }
  function editSearch(event: FormEvent<HTMLFormElement>, id: number) { event.preventDefault(); const values = new FormData(event.currentTarget); void mutate(() => apiRequest(`/saved-searches/${id}/`, { method: 'PATCH', body: { name: values.get('name'), frequency: values.get('frequency') } }), 'Recherche mise à jour.', searches.reload) }
  function importLink(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); void mutate(() => apiRequest('/external-opportunities/', { method: 'POST', body: { url: values.get('url') } }), 'Lien privé enregistré. Consultez son statut ci-dessous.', external.reload) }
  return <section className="engine-tools" aria-label="Mes recherches et alertes">
    {error && <p role="alert" className="dashboard-error">{error}</p>}
    <details className="offers-tool offers-tool--coverage"><summary>Couverture des sources</summary><QueryState {...coverage} />{coverage.data && <p>{coverage.data.verified_sources} sources vérifiées sur {coverage.data.active_sources} sources actives. Dernier passage réussi : {relativeDate(coverage.data.latest_verification)}. Cette couverture reste partielle.</p>}</details>
    <details className="offers-tool"><summary aria-label="Enregistrer cette recherche et gérer mes alertes">Recherches et alertes</summary><form className="engine-form" onSubmit={save}><label>Nom de la recherche<input name="name" required maxLength={160} /></label><label>Notifications internes<select name="frequency"><option value="off">Désactivées</option><option value="daily">Quotidiennes</option></select></label><button disabled={busy} className="dashboard-button">Enregistrer les filtres actuels</button></form><QueryState {...searches} /><ul className="engine-list">{searches.data?.results.map(search => <li key={search.id}><button className="dashboard-text-link" onClick={() => { const next = new URLSearchParams(); for (const [key, value] of Object.entries(search.criteria)) { if ([...filterKeys, 'unknown_policy'].includes(key)) next.set(key, Array.isArray(value) ? value.join(',') : String(value)); if (key === 'duration_max_months') next.set('duration_max', String(value)); if (key === 'languages' && Array.isArray(value)) next.set('required_language', String(value[0] ?? '')) } update(next) }}>{search.name}</button><span>{search.frequency === 'daily' ? 'Quotidiennes' : 'Sans alerte'}</span><details className="engine-search-edit"><summary>Modifier {search.name}</summary><form className="engine-form" aria-label={`Modifier ${search.name}`} onSubmit={event => editSearch(event, search.id)}><label>Nouveau nom<input name="name" required maxLength={160} defaultValue={search.name} /></label><label>Rythme des notifications<select name="frequency" defaultValue={search.frequency}><option value="off">Désactivées</option><option value="daily">Quotidiennes</option></select></label><button className="dashboard-button" disabled={busy}>Mettre à jour</button></form></details><button disabled={busy} aria-label={`Supprimer ${search.name}`} className="dashboard-button" onClick={() => void mutate(() => apiRequest(`/saved-searches/${search.id}/`, { method: 'DELETE' }), 'Recherche supprimée.', searches.reload)}>Supprimer</button></li>)}</ul>{searches.data?.count === 0 && <p>Aucune recherche enregistrée.</p>}<h3>Notifications</h3><QueryState {...alerts} />{alerts.data?.count === 0 && <p>Aucune notification.</p>}<ul className="engine-list">{alerts.data?.results.map(alert => <li key={alert.id}><Link to={`/offers/${alert.offer_id}`}>{alert.payload.title ?? 'Voir le stage'}</Link>{alert.read_at ? <span>Lue</span> : <button disabled={busy} className="dashboard-button" onClick={() => void mutate(() => apiRequest(`/alerts/${alert.id}/read/`, { method: 'PUT', body: {} }), 'Notification marquée comme lue.', alerts.reload)}>Marquer comme lue</button>}</li>)}</ul></details>
    <details className="offers-tool"><summary aria-label="Ajouter un lien de stage privé">Ajouter un lien privé</summary><p className="dashboard-muted">Conservez une offre trouvée ailleurs. L’import ne soumet aucune candidature.</p><form className="engine-form" onSubmit={importLink}><label>Adresse HTTPS de l’offre<input name="url" type="url" pattern="https://.*" required placeholder="https://…" /></label><button disabled={busy} className="dashboard-button">Ajouter le lien</button></form><QueryState {...external} /><button className="dashboard-button" onClick={external.reload}>Actualiser les statuts</button><ul className="engine-list">{external.data?.results.map(item => <li key={item.id}><span>{item.title || item.url}</span><span>{item.status === 'ready' ? 'Importé' : item.status === 'failed' ? 'Import impossible — lien conservé' : 'En attente d’extraction'}</span></li>)}</ul></details>
  </section>
}
const factLabels: Record<string, string> = { classification: 'Type de contrat', domain: 'Domaine', country_codes: 'Pays', duration: 'Durée', start_date: 'Date de début', required_languages: 'Langues requises', sponsorship_available: 'Sponsoring proposé' }
export function factValue(field: string, value: unknown): string {
  if (value == null) return 'Non précisé'
  if (field === 'domain') return domains[String(value)] ?? 'Non précisé'
  if (field === 'classification') return value === 'confirmed' ? 'Stage identifié' : value === 'not_internship' ? 'Autre contrat' : 'À vérifier'
  if (field === 'country_codes' && Array.isArray(value)) return value.map(code => regionNames.of(String(code))).join(', ')
  if (field === 'duration' && typeof value === 'object' && 'minimum' in value && 'maximum' in value && 'unit' in value) return `${value.minimum === value.maximum ? value.minimum : `${value.minimum} à ${value.maximum}`} ${value.unit === 'months' ? 'mois' : value.unit === 'weeks' ? 'semaines' : 'jours'}`
  if (field === 'required_languages' && Array.isArray(value)) { const names = new Intl.DisplayNames(['fr'], { type: 'language' }); return value.map(item => names.of(typeof item === 'string' ? item : item.code)).join(', ') }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  return typeof value === 'object' ? 'Voir l’extrait source ci-dessous' : String(value)
}
export function OfferEvidence({ offer }: { offer: EngineOffer }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [hidden, setHidden] = useState(false)
  async function send(report: boolean) { setBusy(true); setError(''); try { await apiRequest(report ? `/offers/${offer.id}/reports/` : `/offers/${offer.id}/feedback/`, { method: report ? 'POST' : hidden ? 'DELETE' : 'PUT', ...(!report && hidden ? {} : { body: { reason: report ? 'not_internship' : 'not_interested' } }) }); toast.success(report ? 'Signalement enregistré.' : hidden ? 'Offre rétablie dans vos recommandations.' : 'Offre masquée dans vos recommandations. Elle reste accessible dans le catalogue.'); if (!report) setHidden(value => !value) } catch (cause) { setError(authError(cause)) } finally { setBusy(false) } }
  return <section className="engine-evidence" aria-label="Qualité et sources"><p className="dashboard-muted">Dernière vérification : {offer.last_verified_at ? relativeDate(offer.last_verified_at) : 'non renseignée'}{offer.stale ? ' · À revérifier' : ''}</p>{offer.quality && <p>{offer.quality.classification === 'confirmed' ? 'Stage identifié' : 'Type de contrat à vérifier'} · {domains[offer.quality.domain] ?? 'Domaine non précisé'}</p>}{offer.facts && <details><summary>Informations extraites et preuves</summary><dl>{Object.entries(offer.facts).map(([field, fact]) => <div key={field}><dt>{factLabels[field] ?? field.replaceAll('_', ' ')}</dt><dd>{factValue(field, fact.value)}{fact.evidence_text && <blockquote>{fact.evidence_text}</blockquote>}</dd></div>)}</dl></details>}<div className="engine-actions"><button disabled={busy} className="dashboard-button" onClick={() => void send(false)}>{hidden ? 'Rétablir dans les recommandations' : 'Masquer des recommandations'}</button><button disabled={busy} className="dashboard-button" onClick={() => void send(true)}>Signaler : ce n’est pas un stage</button></div>{error && <p role="alert">{error}</p>}</section>
}
