import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function SuspendedPage() {
  const navigate = useNavigate()
  const { status, identity, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  if (status === 'booting') {
    return <div className="auth-state">Checking your account…</div>
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="container auth-state-card">
        <span className="eyebrow">Account access</span>
        <h1>Account suspended</h1>
        <p>
          Access for {identity?.email ?? 'this account'} is currently suspended. Contact Statistics Lover support if you believe this is an error.
        </p>
        <button className="button" type="button" onClick={handleSignOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </section>
  )
}
