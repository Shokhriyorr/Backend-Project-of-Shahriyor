import { useSelector } from 'react-redux'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useAppInit } from './hooks/useAppInit.js'
import Account from './pages/Account'
import Admin from './pages/Admin'
import Courses from './pages/Courses'
import CourseDetails from './pages/CourseDetails'
import Home from './pages/Home'
import Login from './pages/Login'
import MyCourses from './pages/MyCourses'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function RequireRole({ role, children }) {
  const user = useSelector((state) => state.auth.user)
  const location = useLocation()

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  if (role && user.role !== role) {
    return <Navigate replace to="/" />
  }

  return children
}

export default function App() {
  useAppInit()

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-shell">
        <Routes>
          <Route element={<Home />} path="/" />
          <Route element={<Courses />} path="/courses" />
          <Route element={<CourseDetails />} path="/courses/:courseId" />
          <Route element={<Login />} path="/login" />
          <Route element={<Register />} path="/register" />
          <Route element={<VerifyEmail />} path="/verify-email" />
          <Route element={<ForgotPassword />} path="/forgot-password" />
          <Route element={<ResetPassword />} path="/reset-password" />
          <Route
            element={
              <RequireRole>
                <Account />
              </RequireRole>
            }
            path="/account"
          />
          <Route
            element={
              <RequireRole role="student">
                <MyCourses />
              </RequireRole>
            }
            path="/my-courses"
          />
          <Route
            element={
              <RequireRole role="admin">
                <Admin />
              </RequireRole>
            }
            path="/admin"
          />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </main>
    </div>
  )
}
