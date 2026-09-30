import { useState } from 'react'
import { Link } from 'react-router-dom'
import { navigationItems, siteConfig } from '../../config/site'
import { useAuth } from '../../features/auth'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { status, hasAnyRole } = useAuth()
  const closeMenu = () => setIsMenuOpen(false)
  const canManageAcademics = status === 'authenticated' && hasAnyRole(['content_manager', 'admin', 'owner'])
  const canManageEnrollments = status === 'authenticated' && hasAnyRole(['admin', 'owner'])

  const accountTarget = status === 'authenticated'
    ? '/dashboard'
    : status === 'suspended'
      ? '/account-suspended'
      : '/login'

  const accountLabel = status === 'authenticated'
    ? 'Dashboard'
    : status === 'suspended'
      ? 'Account'
      : 'Student Login'

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" onClick={closeMenu} aria-label="Statistics Lover home">
          <img className="brand-logo" src={siteConfig.logoPath} alt="Statistics Lover logo" />
          <span className="brand-copy">
            <strong>{siteConfig.name}</strong>
            <small>{siteConfig.tagline}</small>
          </span>
        </Link>

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
            <a key={item.href} href={`/${item.href}`} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          {canManageAcademics && (
            <Link to="/admin/academics" onClick={closeMenu}>Admin</Link>
          )}
          {canManageEnrollments && (
            <Link to="/admin/enrollments" onClick={closeMenu}>Enrollments</Link>
          )}
          <Link className="button button-small" to={accountTarget} onClick={closeMenu}>
            {accountLabel}
          </Link>
        </nav>
      </div>
    </header>
  )
}
