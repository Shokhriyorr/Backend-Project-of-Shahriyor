import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as authApi from '@/features/auth/api/authApi.js'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendStatus, setResendStatus] = useState('')

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const data = await authApi.register({ ...formData, role: 'student' })
      if (data.verification_required) {
        setSuccess(
          data.message ||
            'Account created. Check your email to verify the account before logging in.',
        )
      } else {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResendVerification = async () => {
    setResendStatus('')
    try {
      await authApi.resendVerification({ email: formData.email })
      setResendStatus('Verification email sent! Check your inbox.')
    } catch {
      setResendStatus('Failed to resend verification email.')
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-copy">
        <h1>Create an account</h1>
        <p>Sign up to start enrolling in courses.</p>
      </section>

      {success ? (
        <div className="card form-card">
          <div className="message-banner success">{success}</div>
          {resendStatus && <div className="message-banner info">{resendStatus}</div>}
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
            <button
              className="button button-secondary"
              onClick={handleResendVerification}
              disabled={!formData.email}
              type="button"
            >
              Resend Verification Email
            </button>
            <p>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      ) : (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              placeholder="student@academy.dev"
              required
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              placeholder="StrongPass123"
              required
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
            <small className="subtle">
              Use at least 8 characters with uppercase, lowercase, and a number.
            </small>
          </div>

          {error && <div className="message-banner">{error}</div>}

          <button className="button button-primary" type="submit">
            Register
          </button>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      )}
    </div>
  )
}
