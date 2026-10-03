import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { signOutCurrentUser, updateCurrentUserPassword } from './authService'
import { useAuth } from './useAuth'

export function ResetPasswordPage() {
  const { isConfigured, status } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!isConfigured) {
      setFormError('Authentication is not configured for this environment yet.')
      return
    }

    if (status !== 'authenticated') {
      setFormError('Open the password-reset link from your email and try again.')
      return
    }

    if (password.length < 8) {
      setFormError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await updateCurrentUserPassword(password)
      await signOutCurrentUser()
      setPassword('')
      setConfirmPassword('')
      setSuccessMessage('Password updated successfully. You can now sign in with your new password.')
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to update the password. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="container auth-layout auth-layout-single">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span>Account recovery</span>
            <h2>Set a new password</h2>
          </div>

          {status === 'booting' ? (
            <div className="auth-message">Checking your reset link…</div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              <label className="form-field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              {formError && <div className="auth-message auth-message-error">{formError}</div>}
              {successMessage && (
                <div className="auth-message auth-message-success">{successMessage}</div>
              )}

              {!successMessage && (
                <button className="button auth-submit" type="submit" disabled={busy}>
                  {busy ? 'Updating…' : 'Update password'}
                </button>
              )}
            </form>
          )}

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
