import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Notifications } from './components/ui/Notifications'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Notifications />
  </StrictMode>,
)
