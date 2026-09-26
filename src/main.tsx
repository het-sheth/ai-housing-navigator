import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DesignSystem from './design-system/DesignSystem'
import './styles.css'

const GuidedProject = lazy(() => import('./features/projects/GuidedProject'))
const Welcome = lazy(() => import('./features/welcome/Welcome'))
const path = window.location.pathname.replace(/\/$/, '')
const screen = path === '/design-system' ? <DesignSystem />
  : path === '/projects/new' ? <GuidedProject />
    : path === '/welcome' ? <Welcome />
      : <App />

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<main className="route-loading" role="status">Opening your workspace...</main>}>
      {screen}
    </Suspense>
  </React.StrictMode>,
)
