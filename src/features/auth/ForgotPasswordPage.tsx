import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from './authService'
import { useAuth } from './useAuth'

export function ForgotPasswordPage() {
  const { isConfigured } = useAuth()
  const [email, setEmail] = useState('')
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

    setBusy(true)
    try {
      await requestPasswordReset(email)
      setSuccessMessage(
        'If an account exists for this email, a password-reset link has been sent.',
      )
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to send the reset email. Please try again.',
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
            <h2>Forgot password?</h2>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {formError && <div className="auth-message auth-message-error">{formError}</div>}
            {successMessage && (
              <div className="auth-message auth-message-success">{successMessage}</div>
            )}

            <button className="button auth-submit" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="auth-switch">
            Remembered your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
