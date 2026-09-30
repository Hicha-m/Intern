import { HugeiconsIcon } from '@hugeicons/react'
import { Logout01Icon } from '@hugeicons/core-free-icons'
import { useState } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { SessionProvider } from './auth/Session'
import { useSession } from './auth/session-context'
import { authError } from './auth/errors'
import { Onboarding } from './pages/Onboarding'
import { Resume } from './pages/Resume'
import { Register } from './pages/Register'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { AuthButton, AuthNotice } from './components/auth/AuthControls'
import { OnboardingMotion } from './components/onboarding/OnboardingMotion'
import './App.css'

const sections = [
  { path: '/stages', label: 'Stages', description: 'Recherche, filtres et offres enregistrées.' },
  { path: '/a-valider', label: 'À valider', description: 'Dossiers préparés à examiner avant chaque envoi.' },
  { path: '/candidatures', label: 'Candidatures', description: 'Envois, confirmations et suivi.' },
  { path: '/profil', label: 'Profil et documents', description: 'Parcours, préférences et CV.' },
] as const

function Section({ title, description }: { title: string; description: string }) {
  return (
    <main id="main-content" className="content">
      <p className="eyebrow">Espace candidat</p>
      <h1>{title}</h1>
      <p className="intro">{description}</p>
      <div className="placeholder">
        <p>Le front est prêt pour les composants de cet espace.</p>
      </div>
    </main>
  )
}

function PrivateLayout() {
  const session = useSession()
  const location = useLocation()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  if (session.loading) return <main className="session-state" role="status">Vérification de la session…</main>
  if (session.error) return <main className="session-state"><AuthNotice error>{session.error}</AuthNotice><AuthButton onClick={session.reload}>Réessayer</AuthButton></main>
  if (!session.user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  async function logout() {
    setLoggingOut(true); setLogoutError(null)
    try { await session.logout() }
    catch (error) { setLogoutError(authError(error)) }
    finally { setLoggingOut(false) }
  }
  const remaining = session.user.onboarding_step
  if (remaining && remaining !== 'complete') {
    const allowed = ['/onboarding/resume', '/onboarding/address', '/onboarding/work-eligibility']
    const current = allowed.indexOf(location.pathname)
    if (current < 0 || current > allowed.indexOf(`/onboarding/${remaining}`)) return <Navigate to={`/onboarding/${remaining}`} replace />
  }
  if (location.pathname.startsWith('/onboarding/')) return <OnboardingMotion>
    <header className="onboarding-header">
      <Link className="brand" to="/onboarding/resume" aria-label="Intern, accueil">Intern<span className="brand-dot">.</span></Link>
      <div className="onboarding-account"><span>{session.user.email || session.user.username}</span><button type="button" onClick={logout} disabled={loggingOut}>
        <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.5} aria-hidden="true" />
        {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
      </button></div>
    </header>
    {logoutError && <div className="onboarding-error"><AuthNotice error>{logoutError}</AuthNotice></div>}
    <Outlet />
  </OnboardingMotion>
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/stages" aria-label="Intern, accueil">Intern<span className="brand-dot">.</span></Link>
      <nav aria-label="Navigation principale">
        {sections.map(({ path, label }) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
      </nav>
      <div className="sidebar-account"><span>{session.user.email || session.user.username}</span><button type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'Déconnexion…' : 'Se déconnecter'}</button>{logoutError && <AuthNotice error>{logoutError}</AuthNotice>}</div>
    </aside>
    <Outlet />
  </div>
}

function App() {
  return <BrowserRouter><SessionProvider>
    <a className="skip-link" href="#main-content">Aller au contenu</a>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<PrivateLayout />}>
        <Route path="/onboarding/resume" element={<Resume onboarding />} />
        <Route path="/onboarding/address" element={<Onboarding key="address" step="address" />} />
        <Route path="/onboarding/work-eligibility" element={<Onboarding key="eligibility" step="work-eligibility" />} />
        {sections.map(({ path, label, description }) => <Route key={path} path={path} element={path === "/profil" ? <Resume /> : <Section title={label} description={description} />} />)}
        <Route path="*" element={<Section title="Page introuvable" description="Cette adresse ne correspond à aucune page." />} />
      </Route>
    </Routes>
  </SessionProvider></BrowserRouter>
}

export default App
