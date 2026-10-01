import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Cancel01Icon, Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { useApiQuery } from '../../lib/useApiQuery'
import './JobTaxonomyPicker.css'

export type JobSelection = { domains: string[]; subdomains: string[] }
export type JobSubdomain = { slug: string; name: string; aliases: string[]; count: number; generalist: boolean }
export type JobDomain = { slug: string; name: string; count: number; subdomains: JobSubdomain[] }
export type JobTaxonomy = { version: string; domains: JobDomain[] }
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function DomainCheckbox({ domain, selection, disabled, onChange }: { domain: JobDomain; selection: JobSelection; disabled: boolean; onChange: () => void }) {
  const selected = selection.domains.includes(domain.slug)
  const partial = !selected && domain.subdomains.some(sub => selection.subdomains.includes(sub.slug))
  return <label className="job-taxonomy-domain-check"><input type="checkbox" checked={selected} ref={input => { if (input) input.indeterminate = partial }} disabled={disabled && !selected && !partial} onChange={onChange} /><span className="job-taxonomy-option-name">Tout le domaine</span><span className="job-taxonomy-count">{domain.count.toLocaleString('fr')}</span></label>
}

export function JobTaxonomyPicker({ taxonomy, loading, error, retry, value, onChange, onApply, allowEmpty = false, onlySubdomains = false, label = 'Domaines et métiers' }: {
  taxonomy: JobTaxonomy | null; loading: boolean; error: string | null; retry: () => void;
  value: JobSelection; onChange: (value: JobSelection) => void; onApply?: () => void; allowEmpty?: boolean; onlySubdomains?: boolean; label?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<JobSelection>(value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const count = value.domains.length + value.subdomains.length
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus() }
  function show() {
    setDraft({ domains: [...value.domains], subdomains: [...value.subdomains] }); setQuery(''); setOpen(true)
    dialog.current?.showModal(); search.current?.focus()
  }
  function toggleDomain(domain: JobDomain) {
    setDraft(current => ({ domains: current.domains.includes(domain.slug) ? current.domains.filter(s => s !== domain.slug) : [...current.domains, domain.slug], subdomains: current.subdomains.filter(s => !domain.subdomains.some(sub => sub.slug === s)) }))
  }
  function toggleSubdomain(domain: JobDomain, sub: JobSubdomain) {
    setDraft(current => {
      const parent = current.domains.includes(domain.slug)
      const leaves = parent ? [...current.subdomains, ...domain.subdomains.map(s => s.slug)] : current.subdomains
      return { domains: current.domains.filter(s => s !== domain.slug), subdomains: leaves.includes(sub.slug) ? leaves.filter(s => s !== sub.slug) : [...leaves, sub.slug] }
    })
  }
  const needle = normalized(query.trim())
  const selections = [
    ...draft.domains.map(slug => ({ slug, kind: 'domains' as const, name: taxonomy?.domains.find(domain => domain.slug === slug)?.name ?? 'Domaine sélectionné' })),
    ...draft.subdomains.map(slug => ({ slug, kind: 'subdomains' as const, name: taxonomy?.domains.flatMap(domain => domain.subdomains).find(sub => sub.slug === slug)?.name ?? 'Métier sélectionné' })),
  ]
  return <div className="job-taxonomy-control">
    <span className="job-taxonomy-label">{label}</span>
    <button ref={trigger} type="button" className="job-taxonomy-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={show}>{count ? `${count} sélection${count > 1 ? 's' : ''}` : 'Tous les domaines'}<span aria-hidden="true">⌄</span></button>
    {createPortal(<dialog ref={dialog} className="job-taxonomy-dialog" aria-label={label} onCancel={() => { setOpen(false); trigger.current?.focus() }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div className="job-taxonomy-body">
        <div className="job-taxonomy-header">
          <div className="job-taxonomy-heading"><div><span className="job-taxonomy-eyebrow">{onlySubdomains ? 'Vos exclusions' : 'Affinez votre recherche'}</span><h2>{label}</h2></div><button type="button" className="job-taxonomy-close" aria-label="Fermer les métiers" onClick={close}><HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} aria-hidden="true" /></button></div>
          <p>{onlySubdomains ? 'Choisissez les spécialités à exclure des recommandations.' : 'Explorez les domaines et choisissez les métiers qui vous intéressent.'}</p>
          <label className="job-taxonomy-search"><span className="job-taxonomy-sr-only">Rechercher un métier</span><HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} aria-hidden="true" /><input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Backend, recrutement, mécanique…" autoComplete="off" /></label>
          <div className="job-taxonomy-list-heading"><span>{needle ? 'Résultats de recherche' : 'Parcourir les domaines'}</span><span>Offres disponibles</span></div>
        </div>
        {loading && <p className="job-taxonomy-message" role="status">Chargement des métiers…</p>}
        {error && <p className="job-taxonomy-message" role="alert">Impossible de charger les métiers. <button type="button" className="dashboard-button" onClick={retry}>Réessayer</button></p>}
        <div className="job-taxonomy-groups">
          {taxonomy?.domains.map(domain => {
            const parentMatch = normalized(domain.name).includes(needle)
            const children = domain.subdomains.filter(sub => !needle || parentMatch || normalized([sub.name, sub.slug, ...sub.aliases].join(' ')).includes(needle))
            if (!children.length) return null
            const selectedCount = domain.subdomains.filter(sub => draft.subdomains.includes(sub.slug)).length
            const selected = draft.domains.includes(domain.slug)
            return <details key={domain.slug} open={needle ? true : undefined} data-selected={selected || selectedCount > 0 || undefined}>
              <summary><HugeiconsIcon className="job-taxonomy-chevron" icon={ArrowRight01Icon} size={18} strokeWidth={1.5} aria-hidden="true" /><span className="job-taxonomy-domain-name">{domain.name}</span>{(selected || selectedCount > 0) && <span className="job-taxonomy-group-selection" aria-label={selected ? 'Tout le domaine sélectionné' : `${selectedCount} spécialités sélectionnées`}>{selected ? <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} aria-hidden="true" /> : selectedCount}</span>}<span className="job-taxonomy-count">{domain.count.toLocaleString('fr')}</span></summary>
              <div className="job-taxonomy-options">
              {!onlySubdomains && <DomainCheckbox domain={domain} selection={draft} disabled={!allowEmpty && domain.count === 0} onChange={() => toggleDomain(domain)} />}
              {children.map(sub => {
                const checked = draft.domains.includes(domain.slug) || draft.subdomains.includes(sub.slug)
                return <label key={sub.slug} className="job-taxonomy-leaf"><input type="checkbox" checked={checked} disabled={!allowEmpty && sub.count === 0 && !checked} onChange={() => toggleSubdomain(domain, sub)} /><span className="job-taxonomy-option-name">{sub.name}</span><span className="job-taxonomy-count">{sub.count.toLocaleString('fr')}</span></label>
              })}
              </div>
            </details>
          })}
          {taxonomy && !taxonomy.domains.some(domain => normalized(domain.name).includes(needle) || domain.subdomains.some(sub => normalized([sub.name, sub.slug, ...sub.aliases].join(' ')).includes(needle))) && <p role="status">Aucun métier trouvé. Essayez un autre terme.</p>}
        </div>
        <div className="job-taxonomy-footer">
          <div className="job-taxonomy-selection-heading"><span role="status">{selections.length ? `${selections.length} sélection${selections.length > 1 ? 's' : ''}` : onlySubdomains ? 'Aucune exclusion' : 'Tous les domaines'}</span><button type="button" className="job-taxonomy-clear" disabled={!selections.length} onClick={() => setDraft({ domains: [], subdomains: [] })}>Effacer la sélection</button></div>
          {selections.length > 0 && <div className="job-taxonomy-selections" aria-label="Sélection actuelle">{selections.map(item => <button key={`${item.kind}-${item.slug}`} type="button" aria-label={`Retirer la sélection : ${item.name}`} onClick={() => setDraft(current => ({ ...current, [item.kind]: current[item.kind].filter(slug => slug !== item.slug) }))}><span>{item.name}</span><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} aria-hidden="true" /></button>)}</div>}
          <div className="job-taxonomy-actions"><button type="button" className="dashboard-button" onClick={close}>Annuler</button><button type="button" className="dashboard-button dashboard-button--primary" disabled={!taxonomy} onClick={() => { onChange(draft); close(); requestAnimationFrame(() => onApply?.()) }}>{onApply ? 'Voir les offres' : 'Choisir ces métiers'}</button></div>
        </div>
      </div>
    </dialog>, document.body)}
  </div>
}

export function PreferenceTaxonomyPicker({ value, onChange, exclusions = false }: { value: JobSelection; onChange: (value: JobSelection) => void; exclusions?: boolean }) {
  const query = useApiQuery<JobTaxonomy>('/taxonomy/')
  return <JobTaxonomyPicker taxonomy={query.data} loading={query.loading} error={query.error} retry={query.reload} value={value} onChange={onChange} allowEmpty onlySubdomains={exclusions} label={exclusions ? 'Métiers à exclure' : 'Domaines et métiers'} />
}

export function TaxonomyNames({ values, domains = false }: { values: string[]; domains?: boolean }) {
  const query = useApiQuery<JobTaxonomy>('/taxonomy/')
  const vocabulary = domains ? query.data?.domains : query.data?.domains.flatMap(d => d.subdomains)
  return <>{values.map(slug => vocabulary?.find(item => item.slug === slug)?.name ?? 'Métier sélectionné').join(', ') || 'Aucune sélection'}</>
}
