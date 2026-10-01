import './Offers.css'
import { useEffect, useRef } from 'react'
import { Pagination } from '../components/ui/Pagination'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useApiQuery } from '../lib/useApiQuery'
import { offerLocationLabel, type Offer, type PageData } from '../components/dashboard/data'
import { DashboardEmpty, CompanyMark } from './Dashboard'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserCircleIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { EngineFilters, engineCriteria } from './EngineControls'

function CatalogueCard({ offer }: { offer: Offer }) {
  const catalogue = useLocation()
  const detailState = { returnTo: `${catalogue.pathname}${catalogue.search}` }
  const location = offerLocationLabel(offer.locations)
  const mode = { remote: 'À distance', hybrid: 'Hybride', onsite: 'Sur place', on_site: 'Sur place' }[offer.work_mode ?? '']
  return <article className="offer-card catalogue-card">
    <Link to={`/offers/${offer.id}`} state={detailState} className="catalogue-card-link" aria-label={`Voir l’offre : ${offer.title} chez ${offer.company.name}`}>
      <span className="offer-card-company"><CompanyMark name={offer.company.name} id={offer.company.id} logoUrl={offer.company.logo_url} /><span>{offer.company.name}</span></span>
      <h3>{offer.title}</h3>
      <span className="catalogue-card-meta">Stage{mode && ` · ${mode}`}</span>
      <span className="catalogue-card-bottom"><span className="catalogue-location">{location}</span><span className="catalogue-card-action">Voir l’offre <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} aria-hidden="true" /></span></span>
    </Link>
  </article>
}

export function Offers() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? '', page = params.get('page') ?? '1'
  const criteria = engineCriteria(params)
  const filters = new URLSearchParams({ ...Object.fromEntries(Object.entries(criteria).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)])), page, page_size: '36' })
  const { data, error, loading, reload } = useApiQuery<PageData<Offer>>(`/offers/?${filters}`)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const paginationNavigation = useRef(false)
  useEffect(() => {
    if (loading || !paginationNavigation.current) return
    paginationNavigation.current = false
    resultsHeading.current?.focus({ preventScroll: true })
    resultsHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [loading, data, error])
  return <main id="main-content" className="dashboard-content offers-page" aria-busy={loading}>
    <EngineFilters params={params} update={setParams} />
    <section className="offers-profile-banner" aria-labelledby="offers-profile-title">
      <span className="offers-profile-icon"><HugeiconsIcon icon={UserCircleIcon} size={24} strokeWidth={1.5} aria-hidden="true" /></span>
      <div><h2 id="offers-profile-title">Votre prochaine étape commence par vous.</h2><p>Gardez votre profil et votre CV à jour pour préparer vos candidatures plus facilement.</p></div><Link to="/profil" className="dashboard-button">Voir mon profil <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} aria-hidden="true" /></Link>
    </section>
    <div className="offers-heading"><h1>Stages en Europe</h1></div>
    <div className="offers-results-heading"><h3 id="offers-results" ref={resultsHeading} tabIndex={-1}>{query ? `Résultats pour « ${query} »` : 'Les offres à découvrir'}{!loading && !error && <span className="offers-count">{data?.count ?? 0}</span>}</h3></div>
    {error ? <div className="dashboard-error" role="alert">{error}<button className="dashboard-button" onClick={reload}>Réessayer</button></div> : loading ? <p role="status" className="dashboard-muted">Chargement des offres…</p> : data?.results.length ? <div className="dashboard-offers">{data.results.map(offer => <CatalogueCard key={offer.id} offer={offer} />)}</div> : <DashboardEmpty offers title="Aucune offre trouvée" detail="Essayez un autre mot-clé ou élargissez vos filtres pour découvrir plus de stages." />}
    {data && !error && <Pagination page={data.page} pageSize={data.page_size} count={data.count} params={params} onNavigate={() => { paginationNavigation.current = true }} />}
  </main>
}
export { OfferDetail } from './OfferDetail'
