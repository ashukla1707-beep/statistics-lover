import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

function formatRole(role: string) {
  return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { identity, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const displayName = identity?.profile?.fullName || identity?.email || 'Student'

  return (
    <section className="portal-page">
      <div className="container portal-shell">
        <div className="portal-welcome">
          <div>
            <span className="eyebrow">My learning space</span>
            <h1>Welcome, {displayName}.</h1>
            <p>This is the protected portal foundation. Course, lecture, test and result modules will attach here without changing the auth model.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={handleSignOut} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        <div className="portal-role-row" aria-label="Account roles">
          {(identity?.roles ?? []).map((role) => (
            <span className="role-badge" key={role}>{formatRole(role)}</span>
          ))}
        </div>

        <div className="portal-grid">
          <article className="portal-card">
            <span>01</span>
            <h2>My Courses</h2>
            <p>Enrolled batches and course progress will appear here.</p>
          </article>
          <article className="portal-card">
            <span>02</span>
            <h2>Live Classes</h2>
            <p>Upcoming classes and provider-authorized join actions will appear here.</p>
          </article>
          <article className="portal-card">
            <span>03</span>
            <h2>Tests & Results</h2>
            <p>Attempts, scores and topic-level performance will appear here.</p>
          </article>
          <article className="portal-card">
            <span>04</span>
            <h2>Study Material</h2>
            <p>Authorized notes, PYQs and downloadable resources will appear here.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
