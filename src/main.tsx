import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { KeybindProvider } from './state/KeybindsContext.tsx'
import { HashRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeybindProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </KeybindProvider>
  </StrictMode>,
)
