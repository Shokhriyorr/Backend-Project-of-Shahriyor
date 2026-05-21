import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')
    setError('')

    try {
      const payload = await api.requestPasswordReset({ email })
      setStatus(
        payload.message ||
          'If an account exists for this email, a password reset email has been queued.',
      )
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-copy">
        <h1>Reset password</h1>
        <p>Enter your email and we will send a reset link to your inbox.</p>
      </section>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {error && <div className="message-banner">{error}</div>}
        {status && <div className="message-banner success">{status}</div>}

        <button className="button button-primary" type="submit">
          Send reset link
        </button>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  )
}
