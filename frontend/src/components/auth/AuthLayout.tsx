import type { ReactNode } from 'react'
import { Link } from 'react-router'
import './auth.css'

export function AuthVisual({ imageSrc }: { imageSrc?: string }) {
  return <aside className={`auth-visual${imageSrc ? ' auth-visual--image' : ''}`} aria-label="Votre prochaine opportunité">
    {imageSrc ? <img className="auth-visual-image" src={imageSrc} alt="" /> : <div className="auth-image-slot" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>
    </div>}
    <div className="auth-visual-copy">
      <h2>La suite de votre parcours<br /><span>commence ici.</span></h2>
      <p>Découvrez des opportunités, préparez vos candidatures et avancez vers ce qui vous ressemble.</p>
    </div>
  </aside>
}

export function AuthLayout({ children, imageSrc = '/images/login-architecture-hq.jpg' }: { children: ReactNode; imageSrc?: string }) {
  return <main className="auth-layout" id="main-content">
    <AuthVisual imageSrc={imageSrc} />
    <section className="auth-panel" aria-label="Accès à votre compte">
      <Link className="auth-brand" to="/login" aria-label="Intern, connexion">intern<span>.</span></Link>
      <div className="auth-form-wrap">{children}</div>
    </section>
  </main>
}
