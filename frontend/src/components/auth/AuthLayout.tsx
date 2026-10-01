import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import './auth.css'
import './auth-editorial.css'

type AuthMode = 'login' | 'register' | 'reset'

export function AuthVisual() {
  return <aside className="auth-visual" aria-label="Les grands débuts">
    <div className="auth-visual-copy">
      <h2>Les grands<br /><em>débuts.</em></h2>
    </div>
    <figure className="auth-artwork">
      <div className="auth-artwork-frame">
        <img className="auth-visual-image" src="/images/intern-first-step.webp" alt="" width="1086" height="1448" fetchPriority="high" />
        <span className="auth-artwork-mark" aria-hidden="true"><HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.5} /></span>
      </div>
    </figure>
  </aside>
}

export function AuthLayout({ children, mode = 'login' }: { children: ReactNode; mode?: AuthMode }) {
  useEffect(() => {
    const previous = document.title
    document.title = `${mode === 'register' ? 'Créer un compte' : mode === 'reset' ? 'Retrouver mon compte' : 'Connexion'} — Intern`
    return () => { document.title = previous }
  }, [mode])

  return <div className="auth-layout" data-auth-mode={mode}
    onKeyDownCapture={() => { document.documentElement.dataset.authInput = 'keyboard' }}
    onPointerDownCapture={() => { document.documentElement.dataset.authInput = 'pointer' }}>
    <header className="auth-masthead">
      <Link className="auth-brand" to="/login" aria-label="Intern, connexion">intern<span>.</span></Link>
      {mode === 'login' ? <Link className="auth-switch" to="/register"><strong>Créer un compte</strong><HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={1.5} aria-hidden="true" /></Link>
        : <Link className="auth-switch" to="/login"><strong>Se connecter</strong><HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={1.5} aria-hidden="true" /></Link>}
    </header>
    <div className="auth-spread">
      <AuthVisual />
      <main className="auth-panel" id="main-content" tabIndex={-1}>
        <div className="auth-form-wrap">{children}</div>
      </main>
    </div>
  </div>
}
