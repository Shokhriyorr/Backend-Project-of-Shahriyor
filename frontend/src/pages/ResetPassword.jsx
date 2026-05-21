import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../api.js'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')
    setError('')

    if (!token) {
      setError('Reset token is missing from the link.')
      return
    }

    try {
      const payload = await api.confirmPasswordReset({ token, password })
      setStatus(payload.message || 'Password reset successfully. You can log in now.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-copy">
        <h1>Choose a new password</h1>
        <p>Use the secure link from your email to set a new password.</p>
      </section>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <div className="message-banner">{error}</div>}
        {status && <div className="message-banner success">{status}</div>}

        <button className="button button-primary" disabled={!token} type="submit">
          Update password
        </button>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  )
}
