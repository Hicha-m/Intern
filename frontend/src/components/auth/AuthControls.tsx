import { useId, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; invalid?: boolean; trailingAction?: ReactNode; floatingLabel?: boolean }
export function AuthField({ label, hint, error, invalid, trailingAction, floatingLabel = false, id: suppliedId, ...props }: FieldProps) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const [validationError, setValidationError] = useState<string | null>(null)
  const fieldError = error || validationError
  return <div className={`auth-field${floatingLabel ? ' auth-field--floating' : ''}`}>
    {!floatingLabel && <label htmlFor={id}>{label}</label>}
    <div className="auth-input-wrap">
      <input {...props} placeholder={props.placeholder ?? (floatingLabel ? ' ' : undefined)} id={id} aria-invalid={invalid || !!fieldError || undefined} aria-describedby={[props['aria-describedby'], hint ? `${id}-hint` : '', fieldError ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        onInvalid={event => {
          props.onInvalid?.(event)
          if (!floatingLabel) return
          // Keep browser constraints, but show their feedback inline instead of a tooltip.
          event.preventDefault()
          const input = event.currentTarget
          setValidationError(input.validity.valueMissing ? 'Renseignez ce champ.'
            : input.validity.typeMismatch && input.type === 'email' ? 'Saisissez une adresse e-mail valide.'
            : input.validity.tooShort ? `Utilisez au moins ${input.minLength} caractères.`
            : input.validationMessage)
          if (input.form?.querySelector('input:invalid') === input) input.focus()
        }}
        onChange={event => {
          setValidationError(null)
          props.onChange?.(event)
        }}
      />
      {floatingLabel && <label htmlFor={id}>{label}</label>}
      {floatingLabel && <span className="auth-field-rule" aria-hidden="true" />}
      {trailingAction}
    </div>
    {fieldError && <small className="auth-field-error" id={`${id}-error`} aria-live="polite">{fieldError}</small>}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
  </div>
}

export function PasswordField({ label = 'Mot de passe', ...props }: Omit<FieldProps, 'label' | 'type'> & { label?: string }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return <div className="auth-password-field">
    <AuthField {...props} id={id} label={label} spellCheck={false} autoCapitalize="none" autoCorrect="off" type={visible ? 'text' : 'password'} trailingAction={<button type="button" className="auth-password-toggle" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(v => !v)}>
      <span className="auth-password-icons" aria-hidden="true">
        <HugeiconsIcon className="auth-password-eye" icon={ViewIcon} size={20} strokeWidth={1.5} />
        <HugeiconsIcon className="auth-password-eye-off" icon={ViewOffSlashIcon} size={20} strokeWidth={1.5} />
      </span>
    </button>} />
  </div>
}

export function AuthButton({ children, pending, disabled, endIcon, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; children: ReactNode; endIcon?: ReactNode }) {
  return <button {...props} className={['auth-submit', endIcon ? 'auth-submit--with-icon' : '', className].filter(Boolean).join(' ')} disabled={disabled || pending} aria-busy={pending || undefined}>
    {endIcon ? <><span className="auth-submit-label">{children}</span><span className="auth-submit-action" aria-hidden="true"><span className="auth-submit-icon">{endIcon}</span><span className="auth-spinner" /></span></> : <>{pending && <span className="auth-spinner" aria-hidden="true" />}{children}</>}
  </button>
}

export function AuthNotice({ children, error = false, id }: { children: ReactNode; error?: boolean; id?: string }) {
  return <p className={`auth-notice${error ? ' auth-notice--error' : ''}`} tabIndex={-1} role={error ? 'alert' : 'status'} id={id}>{children}</p>
}
