import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { Link } from 'react-router'
import './OnboardingParts.css'

const steps = ['Votre CV', 'Adresse', 'Autorisations']

export function OnboardingProgress({ step, pending = false }: { step: number; pending?: boolean }) {
  return <div className="onboarding-progress">
    <div className="onboarding-progress-meta"><span>Étape {step} sur {steps.length}</span>
      {step > 1 && <Link to={step === 2 ? '/onboarding/resume' : '/onboarding/address'} aria-disabled={pending || undefined} tabIndex={pending ? -1 : undefined} onClick={event => { if (pending) event.preventDefault() }}><HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={1.5} aria-hidden="true" />Retour</Link>}
    </div>
    <ol className="onboarding-steps" aria-label="Étapes de l’inscription">
      {steps.map((label, index) => <li key={label} aria-current={index + 1 === step ? 'step' : undefined} data-complete={index + 1 < step || undefined}>
        <span className="onboarding-step-line" aria-hidden="true" />
        <span className="onboarding-step-marker" aria-hidden="true">{index + 1 < step ? <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={2} /> : index + 1}</span>
        <span className="onboarding-step-copy"><strong>{label}</strong></span>
      </li>)}
    </ol>
    <progress className="onboarding-progress-value" aria-label="Progression de l’onboarding" max={steps.length} value={step} />
  </div>
}
