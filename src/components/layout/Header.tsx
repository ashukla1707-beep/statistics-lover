import { useEffect,useState } from 'react'
import brandLogo from '../../assets/statistics-lover-logo.jpg'
import { Link } from 'react-router-dom'
import { navigationItems, siteConfig } from '../../config/site'
import { useAuth } from '../../features/auth'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { status, hasAnyRole } = useAuth()
  const closeMenu = () => setIsMenuOpen(false)

  useEffect(()=>{
    if(!isMenuOpen)return
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        setIsMenuOpen(false)
        document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus()
      }
    }
    document.addEventListener('keydown',onKeyDown)
    return()=>document.removeEventListener('keydown',onKeyDown)
  },[isMenuOpen])

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
          <img className="brand-logo" src={brandLogo} alt="Statistics Lover logo" width="52" height="52" decoding="async" fetchPriority="high" />
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
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <nav
          id="primary-navigation"
          className={`primary-nav ${isMenuOpen ? 'is-open' : ''}`}
          aria-label="Primary navigation"
        >
          <Link to="/store" onClick={closeMenu}>Courses</Link>
          {status === 'authenticated' ? (
            <>
              <Link to="/orders" onClick={closeMenu}>My Orders</Link>
              <Link to="/notifications" onClick={closeMenu}>Notifications</Link>
              <Link to="/" onClick={closeMenu}>Home</Link>
            </>
          ) : (
            navigationItems.map((item) => (
              <a key={item.href} href={`/${item.href}`} onClick={closeMenu}>
                {item.label}
              </a>
            ))
          )}
          {canManageAcademics && <Link to="/admin/overview" onClick={closeMenu}>Admin</Link>}
          {canManageAcademics && <Link to="/admin/content" onClick={closeMenu}>Content</Link>}
          {canManageEnrollments && <Link to="/admin/enrollments" onClick={closeMenu}>Enrollments</Link>}
          <Link className="button button-small" to={accountTarget} onClick={closeMenu}>
            {accountLabel}
          </Link>
        </nav>
      </div>
    </header>
  )
}
