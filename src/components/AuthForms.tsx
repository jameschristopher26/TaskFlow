import { useState, type FormEvent } from 'react'
import { ApiError } from '../services/apiClient'
import { useAuth } from '../hooks/useAuth'

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.details.length) {
      return error.details.map((detail) => detail.message).join(' ')
    }
    return error.message
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request was cancelled.'
  }
  return 'Something went wrong. Please try again.'
}

export function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      window.location.hash = 'dashboard'
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
      setPassword('')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Welcome back</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label htmlFor="login-email">Email</label>
      <input id="login-email" type="email" value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email" required />
      <label htmlFor="login-password">Password</label>
      <input id="login-password" type="password" value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password" required />
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export function RegisterForm() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await register({ name, email, password, confirmPassword })
      setSuccess('Registration successful. You can now sign in.')
      setName('')
      setEmail('')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Create account</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      {success && <div className="form-success" role="status">{success}</div>}
      <label htmlFor="register-name">Name</label>
      <input id="register-name" value={name}
        onChange={(event) => setName(event.target.value)}
        minLength={2} maxLength={100} autoComplete="name" required />
      <label htmlFor="register-email">Email</label>
      <input id="register-email" type="email" value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email" required />
      <label htmlFor="register-password">Password</label>
      <input id="register-password" type="password" value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={12} maxLength={128} autoComplete="new-password" required />
      <label htmlFor="register-confirm">Confirm password</label>
      <input id="register-confirm" type="password" value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        minLength={12} maxLength={128} autoComplete="new-password" required />
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
