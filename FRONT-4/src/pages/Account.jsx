import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as api from '../api.js'
import { setUser } from '../store/authSlice.js'

export default function Account() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [profileStatus, setProfileStatus] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordStatus, setPasswordStatus] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
  })

  useEffect(() => {
    setDisplayName(user?.display_name ?? '')
  }, [user])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileStatus('')
    setProfileError('')

    try {
      const payload = await api.updateMe({ display_name: displayName })
      dispatch(setUser(payload.data))
      setProfileStatus(payload.message)
    } catch (error) {
      setProfileError(error.message)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordStatus('')
    setPasswordError('')

    try {
      const payload = await api.changePassword(passwordForm)
      dispatch(setUser(payload.data))
      setPasswordForm({
        current_password: '',
        new_password: '',
      })
      setPasswordStatus(payload.message)
    } catch (error) {
      setPasswordError(error.message)
    }
  }

  const handlePasswordChange = (event) => {
    setPasswordForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }))
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Profile settings</h1>
        </div>
        <p>{user?.email}</p>
      </section>

      <section className="account-grid">
        <form className="card form-card" onSubmit={handleProfileSubmit}>
          <div className="form-heading">
            <h3>Profile</h3>
          </div>

          <div className="field">
            <label htmlFor="display_name">Display name</label>
            <input
              id="display_name"
              name="display_name"
              maxLength={120}
              placeholder="Your name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          {profileError && <div className="message-banner">{profileError}</div>}
          {profileStatus && <div className="message-banner success">{profileStatus}</div>}

          <button className="button button-primary" type="submit">
            Save Profile
          </button>
        </form>

        <form className="card form-card" onSubmit={handlePasswordSubmit}>
          <div className="form-heading">
            <h3>Password</h3>
          </div>

          <div className="field">
            <label htmlFor="current_password">Current password</label>
            <input
              id="current_password"
              name="current_password"
              autoComplete="current-password"
              required
              type="password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
            />
          </div>

          <div className="field">
            <label htmlFor="new_password">New password</label>
            <input
              id="new_password"
              name="new_password"
              autoComplete="new-password"
              minLength={8}
              required
              type="password"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
            />
            <small className="subtle">Use at least 8 characters with uppercase, lowercase, and a number.</small>
          </div>

          {passwordError && <div className="message-banner">{passwordError}</div>}
          {passwordStatus && <div className="message-banner success">{passwordStatus}</div>}

          <button className="button button-primary" type="submit">
            Change Password
          </button>
        </form>
      </section>
    </div>
  )
}
