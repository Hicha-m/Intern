import { Link, useParams } from 'react-router'
import { useApiQuery } from '../lib/useApiQuery'
import { StatusBadge } from './Dashboard'

type Detail = { id: number; status: string; submitted_at: string | null; updated_at: string; latest_run: { status: string } | null; latest_revision: { offer_snapshot: { title?: string; company?: { name?: string } | string }; missing_fields: string[]; document_ids: number[] } | null }
export function ApplicationDetail() {
  const { id } = useParams()
  const { data, error, reload } = useApiQuery<Detail>(`/applications/${id}/`)
  const snapshot = data?.latest_revision?.offer_snapshot
  const company = typeof snapshot?.company === 'string' ? snapshot.company : snapshot?.company?.name
  return <main id="main-content" className="dashboard-content"><Link to="/candidatures" className="dashboard-text-link">← Toutes les candidatures</Link>{error ? <div className="dashboard-error" role="alert">{error}<button className="dashboard-button" onClick={reload}>Réessayer</button></div> : data ? <article className="dashboard-detail"><p className="dashboard-muted">{company || `Dossier n° ${data.id}`}</p><h2>{snapshot?.title || 'Votre candidature'}</h2><StatusBadge app={{ status: data.status, workflow_status: data.latest_run?.status ?? null }} /><dl><dt>Dernière modification</dt><dd>{new Date(data.updated_at).toLocaleString('fr')}</dd><dt>Envoi</dt><dd>{data.submitted_at ? new Date(data.submitted_at).toLocaleString('fr') : 'Pas encore envoyée'}</dd><dt>Documents joints</dt><dd>{data.latest_revision?.document_ids.length ?? 0}</dd></dl>{data.status === 'draft' && <p className="dashboard-muted">Ce dossier n’a pas encore été envoyé. La relecture et l’envoi depuis Intern ne sont pas encore disponibles.</p>}<Link to="/profil" className="dashboard-button">Gérer mon CV</Link></article> : <p role="status">Chargement de la candidature…</p>}</main>
}
