import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import * as authApi from '@/features/auth/api/authApi.js'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')
  const verificationAttemptRef = useRef(null)

  useEffect(() => {
    const token = searchParams.get('token')?.trim()
    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing from the URL.')
      return
    }

    if (verificationAttemptRef.current === token) {
      return
    }

    verificationAttemptRef.current = token
    setStatus('verifying')
    setMessage('')

    const verify = async () => {
      try {
        const data = await authApi.verifyEmail(token)
        sessionStorage.setItem(`academy_email_verified:${token}`, 'true')
        setStatus('success')
        setMessage(data.message || 'Email verified successfully!')
      } catch (err) {
        if (sessionStorage.getItem(`academy_email_verified:${token}`) === 'true') {
          setStatus('success')
          setMessage('Email verified successfully. You can now log in.')
          return
        }

        setStatus('error')
        setMessage(err.message || 'Failed to verify email.')
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="auth-layout">
      <section className="card auth-copy">
        <h1>Email Verification</h1>
        <p>Verifying your email address...</p>
      </section>

      <div className="card form-card">
        {status === 'verifying' && <div className="message-banner">Verifying your email...</div>}

        {status === 'success' && (
          <div className="message-banner success">
            {message}
            <p>
              <Link to="/login">Click here to log in</Link>
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="message-banner">
            {message}
            <p>
              <Link to="/login">Back to login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
