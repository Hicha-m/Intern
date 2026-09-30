import { useId, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; invalid?: boolean; trailingAction?: ReactNode }
export function AuthField({ label, hint, error, invalid, trailingAction, id: suppliedId, ...props }: FieldProps) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap"><input {...props} id={id} aria-invalid={invalid || !!error || undefined} aria-describedby={[props['aria-describedby'], hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined} />{trailingAction}</div>
    {error && <small className="auth-field-error" id={`${id}-error`}>{error}</small>}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
  </div>
}

export function PasswordField({ label = 'Mot de passe', ...props }: Omit<FieldProps, 'label' | 'type'> & { label?: string }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return <div className="auth-password-field">
    <AuthField {...props} id={id} label={label} spellCheck={false} autoCapitalize="none" autoCorrect="off" type={visible ? 'text' : 'password'} trailingAction={<button type="button" className="auth-password-toggle" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(v => !v)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="m3 3 18 18"/>}</svg>
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
