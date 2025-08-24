import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Routes.tsx'
import './styles/main.scss'
import { initThemePersistence } from './styles/theme'

initThemePersistence();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)