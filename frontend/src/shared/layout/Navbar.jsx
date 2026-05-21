import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import * as authApi from '@/features/auth/api/authApi.js'
import { clearUser } from '@/features/auth/model/authSlice.js'

function getRoleLabel(role) {
  if (role === 'admin') return 'Admin'
  if (role === 'student') return 'Student'
  return 'Guest'
}

export default function Navbar() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)

  const isAdmin = user?.role === 'admin'
  const isStudent = user?.role === 'student'

  return (
    <header className="navbar">
      <NavLink className="brand" to="/">
        <span className="brand-mark">A</span>
        <div>
          <strong>Academy Portal</strong>
          <span className="brand-sub">Learn, manage, launch</span>
        </div>
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/courses">Courses</NavLink>
        {isStudent && <NavLink to="/my-courses">My Courses</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        {user && <NavLink to="/account">Account</NavLink>}
      </nav>

      <div className="nav-user">
        {user ? (
          <>
            <NavLink className="user-chip" to="/account">
              <strong>{user.display_name || user.email}</strong>
              <span>{getRoleLabel(user.role)}</span>
            </NavLink>
            <button
              className="button button-ghost"
              onClick={async () => {
                await authApi.logout()
                dispatch(clearUser())
              }}
              type="button"
            >
              Logout
            </button>
          </>
        ) : (
          <NavLink className="button button-primary" to="/login">
            Login
          </NavLink>
        )}
      </div>
    </header>
  )
}
