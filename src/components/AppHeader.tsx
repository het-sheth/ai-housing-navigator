import type { ReactNode } from 'react'
import './app-header.css'

const pages = [
  { href: '/', label: 'Home' },
  { href: '/projects/new', label: 'Assess a property' },
  { href: '/explore', label: 'Explore properties' },
  { href: '/compare', label: 'Compare proposals' },
]

export function AppHeader({ current, actions }: { current: string; actions?: ReactNode }) {
  return <header className="site-header">
    <a className="site-brand" href="/" aria-label="Housing Navigator home"><span className="site-brand-mark">412<span aria-hidden="true">✦</span></span><span>Housing<br/>Navigator</span></a>
    <nav className="site-nav" aria-label="Main navigation">{pages.map(page => <a key={page.href} href={page.href} aria-current={current === page.href ? 'page' : undefined}>{page.label}</a>)}</nav>
    {actions && <div className="site-header-actions">{actions}</div>}
  </header>
}
