import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PuertaSesion } from './components/sesion/PuertaSesion'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PuertaSesion>
      <App />
    </PuertaSesion>
  </StrictMode>,
)
