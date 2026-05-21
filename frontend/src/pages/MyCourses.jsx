import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { unenrolled } from '../store/dataSlice.js'
import ConfirmModal from '../components/ConfirmModal'
import * as api from '../api.js'

export default function MyCourses() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const courses = useSelector((state) => state.data.courses)
  const teachers = useSelector((state) => state.data.teachers)
  const categories = useSelector((state) => state.data.categories)
  const enrolledIds = useSelector((state) => state.data.enrolledIds)

  const [confirmCourseId, setConfirmCourseId] = useState(null)
  const [notice, setNotice] = useState('')

  const enrolled = courses.filter((c) => enrolledIds.includes(c.id))

  const handleUnenroll = async () => {
    if (!user?.id || !confirmCourseId) return
    await api.unenroll(confirmCourseId)
    dispatch(unenrolled(confirmCourseId))
    setConfirmCourseId(null)
    setNotice('You have been removed from the course.')
  }

  if (!enrolled.length) {
    return (
      <section className="empty-state card">
        <h1>No courses yet</h1>
        <p>Go to the catalog and enroll in something.</p>
        <Link className="button button-primary" to="/">
          Browse Courses
        </Link>
      </section>
    )
  }

  return (
    <section className="page-section">
      <h1>My Courses</h1>

      {notice && (
        <div
          className="message-banner success"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {notice}
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-courses">
        {enrolled.map((course) => {
          const teacher = teachers.find((t) => t.id === course.teacherId)
          const category = categories.find((c) => c.id === course.categoryId)

          return (
            <article className="card course-card" key={course.id}>
              <div className="card-topline">
                <span className="badge">{category?.name ?? '—'}</span>
                <span className="status-pill">Active</span>
              </div>

              <h3>{course.name}</h3>
              <p>{course.description}</p>

              <div className="meta-row">
                <span>{teacher?.name ?? 'Teacher TBD'}</span>
                <span>{course.credits} credits</span>
              </div>

              <div className="action-row">
                <Link className="button button-ghost" to={`/courses/${course.id}`}>
                  View
                </Link>
                <button
                  className="button button-danger"
                  onClick={() => setConfirmCourseId(course.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {confirmCourseId && (
        <ConfirmModal
          message={`You will be unenrolled from "${courses.find((c) => c.id === confirmCourseId)?.name}". This action cannot be undone.`}
          onCancel={() => setConfirmCourseId(null)}
          onConfirm={handleUnenroll}
        />
      )}
    </section>
  )
}
