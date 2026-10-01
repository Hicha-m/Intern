import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { applicationStatus, relativeDate, useDashboard } from '../components/dashboard/data'
import type { ApplicationRow, Offer } from '../components/dashboard/data'

export function CompanyMark({ name, id, logoUrl }: { name: string; id: number; logoUrl?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showLogo = !!logoUrl && logoUrl.startsWith('/api/v1/companies/') && logoUrl !== failedUrl
  return <span className={`company-mark company-mark--${id % 4}${showLogo ? ' company-mark--image' : ''}`} aria-hidden="true">{showLogo ? <img src={logoUrl} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(logoUrl)} /> : name.slice(0, 1).toUpperCase()}</span>
}
export function OfferCard({ offer }: { offer: Offer }) {
  return <article className="offer-card">
    <Link to={`/offers/${offer.id}`} className="offer-card-face" aria-label={`Voir l’offre chez ${offer.company.name} : ${offer.title}`}>
      <span className="offer-card-company"><CompanyMark name={offer.company.name} id={offer.company.id} logoUrl={offer.company.logo_url} /><span>{offer.company.name}</span></span>
      <h3>{offer.title}</h3>
      <span className="offer-card-link">Voir l’offre <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" /></span>
    </Link>
  </article>
}
export function DashboardEmpty({ title, detail, offers = false }: { title: string; detail?: string; offers?: boolean }) {
  return <div className="dashboard-empty"><h3>{title}</h3>{detail && <p>{detail}</p>}{!offers && <Link to="/stages" className="dashboard-text-link">Explorer les offres <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" /></Link>}</div>
}
export function StatusBadge({ app }: { app: Pick<ApplicationRow, 'status' | 'workflow_status'> }) {
  const [label, tone] = applicationStatus(app)
  return <span className={`application-status application-status--${tone}`}><span aria-hidden="true" />{label}</span>
}
const filters = [['all', 'Toutes'], ['active', 'En cours'], ['needs_input', 'À valider'], ['failed', 'Échecs'], ['skipped', 'Retirées']] as const

export function Dashboard({ applicationsOnly = false }: { applicationsOnly?: boolean }) {
  const { data, loading, error, reload } = useDashboard()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const filter = pathname === '/a-valider' ? 'needs_input' : params.get('filter') ?? 'all'
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }
  const applications = data?.applications
  return <main id="main-content" className="dashboard-content" aria-busy={loading}>
    {error && <div className="dashboard-error" role="alert"><span>{error}</span><button type="button" className="dashboard-button" onClick={reload}>Réessayer</button></div>}
    {!applicationsOnly && <section aria-labelledby="dashboard-offers-title">
      <div className="dashboard-section-heading"><h2 id="dashboard-offers-title">Offres</h2><Link to="/stages" className="dashboard-text-link">Toutes les offres <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} aria-hidden="true" /></Link></div>
      {loading ? <div className="dashboard-offers" aria-label="Chargement des offres">{[0, 1, 2, 3].map(item => <div className="offer-card dashboard-skeleton" key={item}><div className={`offer-card-face skeleton-face--${item}`} /><div className="skeleton-line" /></div>)}</div>
        : data?.offers.length ? <div className="dashboard-offers">{data.offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}</div>
          : !error && <DashboardEmpty offers title={params.get('q') ? 'Aucune offre correspondante' : 'Aucune offre disponible'} detail={params.get('q') ? 'Essayez un autre poste ou une autre entreprise.' : undefined} />}
    </section>}
    <section className="dashboard-applications" aria-labelledby="dashboard-applications-title">
      <div className="dashboard-section-heading"><h2 id="dashboard-applications-title">{pathname === '/a-valider' ? 'Candidatures à valider' : 'Candidatures'}</h2><div className="dashboard-section-actions"><Link to="/tracker" className="dashboard-text-link">Ouvrir le suivi</Link>{!!data?.counts.needs_input && pathname !== '/a-valider' && <Link to="/a-valider" className="dashboard-text-link">Tout vérifier <span className="dashboard-action-count" aria-hidden="true">{data.counts.needs_input}</span></Link>}</div></div>
      {pathname !== '/a-valider' && <div className="dashboard-filters" role="group" aria-label="Filtrer les candidatures">{filters.map(([value, label]) => <button type="button" className="dashboard-filter" aria-pressed={filter === value} key={value} onClick={() => update('filter', value)}>{label}</button>)}</div>}
      <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tableau des candidatures">
        {(loading || !!applications?.results.length) && <table className="dashboard-table"><thead><tr><th scope="col">Poste</th><th scope="col">CV</th><th scope="col">Lettre</th><th scope="col">Statut</th><th scope="col">Envoi</th></tr></thead><tbody>
          {loading ? [0, 1, 2, 3, 4].map(row => <tr key={row} className="dashboard-skeleton" aria-hidden="true">{[0, 1, 2, 3, 4].map(column => <td key={column}><span className="skeleton-line" /></td>)}</tr>)
            : applications?.results.map(app => <tr key={app.id}>
              <td><Link to={`/applications/${app.id}`} className="application-position"><CompanyMark name={app.offer.company.name} id={app.offer.company.id} logoUrl={app.offer.company.logo_url} /><span><strong>{app.offer.company.name}</strong><span>{app.offer.title}</span></span></Link></td>
              <td><span className={app.resume_ready ? 'document-ready' : 'document-missing'}>{app.resume_ready ? 'Prêt' : 'À ajouter'}</span></td>
              <td><span className={app.cover_letter_ready ? 'document-ready' : 'document-missing'}>{app.cover_letter_ready ? 'Prête' : '—'}</span></td>
              <td><StatusBadge app={app} /></td>
              <td><time dateTime={app.submitted_at ?? undefined} title={app.submitted_at ? new Date(app.submitted_at).toLocaleString('fr') : 'Pas encore envoyée'}>{relativeDate(app.submitted_at)}</time></td>
            </tr>)}
        </tbody></table>}
        {!loading && !error && !applications?.results.length && <DashboardEmpty title={filter === 'all' && !params.get('q') ? 'Aucune candidature' : 'Aucune candidature dans cette sélection'} detail={filter === 'all' && !params.get('q') ? undefined : 'Vos autres candidatures restent accessibles dans Toutes.'} />}
      </div>
      {!!applications && applications.count > applications.page_size && <nav className="dashboard-pagination" aria-label="Pages des candidatures"><span>{(applications.page - 1) * applications.page_size + 1}–{Math.min(applications.page * applications.page_size, applications.count)} sur {applications.count}</span><button className="dashboard-button" disabled={loading || applications.page === 1} onClick={() => update('page', String(applications.page - 1))}>Précédent</button><button className="dashboard-button" disabled={loading || applications.page * applications.page_size >= applications.count} onClick={() => update('page', String(applications.page + 1))}>Suivant</button></nav>}
    </section>
  </main>
}
