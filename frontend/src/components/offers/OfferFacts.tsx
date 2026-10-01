import { factValue, type EngineOffer } from '../../pages/EngineControls'

function remuneration(offer: EngineOffer) {
  const periods: Record<string, string> = { hour: 'heure', day: 'jour', week: 'semaine', month: 'mois', year: 'an', hourly: 'heure', monthly: 'mois', annual: 'an' }
  return offer.compensation_bands?.map(band => {
    if (!band.minimum && !band.maximum) return ''
    const format = (value: string) => {
      try { return new Intl.NumberFormat('fr', { style: 'currency', currency: band.currency, maximumFractionDigits: 2 }).format(Number(value)) }
      catch { return `${value} ${band.currency}` }
    }
    const amount = band.minimum && band.maximum ? band.minimum === band.maximum ? format(band.minimum) : `${format(band.minimum)} à ${format(band.maximum)}` : band.minimum ? `À partir de ${format(band.minimum)}` : `Jusqu’à ${format(band.maximum!)}`
    return `${amount} / ${periods[band.period] ?? band.period}`
  }).filter(Boolean).join(' · ') || 'Non précisée'
}

export function OfferFacts({ offer }: { offer: EngineOffer }) {
  const facts = offer.facts ?? {}
  const fields = [
    { field: 'duration', label: 'Durée' },
    { field: facts.start_period?.status === 'conflict' || !facts.start_date ? 'start_period' : 'start_date', label: 'Début du stage' },
    { field: 'remuneration', label: 'Rémunération', display: remuneration(offer) },
    ...Object.entries({ preferred_duration: 'Durée souhaitée', end_date: 'Fin du stage', application_deadline: 'Date limite', required_languages: 'Langues requises', preferred_languages: 'Langues souhaitées', language_alternatives: 'Langues au choix', language_conflicts: 'Langues à confirmer', sponsorship_available: 'Sponsoring proposé' }).filter(([field]) => facts[field] && !(field === 'preferred_duration' && !facts.duration?.required)).map(([field, label]) => ({ field, label })),
  ]
  if (offer.employment_schedule === 'full_time' || offer.employment_schedule === 'part_time') fields.push({ field: 'schedule', label: 'Rythme', display: offer.employment_schedule === 'full_time' ? 'Temps plein' : 'Temps partiel' })
  return <dl className="offer-key-facts offer-facts-overview" aria-label="Informations clés du stage">{fields.map(item => {
    const fact = facts[item.field]
    const value = 'display' in item ? item.display : fact?.status === 'conflict' && item.field !== 'language_conflicts' ? 'À confirmer' : factValue(item.field, fact?.value)
    const uncertain = value === 'Non précisé' || value === 'Non précisée' || value === 'À confirmer'
    return <div key={item.field} className={uncertain ? 'offer-fact--uncertain' : undefined}><dt>{item.label}</dt><dd><span>{value}</span>{item.field === 'duration' && fact?.required === false && fact?.status !== 'conflict' && <span className="offer-fact-note">Souhaité</span>}</dd></div>
  })}</dl>
}
