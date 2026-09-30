import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowRight02Icon, Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest, ApiError } from '../lib/api'
import { useSession } from '../auth/session-context'
import { AuthButton, AuthField, AuthNotice } from '../components/auth/AuthControls'
import { OnboardingProgress } from '../components/onboarding/OnboardingParts'
import { useOnboardingReveals, useOnboardingStepMotion } from '../components/onboarding/onboarding-motion'
import { SearchSelect } from '../components/ui/SearchSelect'
import './Onboarding.css'

type Address = { street_address: string; city: string; postal_code: string; district: string; region: string; country_code: string }
type Authorization = { country_code: string; authorized: boolean | null; needs_sponsorship: boolean | null; authorization_basis: string }
type State = { step: string; address: Address; citizenships: string[]; work_authorizations: Authorization[]; countries: string[] }
const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' })
const name = (code: string) => countryNames.of(code) ?? code
const complete = (row: Authorization) => row.authorized !== null && row.needs_sponsorship !== null && Boolean(row.authorization_basis)
const authorizationOptions = [
  { value: 'citizen', label: 'Citoyenneté' },
  { value: 'permanent_resident', label: 'Résidence permanente' },
  { value: 'work_permit', label: 'Permis / titre autorisant le travail' },
  { value: 'student', label: 'Statut étudiant' },
  { value: 'other', label: 'Autre situation' },
  { value: 'none', label: 'Aucune autorisation actuelle' },
]

export function Onboarding({ step }: { step: 'address' | 'work-eligibility' }) {
  const session = useSession()
  const navigate = useNavigate()
  const [data, setData] = useState<State | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [version, setVersion] = useState(0)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const card = useOnboardingStepMotion(step === 'address' ? 2 : 3, data !== null)
  useOnboardingReveals(form, `${data?.citizenships.join(',')}|${data?.work_authorizations.map(row => row.country_code).join(',')}`, data !== null)
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<State>('/onboarding/', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger votre progression. Réessayez.') })
    return () => controller.abort()
  }, [version])
  useEffect(() => {
    if (error) form.current?.querySelector<HTMLElement>('input[aria-invalid="true"], [role="alert"]')?.focus()
  }, [error])
  function focusPicker(id: string) {
    document.getElementById(id)?.focus({ preventScroll: true })
  }
  function updateAddress(key: keyof Address, value: string) {
    setError(null)
    setData(current => current && ({ ...current, address: { ...current.address, [key]: value } }))
  }
  function updateAuthorization(index: number, patch: Partial<Authorization>) {
    setError(null)
    setData(current => current && ({ ...current, work_authorizations: current.work_authorizations.map((row, i) => i === index ? { ...row, ...patch } : row) }))
  }
  function invalid(message: string) {
    setError(message)
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('input[aria-invalid="true"]')?.focus())
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!data || busy.current) return
    setAttempted(true)
    if (step === 'address' && (!data.address.street_address.trim() || !data.address.city.trim() || !data.address.country_code)) {
      invalid('Renseignez votre adresse, votre ville et votre pays pour continuer.'); return
    }
    if (step === 'work-eligibility' && (!data.work_authorizations.length || data.work_authorizations.some(row => !complete(row)))) {
      invalid('Ajoutez au moins un pays et complétez les réponses demandées.'); return
    }
    busy.current = true; setPending(true); setError(null)
    try {
      await apiRequest(`/onboarding/${step}/`, { method: 'PUT', body: step === 'address' ? data.address : { citizenships: data.citizenships, work_authorizations: data.work_authorizations } })
      await session.refresh()
      navigate(step === 'address' ? '/onboarding/work-eligibility' : '/stages', { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 400 ? 'Vérifiez les champs et vos réponses avant de continuer.' : 'Vos réponses n’ont pas été enregistrées. Réessayez.')
    } finally { busy.current = false; setPending(false) }
  }
  const countryOptions = useMemo(() => (data?.countries ?? []).map(code => ({ value: code, label: name(code), detail: code })).sort((a, b) => a.label.localeCompare(b.label, 'fr')), [data?.countries])
  const isAddress = step === 'address'
  return <main id="main-content" className="resume-page"><div ref={card} className="resume-card onboarding-card">
    <OnboardingProgress step={isAddress ? 2 : 3} pending={pending} />
    <section className="resume-form-panel">
      <h1 tabIndex={-1}>{isAddress ? 'Où habitez-vous\u00a0?' : 'Où pouvez-vous travailler\u00a0?'}</h1>
      {!data ? <div className="onboarding-load-state">{error ? <><AuthNotice error>{error}</AuthNotice><AuthButton onClick={() => { setError(null); setVersion(v => v + 1) }}>Réessayer</AuthButton></> : <AuthNotice>Chargement de votre progression…</AuthNotice>}</div> : <form ref={form} className="onboarding-form" onSubmit={submit} aria-busy={pending} noValidate>
        <fieldset disabled={pending} className="onboarding-fields">
          {isAddress ? <>
            <div className="onboarding-address">
              <div className="onboarding-wide"><AuthField label="Adresse" name="street_address" autoComplete="street-address" placeholder="Numéro et nom de rue" required maxLength={240} value={data.address.street_address} error={attempted && !data.address.street_address.trim() ? 'Indiquez votre adresse.' : undefined} onChange={event => updateAddress('street_address', event.target.value)} /></div>
              <AuthField label="Ville" name="city" autoComplete="address-level2" placeholder="Votre ville" required maxLength={160} value={data.address.city} error={attempted && !data.address.city.trim() ? 'Indiquez votre ville.' : undefined} onChange={event => updateAddress('city', event.target.value)} />
              <AuthField label="Code postal (facultatif)" name="postal_code" autoComplete="postal-code" placeholder="Code postal" maxLength={32} value={data.address.postal_code} onChange={event => updateAddress('postal_code', event.target.value)} />
              <div className="onboarding-wide"><SearchSelect label="Pays" placeholder="Rechercher un pays" options={countryOptions} value={data.address.country_code} required disabled={pending}
                error={attempted && !data.address.country_code ? 'Sélectionnez votre pays.' : undefined} onChange={code => updateAddress('country_code', code)} /></div>
            </div>
            <details className="onboarding-address-extra">
              <summary><span>Compléments d’adresse <small>(facultatif)</small></span><HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={1.5} aria-hidden="true" /></summary>
              <div className="onboarding-address">
                <AuthField label="Département / district" name="district" autoComplete="off" maxLength={160} value={data.address.district} onChange={event => updateAddress('district', event.target.value)} />
                <AuthField label="Région / État" name="region" autoComplete="address-level1" maxLength={160} value={data.address.region} onChange={event => updateAddress('region', event.target.value)} />
              </div>
            </details>
          </> : <>
            <div className="onboarding-nationalities">
              <SearchSelect id="onboarding-citizenships" label="Pays de nationalité" optional placeholder="Rechercher une nationalité" disabled={pending}
                options={countryOptions.filter(option => !data.citizenships.includes(option.value))}
                onChange={code => setData({ ...data, citizenships: [...data.citizenships, code] })} />
              <div className="onboarding-chips">{data.citizenships.map(code => <button key={code} data-onboarding-reveal={`citizenship-${code}`} type="button" aria-label={`Retirer la nationalité : ${name(code)}`} onClick={() => { setData({ ...data, citizenships: data.citizenships.filter(c => c !== code) }); focusPicker('onboarding-citizenships') }}><span>{name(code)}</span><HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} aria-hidden="true" /></button>)}</div>
            </div>
            <div className="onboarding-destinations">
              <SearchSelect id="onboarding-destinations" label="Pays où vous souhaitez travailler" placeholder="Rechercher un pays" disabled={pending} hint="Plusieurs pays possibles."
                error={attempted && !data.work_authorizations.length ? 'Ajoutez au moins un pays.' : undefined}
                options={countryOptions.filter(option => !data.work_authorizations.some(row => row.country_code === option.value))}
                onChange={code => { setError(null); setData({ ...data, work_authorizations: [...data.work_authorizations, { country_code: code, authorized: null, needs_sponsorship: null, authorization_basis: '' }] }) }} />
              {data.work_authorizations.map((row, index) => <section className="onboarding-country" data-onboarding-reveal={`country-${row.country_code}`} key={row.country_code} aria-labelledby={`country-${row.country_code}`}>
                <div className="onboarding-country-heading"><div className="onboarding-country-title"><span className="onboarding-country-code" aria-hidden="true">{row.country_code}</span><div><h2 id={`country-${row.country_code}`}>{name(row.country_code)}</h2><span className="onboarding-country-status" data-complete={complete(row) || undefined}>{complete(row) && <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={1.5} aria-hidden="true" />}{complete(row) ? 'Renseigné' : 'À compléter'}</span></div></div>
                  <button type="button" className="onboarding-remove" aria-label={`Retirer ${name(row.country_code)}`} onClick={() => { setData({ ...data, work_authorizations: data.work_authorizations.filter((_, i) => i !== index) }); focusPicker('onboarding-destinations') }}><HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} aria-hidden="true" /><span>Retirer</span></button>
                </div>
                <div className="onboarding-country-fields">
                  {([
                    ['authorized', 'Avez-vous le droit d’y travailler actuellement\u00a0?', ''],
                    ['needs_sponsorship', 'Aurez-vous besoin d’un parrainage employeur ?', 'Pour un visa ou une autorisation de travail, maintenant ou à l’avenir.'],
                  ] as const).map(([key, question, hint]) => <fieldset className="onboarding-choice" key={key}>
                    <legend>{question}</legend>
                    {hint && <p className="onboarding-choice-hint" id={`${row.country_code}-${key}-hint`}>{hint}</p>}
                    <div className="onboarding-choice-options">{[true, false].map(value => <label key={String(value)}>
                      <input type="radio" name={`${row.country_code}-${key}`} required checked={row[key] === value} aria-invalid={attempted && row[key] === null || undefined}
                        aria-describedby={[hint ? `${row.country_code}-${key}-hint` : '', attempted && row[key] === null ? `${row.country_code}-${key}-error` : ''].filter(Boolean).join(' ') || undefined}
                        onChange={() => updateAuthorization(index, { [key]: value })} />
                      <span className="onboarding-choice-indicator" aria-hidden="true" /><span>{value ? 'Oui' : 'Non'}</span>
                    </label>)}</div>
                    {attempted && row[key] === null && <p className="onboarding-field-error" id={`${row.country_code}-${key}-error`}>Choisissez Oui ou Non.</p>}
                  </fieldset>)}
                  <SearchSelect label="Fondement de votre autorisation" placeholder="Choisir un statut" options={authorizationOptions} value={row.authorization_basis} required disabled={pending}
                    error={attempted && !row.authorization_basis ? 'Sélectionnez un statut.' : undefined} onChange={authorization_basis => updateAuthorization(index, { authorization_basis })} />
                </div>
              </section>)}
            </div>
          </>}
        </fieldset>
        {error && <AuthNotice error>{error}</AuthNotice>}
        <div className="onboarding-footer"><div className="resume-actions"><AuthButton type="submit" pending={pending}>{pending ? 'Enregistrement…' : isAddress ? 'Continuer' : 'Terminer mon inscription'}{!pending && <HugeiconsIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} aria-hidden="true" />}</AuthButton></div></div>
      </form>}
    </section>
  </div></main>
}
