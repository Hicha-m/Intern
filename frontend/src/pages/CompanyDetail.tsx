import { useEffect, useRef, type FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon, ArrowDown01Icon, Building03Icon, Briefcase02Icon, Location01Icon, Search01Icon, UserGroupIcon, BookOpen01Icon, GiftIcon, SourceCodeIcon, Leaf01Icon, NewsIcon, PlayIcon } from '@hugeicons/core-free-icons'
import { useApiQuery } from '../lib/useApiQuery'
import { offerLocationLabel, relativeDate, safeExternalUrl, type Offer, type PageData } from '../components/dashboard/data'
import { CompanyMark } from './Dashboard'
import { Pagination } from '../components/ui/Pagination'
import { contractLabel, seniorityLabel } from '../lib/employment'
import './CompanyDetail.css'

type Entry = { key: string; label: string; value: string; source_url: string; observed_at: string; source_kind: string; scope?: string }
type Company = {
  id: number; name: string; domain?: string | null; website_url?: string; logo_url?: string | null; description: string
  offers_count: number; hiring_locations: { locations__name: string; locations__city?: string; locations__country_code?: string }[]
  profile: { facts: Entry[]; sections: Entry[]; updated_at: string | null; missing_sections: { key: string; label: string }[] }
}
type Recommendation = { offer: Offer; reasons: { code: string }[]; ranking: { score: number } }
const reasonLabels: Record<string, string> = {
  preferred_subdomain: 'Métier recherché', preferred_domain: 'Domaine recherché',
  preferred_role: 'Poste recherché', preferred_location: 'Lieu souhaité',
  profile_skills: 'Compétences en commun', preferred_contract: 'Contrat souhaité',
  preferred_work_mode: 'Mode de travail souhaité', salary_range_meets_minimum: 'Rémunération souhaitée',
}
const sectionIcons = { culture: UserGroupIcon, benefits: GiftIcon, recruitment: Briefcase02Icon, early_careers: BookOpen01Icon, technology: SourceCodeIcon, commitments: Leaf01Icon, news: NewsIcon, media: PlayIcon }

function CompanyInformation({ entry }: { entry: Entry }) {
  return <details className="company-info-card">
    <summary aria-label={entry.label}>
      <span className="company-info-icon"><HugeiconsIcon icon={sectionIcons[entry.key as keyof typeof sectionIcons] ?? Building03Icon} size={20} strokeWidth={1.5} aria-hidden="true" /></span>
      <span className="company-info-summary"><span className="company-info-title">{entry.label}</span><span className="company-info-preview">{entry.value}</span></span>
      <HugeiconsIcon className="company-info-chevron" icon={ArrowDown01Icon} size={18} strokeWidth={1.5} aria-hidden="true" />
    </summary>
    <div className="company-info-body"><div className="company-prose"><p>{entry.value}</p></div><Source entry={entry} /></div>
  </details>
}

function CompanyOfferCard({ offer, reasons }: { offer: Offer; reasons: string[] }) {
  const location = useLocation()
  const mode = { remote: 'À distance', hybrid: 'Hybride', onsite: 'Sur place', on_site: 'Sur place' }[offer.work_mode ?? '']
  return <article className="catalogue-card company-offer-card"><Link to={`/offers/${offer.id}`} state={{ returnTo: `${location.pathname}${location.search}` }} className="company-offer-link" aria-label={`Voir l’offre : ${offer.title} chez ${offer.company.name}`}>
    <div className="company-offer-top"><span className="company-offer-type">{contractLabel(offer.contract_type)}{offer.seniority && offer.seniority !== 'unknown' && ` · ${seniorityLabel(offer.seniority)}`}{mode && ` · ${mode}`}</span><HugeiconsIcon className="company-offer-arrow" icon={ArrowUpRight01Icon} size={20} strokeWidth={1.5} aria-hidden="true" /></div>
    <h3>{offer.title}</h3>
    {offer.taxonomy?.subdomain && ['classified', 'broad'].includes(offer.taxonomy.status) && <p className="company-offer-family">{offer.taxonomy.subdomain.name}</p>}
    <p className="company-offer-location"><HugeiconsIcon icon={Location01Icon} size={16} strokeWidth={1.5} aria-hidden="true" />{offerLocationLabel(offer.locations)}</p>
    {reasons.length > 0 && <p className="company-match-reasons">{reasons.join(' · ')}</p>}
    <span className="company-offer-action">Découvrir l’offre<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} aria-hidden="true" /></span>
  </Link></article>
}

function Source({ entry }: { entry: Entry }) {
  const url = safeExternalUrl(entry.source_url)
  return <p className="company-source">
    {url && <a href={url} target="_blank" rel="noopener noreferrer">{entry.source_kind === 'job_posting' ? 'Source : offre de l’entreprise' : entry.source_kind === 'editorial' ? 'Source éditoriale' : 'Source entreprise'} <span aria-hidden="true">↗</span></a>}
    <span>Consultée {relativeDate(entry.observed_at)}</span>
    {entry.scope && <span>{entry.scope}</span>}
  </p>
}

export function CompanyDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const recommended = params.get('view') === 'recommended'
  const companyQuery = useApiQuery<Company>(`/companies/${id}/`)
  const filters = new URLSearchParams({ page: params.get('page') ?? '1', page_size: '12', company: id ?? '', ...(params.get('q') ? { q: params.get('q')! } : {}) })
  const feed = useApiQuery<PageData<Offer | Recommendation>>(recommended ? `/recommendations/?${filters}` : `/companies/${id}/offers/?${filters}`)
  const heading = useRef<HTMLHeadingElement>(null)
  const navigated = useRef(false)
  useEffect(() => {
    if (feed.loading || !navigated.current) return
    navigated.current = false
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [feed.loading])
  const company = companyQuery.data
  const presentation = company?.profile.sections.filter(entry => entry.key === 'presentation') ?? []
  const sections = company?.profile.sections.filter(entry => entry.key !== 'presentation') ?? []
  const website = safeExternalUrl(company?.website_url)
  const industry = company?.profile.facts.find(entry => entry.key === 'industry')
  const locations = company?.hiring_locations.map(location => ({ name: location.locations__name, city: location.locations__city, country_code: location.locations__country_code })) ?? []
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams(params)
    const query = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    if (query) next.set('q', query); else next.delete('q')
    next.delete('page'); navigated.current = true; setParams(next)
  }
  function view(nextView: string) {
    const next = new URLSearchParams(params)
    if (nextView === 'recommended') next.set('view', nextView); else next.delete('view')
    next.delete('page'); setParams(next)
  }
  return <main id="main-content" className="dashboard-content company-page" aria-busy={companyQuery.loading}>
    <Link to="/stages" className="offer-back-link"><HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" />Explorer les offres</Link>
    {companyQuery.error ? <div className="dashboard-error" role="alert">{companyQuery.error}<button className="dashboard-button" onClick={companyQuery.reload}>Réessayer</button></div> : company ? <>
      <header className="company-hero">
        <div className="company-identity">
        <CompanyMark name={company.name} id={company.id} logoUrl={company.logo_url} domain={company.domain} />
        <div className="company-identity-copy"><p className="company-eyebrow">Découvrir l’entreprise</p><h1>{company.name}</h1><div className="company-hero-meta">{industry && <span className="company-industry"><HugeiconsIcon icon={Building03Icon} size={16} strokeWidth={1.5} aria-hidden="true" />{industry.value}</span>}<p className="company-hero-count">{company.offers_count.toLocaleString('fr')} offre{company.offers_count > 1 ? 's' : ''} en Europe sur Intern</p></div></div>
        </div>
        <div className="company-hero-actions"><a href="#offers-results" className="dashboard-button dashboard-button--primary">Voir les offres<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} aria-hidden="true" /></a>
        {website && <a href={website} className="company-website" target="_blank" rel="noopener noreferrer">Site de l’entreprise<HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={1.5} aria-hidden="true" /></a>}</div>
      </header>
      <nav className="company-section-nav" aria-label="Rubriques de l’entreprise"><a href="#company-overview">Présentation</a><a href="#company-information">La vie en entreprise</a><a href="#offers-results">Les offres <span className="company-nav-count">{company.offers_count}</span></a></nav>
      <div className="company-overview-grid">
        <section id="company-overview" className="company-presentation" aria-labelledby="company-presentation-title"><p className="company-section-kicker">Qui sont-ils ?</p><h2 id="company-presentation-title">À propos de {company.name}</h2>
          {presentation.length ? presentation.map((entry, index) => <div key={index}><div className="company-prose">{entry.value.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div><Source entry={entry} /></div>) : company.description ? <div className="company-prose"><p>{company.description}</p><p className="dashboard-muted">La source de cette présentation n’est pas encore renseignée.</p></div> : <p className="dashboard-muted">La présentation de cette entreprise n’est pas encore disponible.{website && <> Retrouvez son activité sur <a href={website} target="_blank" rel="noopener noreferrer">son site officiel</a>.</>}</p>}
        </section>
        <aside className="company-key-info" aria-labelledby="company-key-info-title"><div className="company-key-info-heading"><HugeiconsIcon icon={Building03Icon} size={20} strokeWidth={2} aria-hidden="true" /><h2 id="company-key-info-title">L’entreprise en bref</h2></div><dl>
          {['industry', 'size', 'headquarters', 'founded'].map(key => { const entry = company.profile.facts.find(fact => fact.key === key); return <div key={key}><dt>{entry?.label ?? ({ industry: 'Secteur', size: 'Effectif', headquarters: 'Siège social', founded: 'Année de création' }[key])}</dt><dd>{entry ? <>{entry.value}<Source entry={entry} /></> : 'Non renseigné'}</dd></div> })}
          {company.profile.facts.filter(entry => !['industry', 'size', 'headquarters', 'founded'].includes(entry.key)).map((entry, index) => <div key={index}><dt>{entry.label}</dt><dd>{entry.value}<Source entry={entry} /></dd></div>)}
          {locations.length > 0 && <div><dt>Lieux des offres sur Intern</dt><dd>{offerLocationLabel(locations)}</dd></div>}
        </dl></aside>
      <section id="company-information" className="company-information" aria-labelledby="company-information-title"><p className="company-section-kicker">Culture, parcours et quotidien</p><h2 id="company-information-title">Travailler chez {company.name}</h2>
        {sections.length > 0 && <div className="company-information-grid">{sections.map((entry, index) => <CompanyInformation entry={entry} key={index} />)}</div>}
        {company.profile.missing_sections.filter(entry => entry.key !== 'presentation').length > 0 && <details className="company-missing"><summary>Informations encore à compléter</summary><p>Ces informations ne sont pas encore documentées pour cette entreprise.</p><ul>{company.profile.missing_sections.filter(entry => entry.key !== 'presentation').map(entry => <li key={entry.key}>{entry.label}</li>)}</ul></details>}
      </section>
      </div>
      <section className="company-jobs" aria-labelledby="offers-results">
        <div className="company-jobs-heading"><div><p className="company-section-kicker">Votre prochaine opportunité</p><h2 id="offers-results" ref={heading} tabIndex={-1}>Les offres chez {company.name}</h2><p className="dashboard-muted">Des emplois informatiques en Europe, récemment vérifiés et réunis au même endroit.</p></div><span className="company-jobs-total">{company.offers_count}<span>offre{company.offers_count > 1 ? 's' : ''}</span></span></div>
        <div className="company-jobs-toolbar"><div className="company-feed-switch" role="group" aria-label="Affichage des offres"><button type="button" aria-pressed={!recommended} onClick={() => view('all')}>Toutes les offres</button><button type="button" aria-pressed={recommended} onClick={() => view('recommended')}>Pour vous</button></div>
          <form key={`${id}:${params.get('q') ?? ''}`} onSubmit={search} role="search" aria-label="Rechercher dans les offres de l’entreprise"><label htmlFor="company-job-search" className="offers-visually-hidden">Rechercher un poste</label><div className="company-search-field"><HugeiconsIcon icon={Search01Icon} size={19} strokeWidth={1.5} aria-hidden="true" /><input id="company-job-search" name="q" type="search" maxLength={300} defaultValue={params.get('q') ?? ''} placeholder="Rechercher un poste…" /></div><button className="dashboard-button" type="submit">Rechercher</button></form>
        </div>
        {recommended && <p className="company-recommendation-note">Classés selon les préférences de votre profil. Cette affinité ne garantit pas votre éligibilité ; vérifiez les conditions de chaque offre.</p>}
        {feed.error ? <div className="dashboard-error" role="alert">{feed.error}<button className="dashboard-button" onClick={feed.reload}>Réessayer</button></div> : feed.loading ? <p role="status" className="dashboard-muted">Chargement des offres…</p> : feed.data?.results.length ? <><p className="company-result-count">{feed.data.count.toLocaleString('fr')} offre{feed.data.count > 1 ? 's' : ''}{params.get('q') ? ' trouvée(s)' : ''}</p><div className="company-offers">{feed.data.results.map(row => {
          const offer = 'offer' in row ? row.offer : row
          const reasons = 'offer' in row ? row.reasons.map(reason => reasonLabels[reason.code]).filter(Boolean) : []
          return <CompanyOfferCard key={offer.id} offer={offer} reasons={reasons} />
        })}</div></> : <div className="company-empty"><h3>{params.get('q') ? 'Aucune offre pour cette recherche' : recommended ? 'Aucune recommandation disponible' : 'Aucune offre publiée pour le moment'}</h3><p>{recommended ? 'Consultez toutes les offres ou complétez vos préférences dans votre profil.' : 'Les prochaines offres vérifiées de cette entreprise apparaîtront ici.'}</p>{params.get('q') && <button type="button" className="dashboard-button" onClick={() => { const next = new URLSearchParams(params); next.delete('q'); next.delete('page'); setParams(next) }}>Effacer la recherche</button>}</div>}
        {feed.data && !feed.error && !feed.loading && <Pagination page={feed.data.page} pageSize={feed.data.page_size} count={feed.data.count} params={params} onNavigate={() => { navigated.current = true }} />}
      </section>
    </> : <p role="status">Chargement de l’entreprise…</p>}
  </main>
}
