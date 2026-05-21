import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { enrolled } from '../store/dataSlice.js'
import * as api from '../api.js'

export default function CourseDetails() {
  const { courseId } = useParams()
  const dispatch    = useDispatch()
  const user        = useSelector((state) => state.auth.user)
  const courses     = useSelector((state) => state.data.courses)
  const teachers    = useSelector((state) => state.data.teachers)
  const categories  = useSelector((state) => state.data.categories)
  const enrolledIds = useSelector((state) => state.data.enrolledIds)

  const [feedback, setFeedback] = useState('')

  const course = courses.find((c) => c.id === courseId)

  if (!course) {
    return (
      <section className="empty-state card">
        <h1>Course not found</h1>
        <p>It may have been removed.</p>
        <Link className="button button-primary" to="/">Back to Home</Link>
      </section>
    )
  }

  const teacher    = teachers.find((t) => t.id === course.teacherId)
  const isEnrolled = enrolledIds.includes(course.id)
  const category   = categories.find((c) => c.id === course.categoryId)

  const onEnroll = async () => {
    if (!user)                           return setFeedback('Login first.')
    if (user.role !== 'student')         return setFeedback('Enrollment is available only to the students.')
    if (enrolledIds.includes(course.id)) return setFeedback('You already enrolled in this course.')
    try {
      await api.enroll(course.id)
      dispatch(enrolled(course.id))
      setFeedback('Course added to MyCourses.')
    } catch (err) {
      setFeedback(err.message || 'Enrollment failed.')
    }
  }

  return (
    <div className="details-layout">
      <section className="card details-main">
        <h1>{course.name}</h1>
        <p className="lead">{course.description}</p>

        <div className="details-grid">
          <div className="details-item">
            <span>Category</span>
            <strong>{category?.name ?? '—'}</strong>
          </div>
          <div className="details-item">
            <span>Level</span>
            <strong>{course.level || '—'}</strong>
          </div>
          <div className="details-item">
            <span>Teacher</span>
            <strong>{teacher?.name ?? 'TBD'}</strong>
          </div>
        </div>
      </section>

      <aside className="details-sidebar">
        <section className="card details-side-card">
          <h2>{teacher?.name ?? 'Teacher TBD'}</h2>
          <p>{teacher?.bio ?? 'Bio coming soon.'}</p>
          <div className="meta-row subtle">
            <span>{teacher?.subject ?? 'Subject'}</span>
            <span>Rating: {teacher?.rating ?? 'New'}</span>
          </div>
        </section>

        <section className="card details-side-card">
          <h3>Enrollment</h3>

          {!user && (
            <>
              <p>Log in as a student to enroll.</p>
              <Link className="button button-primary" to="/login">Log In</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <div className="message-banner info">
              Admins can't enroll in courses.
            </div>
          )}

          {user?.role === 'student' && (
            <>
              <p>Enroll to add this course to My Courses.</p>
              <button
                className="button button-primary"
                disabled={isEnrolled}
                onClick={onEnroll}
                type="button"
              >
                {isEnrolled ? 'Already enrolled' : 'Enroll'}
              </button>
            </>
          )}

          {feedback && <div className="message-banner success">{feedback}</div>}
        </section>
      </aside>
    </div>
  )
}
