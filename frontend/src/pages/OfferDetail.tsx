import { Link, useLocation, useParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowUpRight01Icon, Location01Icon } from '@hugeicons/core-free-icons'
import { useApiQuery } from '../lib/useApiQuery'
import { safeExternalUrl, relativeDate, offerLocationLabel } from '../components/dashboard/data'
import { CompanyMark } from './Dashboard'
import { domains, factValue, OfferEvidence, type EngineOffer } from './EngineControls'
import './OfferDetail.css'

const providerNames: Record<string, string> = { workday: 'Workday', greenhouse: 'Greenhouse', ashby: 'Ashby', lever: 'Lever', smartrecruiters: 'SmartRecruiters', personio: 'Personio', recruitee: 'Recruitee' }

function Description({ text }: { text: string }) {
  // Render source text as React text nodes. Never interpret employer HTML.
  const clean = text.replace(/&(?:amp|nbsp|quot|apos|lt|gt);/g, entity => ({ '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[entity] ?? entity)
  const paragraphs = clean.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean)
  return <>{paragraphs.map((block, index) => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
    const heading = lines.join(' ').replace(/\s+/g, ' ')
    if (heading.length < 90 && /^(?:à propos (?:du poste|de toi|de vous|de .+)|principales responsabilités|vos missions|missions|votre profil|profil recherché|pourquoi nous (?:choisir|rejoindre)|responsibilities|requirements|qualifications|about (?:you|the role|us)|what (?:you.ll do|we offer))[ :? ]*$/i.test(heading)) return <h3 key={index}>{heading}</h3>
    const bullet = /^(?:[•*–-]|\d+[.)])\s+/
    if (lines.some(line => bullet.test(line))) {
      const firstBullet = lines.findIndex(line => bullet.test(line))
      const items: string[] = []
      for (const line of lines.slice(firstBullet)) {
        if (bullet.test(line)) items.push(line.replace(bullet, ''))
        else items[items.length - 1] += ` ${line}`
      }
      return <div key={index}>{firstBullet > 0 && <p>{lines.slice(0, firstBullet).join(' ')}</p>}<ul>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul></div>
    }
    return <p key={index}>{heading.replace(/\s+([,:;.])/g, '$1')}</p>
  })}</>
}

export function OfferDetail() {
  const { id } = useParams()
  const location = useLocation()
  const savedReturn = location.state?.returnTo
  const returnTo = typeof savedReturn === 'string' && /^\/stages(?:\?|$)/.test(savedReturn) ? savedReturn : '/stages'
  const { data: offer, error, loading, reload } = useApiQuery<EngineOffer>(`/offers/${id}/`)
  const sources = offer?.sources?.flatMap(source => {
    const url = safeExternalUrl(source.apply_url)
    return url ? [{ ...source, url }] : []
  }).filter((source, index, all) => all.findIndex(item => item.url === source.url) === index) ?? []
  const primary = sources[0]
  const mode = { remote: 'À distance', hybrid: 'Hybride', onsite: 'Sur place', on_site: 'Sur place' }[offer?.work_mode ?? '']
  const description = offer?.description?.trim()
  return <main id="main-content" className="dashboard-content offer-detail-page" aria-busy={loading}>
    <Link to={returnTo} className="offer-back-link"><HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" />Toutes les offres</Link>
    {error ? <div className="dashboard-error" role="alert">{error}<button className="dashboard-button" onClick={reload}>Réessayer</button></div> : offer ? <article>
      <div className="offer-detail-grid">
      <header className="offer-detail-hero">
        <div className="offer-detail-company"><CompanyMark name={offer.company.name} id={offer.company.id} logoUrl={offer.company.logo_url} /><span>{offer.company.name}</span></div>
        <h1>{offer.title}</h1>
        <p className="offer-detail-location"><HugeiconsIcon icon={Location01Icon} size={18} aria-hidden="true" />{offerLocationLabel(offer.locations)}</p>
        <div className="offer-detail-tags">{offer.quality?.classification === 'confirmed' && <span>Stage</span>}{offer.quality?.domain && domains[offer.quality.domain] && <span>{domains[offer.quality.domain]}</span>}{mode && <span>{mode}</span>}</div>
        {offer.last_verified_at && <p className="offer-verified">{offer.stale ? 'Dernière vérification' : 'Offre vérifiée'} {relativeDate(offer.last_verified_at)}</p>}
        <nav className="offer-section-links" aria-label="Dans cette offre"><a href="#offer-description-title">Description</a><a href="#offer-source-title">Sources et détails</a></nav>
      </header>
        <aside className="offer-application-panel" aria-labelledby="offer-application-title">
          <h2 id="offer-application-title">Votre prochaine étape</h2>
          {primary ? <><p>Candidatez directement auprès de l’entreprise.</p><a href={primary.url} target="_blank" rel="noopener noreferrer" className="dashboard-button dashboard-button--primary offer-primary-apply">Postuler sur {providerNames[primary.provider.toLowerCase()] ?? primary.provider}<HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden="true" /></a><span className="offer-external-hint">S’ouvre dans un nouvel onglet</span></> : <p>Aucun lien de candidature disponible pour le moment.</p>}
          {sources.length > 1 && <details className="offer-other-sources"><summary>Autres liens de candidature ({sources.length - 1})</summary>{sources.slice(1).map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">Postuler sur {source.provider} ↗</a>)}</details>}
          <dl className="offer-key-facts">{[['duration', 'Durée'], ['start_date', 'Début du stage'], ['required_languages', 'Langues requises']].map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{factValue(field, offer.facts?.[field]?.value)}</dd></div>)}</dl>
          {offer.stale && <p className="offer-stale-note">Cette offre est à revérifier. Vérifiez sa disponibilité sur le site de recrutement.</p>}
        </aside>
        <div className="offer-detail-body">
          <section className="offer-description-panel" aria-labelledby="offer-description-title">
            <h2 id="offer-description-title">À propos du stage</h2>
            <div className="offer-description-copy">{description ? <Description text={description} /> : <p className="dashboard-muted">La description n’est pas disponible. Consultez l’offre sur le site de recrutement pour en savoir plus.</p>}</div>
          </section>
          <section className="offer-source-panel" aria-labelledby="offer-source-title"><h2 id="offer-source-title">Sources et informations sur l’offre</h2><OfferEvidence offer={offer} /></section>
        </div>
      </div>
    </article> : <p role="status">Chargement de l’offre…</p>}
  </main>
}
