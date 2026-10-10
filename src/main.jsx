import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.css'
import AppShell from './AppShell.jsx'
import { LanguageProvider } from './i18n.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider><AppShell /></LanguageProvider>
  </StrictMode>,
)
