import { Suspense, lazy, useEffect, useState } from 'react'
import './welcome.css'

const NeighborhoodScene = lazy(() => import('./NeighborhoodScene'))

function NeighborhoodFallback() {
  return <svg className="welcome-fallback" viewBox="0 0 640 520" role="img" aria-label="Illustration of houses on a neighborhood block">
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
  const [reducedMotion, setReducedMotion] = useState(false)
  const [paused, setPaused] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const animationPaused = reducedMotion || paused

  return <main className="welcome-screen" data-testid="welcome-screen">
    <a className="welcome-skip" href="/projects/new">Skip introduction</a>
    <header className="welcome-header">
      <a className="welcome-brand" href="/welcome" aria-label="Housing Navigator home"><span className="welcome-brand-mark">412<span className="welcome-brand-spark" aria-hidden="true">✦</span></span><span>Housing<br/>Navigator</span></a>
      <nav aria-label="Welcome navigation"><a href="/">Lanark prototype <span aria-hidden="true">↗</span></a><a className="welcome-nav-start" href="/projects/new">Start a project <span aria-hidden="true">↗</span></a></nav>
    </header>

    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="welcome-copy">
        <p className="welcome-eyebrow"><span className="welcome-eyebrow-line"/>PITTSBURGH <span className="welcome-eyebrow-separator">/</span> ALLEGHENY COUNTY</p>
        <h1 id="welcome-title">A place to start.<br/><em>A path to build.</em></h1>
        <p className="welcome-intro">A housing idea begins with a property and a lot of unanswered questions. Bring your proposal. We will help you see the evidence, the gaps, and the next conversation to have.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/projects/new">Start a project <span aria-hidden="true">↗</span></a><a className="welcome-secondary" href="/">Explore the Lanark prototype <span aria-hidden="true">↗</span></a></div>
        <div className="welcome-smallprint"><span className="welcome-smallprint-icon" aria-hidden="true">i</span><p>Local preview. AI guidance and account saving are not connected yet. Findings show what needs review, not a permission decision.</p></div>
      </div>
      <div className="welcome-visual">
        <div className="welcome-scene-frame">
          <div className="welcome-scene-index"><span>FIG. 01</span><span>THE POSSIBLE BLOCK</span></div>
          <div className="welcome-scene-content" aria-label="Illustrative animated miniature neighborhood">
            {webglFailed ? <NeighborhoodFallback/> : <Suspense fallback={<NeighborhoodFallback/>}><NeighborhoodScene paused={animationPaused} onFailure={() => setWebglFailed(true)}/></Suspense>}
          </div>
          <div className="welcome-visual-bottom"><span className="welcome-visual-caption"><span className="welcome-caption-dot"/>Illustrative neighborhood, not a model of your property.</span><button type="button" className="welcome-pause" aria-pressed={animationPaused} onClick={() => setPaused(value => !value)} disabled={reducedMotion}>{animationPaused ? 'Animation paused' : 'Pause animation'} <span aria-hidden="true">{animationPaused ? '▶' : 'Ⅱ'}</span></button></div>
        </div>
      </div>
    </section>

    <section className="welcome-process" aria-label="How it works"><p className="welcome-process-label">FROM QUESTION TO NEXT STEP</p><ol><li><span>01</span><strong>Property</strong><small>Start with an address or parcel.</small></li><li><span>02</span><strong>Proposal</strong><small>Describe what you hope to do.</small></li><li><span>03</span><strong>Next steps</strong><small>See evidence, gaps, and who to ask.</small></li></ol><p className="welcome-process-note">Built for honest early diligence.</p></section>
  </main>
}
