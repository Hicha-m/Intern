import { Link } from 'react-router'
import { useApiQuery } from '../lib/useApiQuery'
import { relativeDate } from '../components/dashboard/data'
import './EngineDashboard.css'

type Provider = { provider: string; offers: number; queries: Record<string, number>; boards: Record<string, number>; errors: { code: string; count: number }[] }
type Coverage = { ats_queue?: { enrolled: number; tested: number; states: Record<string, number>; visible_offers: number; next_attempt_at: string | null }; published_offers: number; measured_at: string; countries: { locations__country_code: string; offers: number }[]; providers: Provider[]; deduplication: Record<string, number> }
const regions = new Intl.DisplayNames(['fr'], { type: 'region' })
const states: Record<string, string> = { watching: 'en veille sur le flux', running: 'en cours', error: 'en erreur', truncated: 'plafonnées', overdue: 'en retard', remaining: 'avec pages restantes', cycle_finished: 'cycle terminé', not_started: 'pas encore démarrées', disabled: 'désactivées' }
export function EngineDashboard() {
  const { data, loading, error, reload } = useApiQuery<Coverage>('/coverage/')
  return <main id="main-content" className="dashboard-content" aria-busy={loading}>
    <div className="dashboard-section-heading"><h1>Couverture du moteur</h1><button className="dashboard-button" onClick={reload} disabled={loading}>Actualiser</button></div>
    {loading && <p role="status">Lecture de la couverture…</p>}
    {error && <p role="alert">{error} <button onClick={reload}>Réessayer</button></p>}
    {data && <>
      <section aria-label="Bilan du catalogue"><h2>{data.published_offers.toLocaleString('fr')} offres publiées</h2><p>Stages confirmés en Europe, non expirés et disposant d’une source fraîche. Mesuré {relativeDate(data.measured_at)}.</p><p>{data.deduplication.merged ?? 0} doublons fusionnés · {data.deduplication.candidate ?? 0} rapprochements à vérifier.</p><p>Ce total compte les fiches distinctes du catalogue. Des doublons non détectés peuvent subsister. Il ne mesure pas tous les stages disponibles en Europe.</p></section>
      {data.ats_queue && <section aria-label="Vérification des entreprises"><h2>Découverte des sources ATS</h2><p>{data.ats_queue.tested} / {data.ats_queue.enrolled} entreprises vérifiées · {data.ats_queue.states.active ?? 0} sources actives · {data.ats_queue.visible_offers} fiches visibles.</p><p>{data.ats_queue.states.waiting ?? 0} sources sans stage confirmé à revérifier · {data.ats_queue.states.error ?? 0} en erreur · {data.ats_queue.states.running ?? 0} en cours.</p>{data.ats_queue.next_attempt_at && <p>Prochaine vérification prévue : {new Date(data.ats_queue.next_attempt_at).toLocaleString('fr-FR')}.</p>}<p>Les sources sans résultat sont revérifiées après sept jours. Des doublons entre plateformes peuvent subsister.</p></section>}
      <section aria-labelledby="coverage-sources"><h2 id="coverage-sources">Collecte par source</h2><p>Un cycle terminé concerne les recherches configurées. Les totaux par source et par pays se recouvrent : ils ne s’additionnent pas.</p>
        <div className="dashboard-table-scroll" role="region" aria-label="État des sources" tabIndex={0}><table className="coverage-table"><thead><tr><th scope="col">Source</th><th scope="col">Offres publiées</th><th scope="col">Recherches</th><th scope="col">Sources suspendues / en erreur</th></tr></thead><tbody>{data.providers.map(item => <tr key={item.provider}><th scope="row">{item.provider}</th><td>{item.offers}</td><td>{Object.entries(item.queries).map(([key, value]) => `${value} ${states[key] ?? key}`).join(' · ') || 'Collecte directe'}{(item.boards.overdue ?? 0) > 0 && <p>{item.boards.overdue} sources en retard</p>}</td><td>{item.boards.paused ?? 0} suspendues · {item.boards.error ?? 0} en erreur{item.errors.length > 0 && <details><summary>Voir les erreurs</summary><ul>{item.errors.map(e => <li key={e.code}>{e.code} ({e.count})</li>)}</ul></details>}</td></tr>)}</tbody></table></div>
      </section>
      <section aria-labelledby="coverage-countries"><h2 id="coverage-countries">Stages par pays</h2>{data.countries.length ? <div className="dashboard-table-scroll"><table className="coverage-table"><thead><tr><th scope="col">Pays</th><th scope="col">Offres</th></tr></thead><tbody>{data.countries.map(item => <tr key={item.locations__country_code}><th scope="row"><Link to={`/stages?country_codes=${item.locations__country_code}`}>{regions.of(item.locations__country_code)}</Link></th><td>{item.offers}</td></tr>)}</tbody></table></div> : <p>Aucun stage publiable pour le moment.</p>}</section>
    </>}
  </main>
}
