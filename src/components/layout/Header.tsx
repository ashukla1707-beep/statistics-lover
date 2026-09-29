import { useState } from 'react'
import { navigationItems, siteConfig } from '../../config/site'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#home" onClick={closeMenu} aria-label="Statistics Lover home">
          <img className="brand-logo" src={siteConfig.logoPath} alt="Statistics Lover logo" />
          <span className="brand-copy">
            <strong>{siteConfig.name}</strong>
            <small>{siteConfig.tagline}</small>
          </span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          aria-label="Toggle navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="primary-navigation"
          className={`primary-nav ${isMenuOpen ? 'is-open' : ''}`}
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a className="button button-small" href="#login" onClick={closeMenu}>
            Student Login
          </a>
        </nav>
      </div>
    </header>
  )
}
