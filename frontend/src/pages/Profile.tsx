import { toast } from 'sonner'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiError, apiRequest } from '../lib/api'
import { useApiQuery } from '../lib/useApiQuery'
import { AuthNotice } from '../components/auth/AuthControls'
import { Resume } from './Resume'
import './Profile.css'

type Value = string | number | boolean | null | number[] | string[]
type RecordData = Record<string, Value>
type PageData<T> = { results: T[]; count: number; page: number; page_size: number }
type Option = { id: number; name: string }
type Field = { key: string; label: string; type?: string; required?: boolean; nullable?: boolean; max?: number; choices?: [string, string][]; catalogue?: string; hint?: string }
type ProfileData = RecordData & { full_name: string; skill_ids: number[]; current_resume_id: number | null }
const approvedDepartures = new WeakSet<Event>()
const yesNo: [string, string][] = [['', 'Non renseigné'], ['true', 'Oui'], ['false', 'Non']]
const identity: Field[] = [
  { key: 'full_name', label: 'Nom affiché', required: true, max: 240 },
  { key: 'first_name', label: 'Prénom', max: 150 }, { key: 'last_name', label: 'Nom de famille', max: 150 },
  { key: 'headline', label: 'Titre du profil', max: 240, hint: 'Ex. Étudiant en informatique · Développement logiciel' },
  { key: 'phone', label: 'Téléphone', type: 'tel', max: 64 },
  { key: 'location_text', label: 'Localisation', max: 240, hint: 'Ville et pays où vous résidez.' },
  { key: 'available_from', label: 'Disponible à partir du', type: 'date', nullable: true },
  { key: 'presentation', label: 'Présentation', type: 'textarea' },
]
const presentation: Field[] = identity.filter(field => field.key === 'presentation')
const identityDetails: Field[] = identity.filter(field => field.key !== 'presentation')
const links: Field[] = ['LinkedIn', 'GitHub', 'Portfolio'].map(label => ({ key: `${label.toLowerCase()}_url`, label, type: 'url', nullable: true, max: 2048 }))
const dates = (precision: 'year' | 'month'): Field[] => [
  { key: 'start_date', label: precision === 'year' ? 'Année de début' : 'Mois et année de début', type: precision, nullable: true },
  { key: 'end_date', label: precision === 'year' ? 'Année de fin' : 'Mois et année de fin', type: precision, nullable: true },
  { key: 'is_current', label: 'En cours', type: 'boolean', choices: [['false', 'Non'], ['true', 'Oui']] },
  { key: 'description', label: 'Description', type: 'textarea' },
]
const collections: { name: string; title: string; hint: string; fields: Field[] }[] = [
  { name: 'experiences', title: 'Expériences', hint: 'Stages, emplois et engagements : ce que vous avez réellement fait.', fields: [{ key: 'title', label: 'Intitulé du poste', required: true, max: 240 }, { key: 'company_name', label: 'Entreprise ou organisation', required: true, max: 240 }, ...dates('month')] },
  { name: 'education', title: 'Formations', hint: 'Votre parcours académique, y compris les formations en cours.', fields: [{ key: 'institution', label: 'Établissement', required: true, max: 240 }, { key: 'degree', label: 'Diplôme', nullable: true, max: 240 }, { key: 'field_of_study', label: 'Domaine d’études', nullable: true, max: 240 }, ...dates('year')] },
  { name: 'projects', title: 'Projets', hint: 'Des réalisations concrètes qui donnent du relief à votre candidature.', fields: [{ key: 'title', label: 'Nom du projet', required: true, max: 240 }, { key: 'url', label: 'Lien du projet', type: 'url', nullable: true, max: 2048 }, { key: 'description', label: 'Description', type: 'textarea' }] },
  { name: 'work-authorizations', title: 'Autorisations de travail', hint: 'Vos déclarations par pays. Aucune autorisation n’est déduite de votre nationalité.', fields: [{ key: 'country_code', label: 'Pays (code à deux lettres)', required: true, max: 2, hint: 'Ex. FR, MA, GB ou US.' }, { key: 'authorized', label: 'Autorisé à travailler', type: 'boolean', nullable: true, choices: yesNo }, { key: 'needs_sponsorship', label: 'Besoin d’un visa sponsorisé', type: 'boolean', nullable: true, choices: yesNo }] },
]
const preferences: Field[] = [
  { key: 'role_ids', label: 'Métiers recherchés', catalogue: 'roles' },
  { key: 'location_ids', label: 'Lieux recherchés', catalogue: 'locations' },
  { key: 'contracts', label: 'Contrats acceptés', type: 'multi', choices: [['internship', 'Stage'], ['apprenticeship', 'Alternance'], ['employment', 'Emploi salarié'], ['contractor', 'Freelance / prestation'], ['temporary', 'Intérim']] },
  { key: 'work_modes', label: 'Modes de travail acceptés', type: 'multi', choices: [['onsite', 'Sur site'], ['hybrid', 'Hybride'], ['remote', 'À distance']] },
  { key: 'willing_to_relocate', label: 'Prêt à déménager', type: 'boolean', nullable: true, choices: yesNo },
  { key: 'minimum_salary', label: 'Rémunération minimum', type: 'number', nullable: true, hint: 'Facultatif. Sans montant, aucun seuil n’est appliqué.' },
  { key: 'salary_currency', label: 'Devise', nullable: true, max: 3, hint: 'Code à trois lettres : EUR, USD, MAD…' },
  { key: 'salary_period', label: 'Période', nullable: true, choices: [['', 'Non renseignée'], ['hour', 'Par heure'], ['day', 'Par jour'], ['week', 'Par semaine'], ['month', 'Par mois'], ['year', 'Par an']] },
  { key: 'salary_gross_net', label: 'Base de rémunération', choices: [['gross', 'Brut'], ['net', 'Net']] },
]

function failure(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 401) return 'Votre session a expiré. Reconnectez-vous avant de réessayer.'
    const details = cause.details && typeof cause.details === 'object' ? Object.entries(cause.details).map(([key, value]) => `${key} : ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(' · ') : ''
    return `${cause.message}${details ? ` — ${details}` : ''}`
  }
  return 'L’enregistrement n’a pas pu être confirmé. Vérifiez les données avant de réessayer.'
}
function Feedback({ query }: { query: { loading: boolean; error: string | null; reload: () => void } }) {
  return query.loading ? <p role="status">Chargement…</p> : query.error ? <div><AuthNotice error>{query.error}</AuthNotice><button className="profile-button" onClick={query.reload}>Réessayer</button></div> : null
}
function Card({ id, title, hint, action, children, compact = false }: { id: string; title: string; hint?: string; action?: ReactNode; children: ReactNode; compact?: boolean }) {
  return <section id={id} className={`profile-card${compact ? ' profile-card--compact' : ''}`} aria-labelledby={`${id}-title`}><header><div><h2 id={`${id}-title`} tabIndex={-1}>{title}</h2>{hint && <p>{hint}</p>}</div>{action}</header>{children}</section>
}

function useCatalogueNames(kind: string, ids: number[]) {
  const [names, setNames] = useState<Record<number, string>>({})
  const key = ids.join(',')
  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const selected = key.split(',').map(Number)
    async function load() {
      const found: Record<number, string> = {}
      for (let page = 1; !controller.signal.aborted; page++) {
        const data = await apiRequest<PageData<Option>>(`/catalogue/?kind=${kind}&page=${page}&page_size=100`, { signal: controller.signal })
        for (const row of data.results) if (selected.includes(row.id)) found[row.id] = row.name
        if (!controller.signal.aborted) setNames({ ...found })
        if (selected.every(id => found[id]) || page * data.page_size >= data.count || !data.results.length) break
      }
    }
    void load().catch(() => { /* IDs stay visible if catalogue metadata cannot be loaded. */ })
    return () => controller.abort()
  }, [kind, key])
  return names
}
function SelectedNames({ kind, ids }: { kind: string; ids: number[] }) {
  const names = useCatalogueNames(kind, ids)
  return <span className="profile-tags profile-tags-readonly">{ids.length ? ids.map(id => <span key={id}>{names[id] ?? `Sélection ${id}`}</span>) : 'Aucune sélection'}</span>
}

function CataloguePicker({ field, value, onChange }: { field: Field; value: number[]; onChange: (value: number[]) => void }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(1)
  const names = useCatalogueNames(field.catalogue!, value)
  const query = useApiQuery<PageData<Option>>(`/catalogue/?kind=${field.catalogue}&q=${encodeURIComponent(search)}&page=${page}&page_size=20`)
  return <fieldset className="profile-catalogue"><legend>{field.label}</legend>
    <div className="profile-tags">{value.map(id => <button key={id} type="button" onClick={() => onChange(value.filter(v => v !== id))} aria-label={`Retirer ${names[id] ?? `la sélection ${id}`}`}>{names[id] ?? `Sélection ${id}`} <span aria-hidden="true">×</span></button>)}</div>
    <label className="profile-field"><span>Rechercher — {field.label.toLowerCase()}</span><input type="search" value={search} maxLength={300} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
    <Feedback query={query} />
    <div className="profile-options">{query.data?.results.map(option => <label key={option.id}><input type="checkbox" checked={value.includes(option.id)} onChange={event => onChange(event.target.checked ? [...value, option.id] : value.filter(id => id !== option.id))} />{option.name}</label>)}</div>
    {query.data?.count === 0 && <p>Aucun résultat dans le catalogue.</p>}
    {query.data && query.data.count > 20 && <div className="profile-actions"><button type="button" className="profile-button" disabled={page === 1} onClick={() => setPage(v => v - 1)}>Précédent</button><span>Page {page}</span><button type="button" className="profile-button" disabled={page * 20 >= query.data.count} onClick={() => setPage(v => v + 1)}>Suivant</button></div>}
  </fieldset>
}

function Editor({ fields, initial, path, method = 'PATCH', onSaved, onCancel }: { fields: Field[]; initial: RecordData; path: `/${string}`; method?: 'PATCH' | 'POST' | 'PUT'; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<RecordData>(() => Object.fromEntries(fields.map(field => [field.key, (initial[field.key] != null && (field.type === 'year' || field.type === 'month') ? String(initial[field.key]).slice(0, field.type === 'year' ? 4 : 7) : initial[field.key]) ?? (field.catalogue || field.type === 'multi' ? [] : field.key === 'is_current' ? false : field.choices && !field.nullable ? field.choices[0][0] : '')])))
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const busy = useRef(false), form = useRef<HTMLFormElement>(null), uid = useId()
  useEffect(() => { form.current?.querySelector<HTMLElement>('input, textarea, select')?.focus() }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || approvedDepartures.has(event)) return
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')
      if (link && link.origin === location.origin && link.pathname !== location.pathname) {
        if (window.confirm('Quitter cette page ? Les modifications non enregistrées seront perdues.')) approvedDepartures.add(event)
        else { event.preventDefault(); event.stopImmediatePropagation() }
      }
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', leave, true)
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', leave, true) }
  }, [dirty])
  function update(key: string, value: Value) { setDirty(true); setDraft(old => ({ ...old, [key]: value })); setError(null) }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy.current) return
    const body = Object.fromEntries(fields.map(field => {
      let value = draft[field.key]
      if (typeof value === 'string') value = value.trim()
      if (field.type === 'boolean') value = value === '' || value == null ? null : value === true || value === 'true'
      if (value === '' && field.nullable) value = null
      if (value && field.type === 'year') value = `${value}-01-01`
      if (value && field.type === 'month') value = `${value}-01`
      if (['country_code', 'salary_currency'].includes(field.key) && typeof value === 'string') value = value.toUpperCase()
      return [field.key, value]
    }))
    const datePrecision = fields.find(field => field.key === 'start_date')?.type
    if (datePrecision === 'year' || datePrecision === 'month') body.date_precision = datePrecision
    if (body.is_current) body.end_date = null
    if (body.start_date && body.end_date && String(body.end_date) < String(body.start_date)) { setError('La date de fin doit suivre la date de début.'); return }
    if ('minimum_salary' in body) {
      if (body.minimum_salary === null) { body.salary_currency = null; body.salary_period = null }
      else if (!body.salary_currency || !body.salary_period) { setError('Précisez la devise et la période de votre rémunération minimum.'); return }
    }
    busy.current = true; setPending(true); setError(null)
    try { await apiRequest(path, { method, body }); onSaved() }
    catch (cause) { setError(failure(cause)) }
    finally { busy.current = false; setPending(false) }
  }
  return <form ref={form} onSubmit={save} aria-busy={pending} className="profile-editor"><fieldset disabled={pending} className="profile-form-grid">
    <legend className="profile-sr-only">Modifier les informations</legend>
    {fields.map(field => {
      const value = draft[field.key], id = `${uid}-${field.key}`
      if (field.catalogue) return <CataloguePicker key={field.key} field={field} value={value as number[]} onChange={v => update(field.key, v)} />
      if (field.type === 'multi') return <fieldset key={field.key} className="profile-catalogue"><legend>{field.label}</legend><div className="profile-options">{field.choices?.map(([key, label]) => <label key={key}><input type="checkbox" checked={(value as string[]).includes(key)} onChange={event => update(field.key, event.target.checked ? [...value as string[], key] : (value as string[]).filter(v => v !== key))} />{label}</label>)}</div></fieldset>
      return <div key={field.key} className={`profile-field${field.type === 'textarea' ? ' profile-field-wide' : ''}`}><label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
        {field.type === 'textarea' ? <textarea id={id} rows={4} value={String(value ?? '')} onChange={event => update(field.key, event.target.value)} />
          : field.choices ? <select id={id} required={field.required} value={String(value ?? '')} onChange={event => update(field.key, event.target.value)}>{field.choices.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          : <input id={id} type={field.type === 'year' ? 'text' : field.type ?? 'text'} inputMode={field.type === 'year' ? 'numeric' : undefined} placeholder={field.type === 'year' ? 'AAAA' : undefined} required={field.required} maxLength={field.type === 'year' ? 4 : field.max} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? '0.01' : undefined} pattern={field.type === 'year' ? '[0-9]{4}' : field.key === 'country_code' ? '[a-zA-Z]{2}' : field.key === 'salary_currency' ? '[a-zA-Z]{3}' : undefined} disabled={field.key === 'end_date' && (draft.is_current === true || draft.is_current === 'true')} value={String(value ?? '')} aria-describedby={field.hint ? `${id}-hint` : undefined} onChange={event => update(field.key, event.target.value)} />}
        {field.hint && <small id={`${id}-hint`}>{field.hint}</small>}
      </div>
    })}
    </fieldset>{error && <AuthNotice error>{error}</AuthNotice>}<div className="profile-actions"><button className="profile-button profile-button-primary" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button><button className="profile-button" type="button" disabled={pending} onClick={onCancel}>Annuler</button><small>* Champs obligatoires</small></div>
  </form>
}
function display(value: Value, field: Field, precision?: Value) {
  if (value == null || value === '') return 'Non renseigné'
  if (field.choices) return Array.isArray(value) ? value.map(v => field.choices!.find(([key]) => key === String(v))?.[1] ?? v).join(', ') || 'Aucune sélection' : field.choices.find(([key]) => key === String(value))?.[1] ?? String(value)
  if (field.catalogue) return `${(value as number[]).length} sélection(s)`
  if (field.type === 'url' && /^https?:\/\//i.test(String(value))) return <a href={String(value)} target="_blank" rel="noreferrer">{String(value)}</a>
  if (field.type === 'date') return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: precision === 'year' ? undefined : 'long', day: precision === 'month' || precision === 'year' ? undefined : 'numeric', timeZone: 'UTC' }).format(new Date(String(value)))
  return String(value)
}
function hasValue(value: Value) {
  return value != null && value !== '' && (!Array.isArray(value) || value.length > 0)
}
function hasSummaryValue(field: Field, data: RecordData) {
  return hasValue(data[field.key]) && (!['salary_currency', 'salary_period', 'salary_gross_net'].includes(field.key) || hasValue(data.minimum_salary))
}
function Summary({ fields, data, filledOnly = false }: { fields: Field[]; data: RecordData; filledOnly?: boolean }) {
  const shown = filledOnly ? fields.filter(field => hasSummaryValue(field, data)) : fields
  if (!shown.length) return null
  return <dl className={`profile-summary${fields.length === 1 ? ' profile-summary--single' : ''}`}>{shown.map(field => {
    const value = data[field.key]
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0)
    return <div key={field.key}><dt>{field.label}</dt><dd className={empty ? 'profile-value-empty' : undefined}>{field.catalogue ? <SelectedNames kind={field.catalogue} ids={(value as number[]) ?? []} /> : display(value, field, data.date_precision)}</dd></div>
  })}</dl>
}
function Editable({ id, title, hint, fields, data, path = '/profile/', method, reload, filledOnly = false }: { id: string; title: string; hint?: string; fields: Field[]; data: RecordData; path?: `/${string}`; method?: 'PATCH' | 'PUT'; reload: () => void; filledOnly?: boolean }) {
  const [editing, setEditing] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const empty = filledOnly && !fields.some(field => hasSummaryValue(field, data))
  function close() { setEditing(false); requestAnimationFrame(() => button.current?.focus()) }
  return <Card id={id} title={title} hint={hint} compact={empty && !editing} action={!editing && <button ref={button} className="profile-button" onClick={() => setEditing(true)}>{empty ? 'Ajouter' : 'Modifier'} <span className="profile-sr-only">{title}</span></button>}>{editing ? <Editor fields={fields} initial={data} path={path} method={method} onCancel={close} onSaved={() => { close(); toast.success('Modifications enregistrées.'); reload() }} /> : <Summary fields={fields} data={data} filledOnly={filledOnly} />}</Card>
}
function recordTitle(config: typeof collections[number], row: RecordData) {
  if (config.name === 'work-authorizations') return new Intl.DisplayNames(['fr'], { type: 'region' }).of(String(row.country_code)) ?? String(row.country_code)
  return String(row.title || row.institution)
}
function RecordDetails({ config, row }: { config: typeof collections[number]; row: RecordData }) {
  if (config.name === 'work-authorizations') return <Summary fields={config.fields.filter(field => field.key !== 'country_code')} data={row} filledOnly />
  const secondary = (config.name === 'education' ? [row.degree, row.field_of_study] : config.name === 'experiences' ? [row.company_name] : []).filter(hasValue).map(String)
  const dateField: Field = { key: 'date', label: 'Date', type: 'date' }
  const precision = config.name === 'education' ? 'year' : config.name === 'experiences' ? 'month' : row.date_precision
  const start = hasValue(row.start_date) ? String(display(row.start_date, dateField, precision)) : ''
  const end = row.is_current === true || row.is_current === 'true' ? 'En cours' : hasValue(row.end_date) ? String(display(row.end_date, dateField, precision)) : ''
  const period = [start, end].filter(Boolean).join(' — ')
  return <div className="profile-record-details">
    {secondary.length > 0 && <p className="profile-record-secondary">{secondary.join(' · ')}</p>}
    {period && <p className="profile-record-period">{period}</p>}
    {config.name === 'projects' && hasValue(row.url) && <p>{display(row.url, { key: 'url', label: 'Lien', type: 'url' })}</p>}
    {hasValue(row.description) && <p className="profile-record-description">{String(row.description)}</p>}
  </div>
}
function Collection({ config }: { config: typeof collections[number] }) {
  const [page, setPage] = useState(1)
  const query = useApiQuery<PageData<RecordData>>(`/profile/${config.name}/?page=${page}&page_size=10`)
  const [editing, setEditing] = useState<RecordData | null>(null), [deleting, setDeleting] = useState<number | null>(null), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null)
  const busy = useRef(false), add = useRef<HTMLButtonElement>(null)
  function close() { setEditing(null); requestAnimationFrame(() => add.current?.focus()) }
  async function remove(id: number) {
    if (busy.current) return
    busy.current = true; setPending(true); setError(null)
    try { await apiRequest(`/profile/${config.name}/${id}/`, { method: 'DELETE' }); setDeleting(null); toast.success('Élément supprimé.'); if (query.data?.results.length === 1 && page > 1) setPage(p => p - 1); else query.reload() }
    catch (cause) { setError(failure(cause)) }
    finally { busy.current = false; setPending(false) }
  }
  return <Card id={config.name} title={config.title} hint={config.name === 'work-authorizations' ? config.hint : undefined} compact={!!query.data && !query.data.results.length && !editing} action={query.data && !editing && <button ref={add} disabled={pending} className="profile-button" onClick={() => { setEditing({}); setDeleting(null) }}>Ajouter <span className="profile-sr-only">{config.title}</span></button>}><Feedback query={query} />
    {query.data && !editing && <>{query.data.results.length ? <div className="profile-records">{query.data.results.map(row => <article key={String(row.id)}><h3>{recordTitle(config, row)}</h3><RecordDetails config={config} row={row} />
      {deleting === row.id ? <div className="profile-delete" role="group" aria-label="Confirmer la suppression"><p>Supprimer cet élément de votre profil ?</p><div className="profile-actions"><button className="profile-button" disabled={pending} onClick={() => remove(Number(row.id))}>{pending ? 'Suppression…' : 'Confirmer la suppression'}</button><button className="profile-button" disabled={pending} onClick={() => { setDeleting(null); setError(null) }}>Annuler</button></div></div> : <div className="profile-actions"><button className="profile-button" disabled={pending} onClick={() => { setDeleting(null); setEditing(row) }}>Modifier <span className="profile-sr-only">{recordTitle(config, row)}</span></button><button className="profile-button" disabled={pending} onClick={() => { setDeleting(Number(row.id)); setError(null) }}>Supprimer <span className="profile-sr-only">{recordTitle(config, row)}</span></button></div>}</article>)}</div> : null}
      {query.data.count > 10 && <div className="profile-actions"><button className="profile-button" disabled={page === 1 || pending} onClick={() => setPage(p => p - 1)}>Précédent</button><span>Page {page}</span><button className="profile-button" disabled={page * 10 >= query.data.count || pending} onClick={() => setPage(p => p + 1)}>Suivant</button></div>}</>}
    {editing && <Editor key={String(editing.id ?? 'new')} fields={config.fields} initial={editing} path={editing.id ? `/profile/${config.name}/${editing.id}/` : `/profile/${config.name}/`} method={editing.id ? 'PATCH' : 'POST'} onCancel={close} onSaved={() => { close(); query.reload(); toast.success('Élément enregistré.') }} />}
    {error && <AuthNotice error>{error}</AuthNotice>}
  </Card>
}
function useRetainedData<T>(incoming: T | null) {
  const [last, setLast] = useState<T | null>(null)
  if (incoming && incoming !== last) setLast(incoming)
  return incoming ?? last
}
function Preferences() {
  const query = useApiQuery<RecordData>('/preferences/')
  const data = useRetainedData(query.data)
  const missingCriteria = data && (!(data.contracts as string[])?.length || !(data.work_modes as string[])?.length)
  return data ? <>{query.error && <Feedback query={query} />}<Editable id="preferences" title="Préférences de recherche" hint={missingCriteria ? 'Ajoutez un contrat et un mode de travail pour activer les recommandations.' : undefined} fields={preferences} data={data} path="/preferences/" method="PUT" reload={query.reload} filledOnly /></> : <Card id="preferences" title="Préférences de recherche"><Feedback query={query} /></Card>
}
function Address() {
  const query = useApiQuery<{ address: RecordData; countries: string[]; citizenships: string[] }>('/onboarding/')
  const data = useRetainedData(query.data)
  const countries = new Intl.DisplayNames(['fr'], { type: 'region' })
  const fields: Field[] = [{ key: 'street_address', label: 'Adresse', required: true, max: 240 }, { key: 'city', label: 'Ville', required: true, max: 160 }, { key: 'postal_code', label: 'Code postal', max: 32 }, { key: 'district', label: 'Quartier / district', max: 160 }, { key: 'region', label: 'Région', max: 160 }, { key: 'country_code', label: 'Pays', required: true, choices: [['', 'Choisir un pays'], ...(data?.countries ?? []).map(code => [code, countries.of(code) ?? code] as [string, string])] }]
  return data ? <>{query.error && <Feedback query={query} />}<Editable id="address" title="Adresse" fields={fields} data={data.address} path="/onboarding/address/" method="PUT" reload={query.reload} filledOnly /><Card id="citizenships" title="Nationalités et déclarations"><p>{data.citizenships.map(code => countries.of(code)).join(', ') || 'Aucune nationalité renseignée.'}</p><Link className="profile-button" to="/onboarding/work-eligibility">Revoir mes déclarations complètes</Link></Card></> : <Card id="address" title="Adresse"><Feedback query={query} /></Card>
}
export function Profile() {
  const query = useApiQuery<ProfileData>('/profile/')
  const [lastData, setLastData] = useState<ProfileData | null>(null)
  if (query.data && query.data !== lastData) setLastData(query.data)
  const data = query.data ?? lastData
  const hasData = !!data
  useEffect(() => {
    if (!hasData) return
    const followHash = () => {
      const section = document.getElementById(window.location.hash.slice(1))
      if (!section?.classList.contains('profile-card')) return
      section.scrollIntoView()
      section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
    }
    window.addEventListener('hashchange', followHash)
    followHash()
    return () => window.removeEventListener('hashchange', followHash)
  }, [hasData])
  return <main id="main-content" className="profile-page">
    <div className="profile-heading"><h1>Profil</h1><nav className="profile-tabs" aria-label="Rubriques du profil"><a href="#summary">Parcours</a><a href="#resume">CV</a><a href="#preferences">Candidatures</a></nav></div>
    {(!data || query.error) && <Feedback query={query} />}
    {data && <div className="profile-panels">
      <section className="profile-panel" aria-label="Parcours">
        <Editable id="summary" title="Présentation" fields={presentation} data={data} reload={query.reload} filledOnly />
        <Collection config={collections[1]} />
        <Collection config={collections[0]} />
        <Collection config={collections[2]} />
        <Editable id="links" title="Liens professionnels" fields={links} data={data} reload={query.reload} filledOnly />
      </section>
      <section className="profile-panel" aria-label="Candidatures">
        <Editable id="identity" title="Informations personnelles" fields={identityDetails} data={data} reload={query.reload} filledOnly />
        <Card id="resume" title="CV" hint="Le CV ne remplit pas automatiquement les autres rubriques."><Resume embedded onSaved={query.reload} /></Card>
        <Preferences />
        <Editable id="skills" title="Compétences" fields={[{ key: 'skill_ids', label: 'Compétences', catalogue: 'skills' }]} data={data} reload={query.reload} filledOnly />
        <Address />
        <Collection config={collections[3]} />
        <p className="profile-footnote">Les candidatures déjà préparées conservent leur version du profil.</p>
      </section>
    </div>}
  </main>
}
