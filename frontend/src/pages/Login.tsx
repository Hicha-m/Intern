import { useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useSession } from '../auth/session-context'
import { authError } from '../auth/errors'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthButton, AuthField, AuthNotice, PasswordField } from '../components/auth/AuthControls'

export function Login() {
  const session = useSession()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  // Only restore known internal destinations after authentication.
  const returnTo = ['/onboarding/resume', '/stages', '/a-valider', '/candidatures', '/profil'].includes(location.state?.from) ? location.state.from : '/stages'
  if (session.user) return <Navigate to={returnTo} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || session.loading) return
    busy.current = true
    setPending(true)
    setError(null)
    try { await session.login(username.trim(), password) }
    catch (cause) { setError(authError(cause)) }
    finally { busy.current = false; setPending(false) }
  }
  const message = error ?? session.error
  return <AuthLayout>
    <header className="auth-heading"><h1>Heureux de vous revoir.</h1><p>Connectez-vous pour retrouver vos opportunités.</p></header>
    <form className="auth-form" onSubmit={submit} aria-label="Connexion" aria-busy={pending}>
      <fieldset disabled={pending || session.loading}>
        <AuthField label="Adresse e-mail" type="email" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required value={username} onChange={e => setUsername(e.target.value)} invalid={!!error} aria-describedby={message ? 'login-error' : undefined} />
        <PasswordField name="password" autoComplete="current-password" required maxLength={4096} value={password} onChange={e => setPassword(e.target.value)} invalid={!!error} aria-describedby={message ? 'login-error' : undefined} />
      </fieldset>
      <div className="auth-form-links"><Link to="/reset-password">Mot de passe oublié ?</Link></div>
      {message && <AuthNotice error id="login-error">{message}</AuthNotice>}
      <AuthButton type="submit" className="auth-submit--login" endIcon={<HugeiconsIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} />} pending={pending} disabled={session.loading}>{pending ? 'Connexion en cours…' : session.loading ? 'Vérification de la session…' : 'Se connecter'}</AuthButton>
    </form>
    <p className="auth-back"><Link to="/register">Pas encore de compte ? Créer un compte</Link></p>
  </AuthLayout>
}
