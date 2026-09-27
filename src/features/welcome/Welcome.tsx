import { Suspense, lazy, useEffect, useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import './welcome.css'

const NeighborhoodScene = lazy(() => import('./NeighborhoodScene'))

function NeighborhoodFallback() {
  return <svg className="welcome-fallback" data-testid="scene-fallback" viewBox="0 0 640 520" role="img" aria-label="Illustration of houses on a neighborhood block">
    <defs>
      <linearGradient id="fallback-ground" x2="0" y2="1"><stop stopColor="#d8d2bf"/><stop offset="1" stopColor="#aaa895"/></linearGradient>
    </defs>
    <path d="M74 349 345 203 578 330 310 479Z" fill="#b7aa8e"/>
    <path d="M74 329 345 183 578 310 310 459Z" fill="url(#fallback-ground)"/>
    <path d="M76 326 343 183 402 215 138 361Z" fill="#827d70"/>
    <path d="M220 252 335 190 430 242 316 305Z" fill="#e8dfcb"/>
    <path d="M220 252v92l96 54v-93Z" fill="#cbbda3"/>
    <path d="M316 305v93l114-62v-94Z" fill="#b4a78d"/>
    <path d="m215 250 116-93 108 86-123 67Z" fill="#514f45"/>
    <path d="M356 283v71l27-15v-71Z" fill="#f2b73c"/>
    <path d="M247 283v39l22 12v-39Zm38 21v39l22 12v-39Z" fill="#617477"/>
    <path d="m462 283 42-23 32 18-42 22Z" fill="#74806c"/>
    <path d="M487 268v58" stroke="#6b5840" strokeWidth="10"/>
    <circle cx="489" cy="257" r="23" fill="#68785b"/>
    <path d="M107 329 309 438" stroke="#e6bb58" strokeWidth="6" strokeDasharray="12 11" opacity=".9"/>
  </svg>
}

export default function Welcome() {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [paused, setPaused] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneAttempt, setSceneAttempt] = useState(0)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const animationPaused = reducedMotion || paused
  const handleSceneFailure = () => {
    setSceneReady(false)
    if (sceneAttempt === 0) setSceneAttempt(1)
    else setWebglFailed(true)
  }

  return <main className="welcome-screen" data-testid="welcome-screen">
    <a className="welcome-skip" href="/projects/new">Skip introduction</a>
    <AppHeader current="/" />

    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="welcome-copy">
        <p className="welcome-eyebrow"><span className="welcome-eyebrow-line"/>PITTSBURGH <span className="welcome-eyebrow-separator">/</span> ALLEGHENY COUNTY</p>
        <h1 id="welcome-title">A place to start.<br/><em>A path to build.</em></h1>
        <p className="welcome-intro">Turn your housing idea into sourced findings, clear unknowns, and a useful next step.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/projects/new">Assess a property <span aria-hidden="true">↗</span></a><a className="welcome-secondary" href="/explore">Explore properties <span aria-hidden="true">↗</span></a></div>
        <div className="welcome-smallprint"><span className="welcome-smallprint-icon" aria-hidden="true">i</span><p>Public records, clear unknowns, and useful next steps. Checks have limited coverage and do not determine permission. Drafts stay on this device. Account saving is optional when available.</p></div>
      </div>
      <div className="welcome-visual">
        <div className="welcome-scene-frame">
          <div className="welcome-scene-index"><span>FIG. 01</span><span>THE POSSIBLE BLOCK</span></div>
          <div className="welcome-scene-content" data-testid="neighborhood-scene" data-render-state={webglFailed ? 'fallback' : sceneReady ? 'ready' : 'loading'} aria-label="Illustrative miniature neighborhood">
            {webglFailed ? <NeighborhoodFallback/> : <Suspense fallback={<NeighborhoodFallback/>}><NeighborhoodScene key={sceneAttempt} paused={animationPaused} onReady={() => setSceneReady(true)} onFailure={handleSceneFailure}/></Suspense>}
          </div>
          <div className="welcome-visual-bottom"><span className="welcome-visual-caption"><span className="welcome-caption-dot"/>Illustrative neighborhood, not a model of your property.</span>{webglFailed ? <span className="welcome-static-label">Static illustration</span> : <button type="button" className="welcome-pause" aria-pressed={animationPaused} onClick={() => setPaused(value => !value)} disabled={reducedMotion}>{reducedMotion ? 'Motion reduced' : animationPaused ? 'Resume animation' : 'Pause animation'} <span aria-hidden="true">{animationPaused ? '▶' : 'Ⅱ'}</span></button>}</div>
        </div>
      </div>
    </section>

    <section className="welcome-paths" aria-labelledby="welcome-paths-title">
      <div className="welcome-paths-heading"><p className="welcome-eyebrow">ONE WORKSPACE / THREE WAYS IN</p><h2 id="welcome-paths-title">Choose your starting point.</h2><p>A site in mind, a place to find, or two ideas to weigh.</p></div>
      <div className="welcome-path-grid">
        <a className="welcome-path welcome-path-primary" href="/projects/new"><span className="welcome-path-number">01 / I HAVE A SITE</span><h3>Turn a proposal<br/>into a next step.</h3><p>Confirm your property, describe the work, and review sourced findings and the evidence still needed.</p><span className="welcome-path-action">Assess a property <span aria-hidden="true">↗</span></span></a>
        <a className="welcome-path" href="/explore"><span className="welcome-path-number">02 / I NEED A PLACE</span><h3>Find a parcel<br/>worth a closer look.</h3><p>Search bounded County assessment records and inspect candidate parcels on the map. Suitability remains unassessed.</p><span className="welcome-path-action">Explore properties <span aria-hidden="true">↗</span></span></a>
        <a className="welcome-path" href="/compare"><span className="welcome-path-number">03 / I HAVE TWO IDEAS</span><h3>One property.<br/>Two possibilities.</h3><p>Compare two proposals on the same confirmed parcel. See which findings, unknowns, and next actions differ.</p><span className="welcome-path-action">Compare proposals <span aria-hidden="true">↗</span></span></a>
      </div>
    </section>
    <section className="welcome-process" aria-label="How it works"><p className="welcome-process-label">FROM QUESTION TO NEXT STEP</p><ol><li><span>01</span><strong>Property</strong><small>Start with an address or parcel.</small></li><li><span>02</span><strong>Proposal</strong><small>Describe what you hope to do.</small></li><li><span>03</span><strong>Next steps</strong><small>See evidence, gaps, and who to ask.</small></li></ol><p className="welcome-process-note">Built for honest early diligence.</p></section>
    <footer className="welcome-footer"><span>412 / Independent housing project workspace</span></footer>
  </main>
}
