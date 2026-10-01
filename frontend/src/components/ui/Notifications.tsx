import type { CSSProperties } from 'react'
import { Toaster } from 'sonner'

export function Notifications() {
  return <Toaster
    position="bottom-right"
    closeButton
    duration={5000}
    visibleToasts={3}
    offset="var(--space-6)"
    mobileOffset="var(--space-4)"
    containerAriaLabel="Notifications"
    toastOptions={{ closeButtonAriaLabel: 'Fermer la notification' }}
    style={{
      '--normal-bg': 'var(--surface)',
      '--normal-text': 'var(--text)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius-notice)',
      fontFamily: 'var(--font-sans)',
    } as CSSProperties}
  />
}
