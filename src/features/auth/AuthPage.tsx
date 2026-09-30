import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  mode: AuthMode
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const { isConfigured, status, signIn, signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  if (status === 'suspended') {
    return <Navigate to="/account-suspended" replace />
  }

  const isRegister = mode === 'register'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!isConfigured) {
      setFormError('Authentication is not configured for this environment yet.')
      return
    }

    if (password.length < 8) {
      setFormError('Password must contain at least 8 characters.')
      return
    }

    if (isRegister && password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setBusy(true)

    try {
      if (isRegister) {
        const result = await signUp({
          email,
          password,
          fullName,
          phone: phone || undefined,
        })

        if (result.requiresEmailConfirmation) {
          setSuccessMessage(
            'Account created. Check your email to confirm your address, then sign in.',
          )
          setPassword('')
          setConfirmPassword('')
          return
        }
      } else {
        await signIn(email, password)
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Authentication failed. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="container auth-layout">
        <div className="auth-intro">
          <span className="eyebrow">Statistics Lover Portal</span>
          <h1>{isRegister ? 'Create your student account.' : 'Welcome back.'}</h1>
          <p>
            {isRegister
              ? 'Your account starts with student access. Course and batch access will be granted by enrollment.'
              : 'Sign in to continue to your courses, classes, tests, materials and results.'}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span>{isRegister ? 'Student registration' : 'Student login'}</span>
            <h2>{isRegister ? 'Create account' : 'Sign in'}</h2>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label className="form-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    maxLength={120}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Phone <small>(optional)</small></span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={24}
                  />
                </label>
              </>
            )}

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

            <div className="form-field">
              <div className="auth-field-heading">
                <label htmlFor="auth-password">Password</label>
                {!isRegister && <Link to="/forgot-password">Forgot password?</Link>}
              </div>
              <input
                id="auth-password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            {isRegister && (
              <label className="form-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            )}

            {formError && <div className="auth-message auth-message-error">{formError}</div>}
            {successMessage && (
              <div className="auth-message auth-message-success">{successMessage}</div>
            )}

            <button className="button auth-submit" type="submit" disabled={busy || status === 'booting'}>
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to Statistics Lover?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
