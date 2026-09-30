import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { authError } from '../auth/errors'
import { apiRequest } from '../lib/api'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthButton, AuthField, AuthNotice, PasswordField } from '../components/auth/AuthControls'

export function ResetPassword() {
  const [params, setParams] = useSearchParams()
  const uid = params.get('uid'), token = params.get('token')
  const confirming = !!uid && !!token
  const malformed = (!!uid || !!token) && !confirming
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState<'requested' | 'changed' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = event.currentTarget
    const values = new FormData(form)
    if (confirming && values.get('new_password') !== values.get('confirm_password')) {
      setError('Les deux mots de passe ne correspondent pas.'); return
    }
    busy.current = true; setPending(true); setError(null)
    try {
      await apiRequest(confirming ? '/auth/password-reset-confirm/' : '/auth/password-reset/', {
        method: 'POST', body: confirming ? { uid, token, new_password: values.get('new_password') } : { email: values.get('email') },
      })
      setDone(confirming ? 'changed' : 'requested')
      form.reset()
      if (confirming) setParams({}, { replace: true })
    } catch (cause) { setError(authError(cause)) }
    finally { busy.current = false; setPending(false) }
  }
  return <AuthLayout>
    <header className="auth-heading"><h1>{done === 'changed' ? 'Mot de passe modifié.' : confirming ? 'Un nouveau départ.' : 'Mot de passe oublié ?'}</h1><p>{confirming ? 'Choisissez un nouveau mot de passe pour votre compte.' : 'Nous vous aidons à retrouver l’accès à votre compte.'}</p></header>
    {done ? <AuthNotice>{done === 'changed' ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.' : 'Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé.'}</AuthNotice>
      : malformed ? <AuthNotice error>Ce lien est incomplet. <Link to="/reset-password">Demander un nouveau lien</Link></AuthNotice>
      : <form className="auth-form" onSubmit={submit} aria-label="Réinitialisation du mot de passe">
        <fieldset disabled={pending}>
          {confirming ? <><PasswordField label="Nouveau mot de passe" name="new_password" autoComplete="new-password" minLength={8} maxLength={4096} required /><PasswordField label="Confirmer le mot de passe" name="confirm_password" autoComplete="new-password" minLength={8} maxLength={4096} required /></>
            : <AuthField label="Adresse e-mail" name="email" type="email" autoComplete="email" maxLength={254} required hint="Utilisez l’adresse e-mail associée à votre compte." />}
        </fieldset>
        {error && <AuthNotice error>{error}{confirming && <> <Link to="/reset-password">Demander un nouveau lien</Link></>}</AuthNotice>}
        <AuthButton type="submit" pending={pending}>{pending ? 'En cours…' : confirming ? 'Enregistrer le mot de passe' : 'Recevoir un lien'}</AuthButton>
      </form>}
    <p className="auth-back"><Link to="/login">← Retour à la connexion</Link></p>
  </AuthLayout>
}
