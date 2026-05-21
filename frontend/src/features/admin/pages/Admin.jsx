import { useCallback, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ConfirmModal from '@/shared/ui/ConfirmModal'
import {
  courseAdded,
  courseUpdated,
  courseRemoved,
  teacherAdded,
  teacherUpdated,
  teacherRemoved,
  categoryAdded,
  categoryUpdated,
  categoryRemoved,
} from '@/features/catalog/model/catalogSlice.js'
import * as adminApi from '@/features/admin/api/adminApi.js'
import * as catalogApi from '@/features/catalog/api/catalogApi.js'

function getEmptyCourseForm(teachers, categories) {
  return {
    name: '',
    shortDescription: '',
    description: '',
    categoryId: categories[0]?.id ?? '',
    teacherId: teachers[0]?.id ?? '',
    lessons: 12,
    level: 'beginner',
    status: 'draft',
    capacity: 100,
  }
}

function getEmptyTeacherForm() {
  return { name: '', subject: '', rating: 4.8, bio: '' }
}

function getEmptyCategoryForm() {
  return { name: '', description: '' }
}

export default function Admin() {
  const dispatch = useDispatch()
  const courses = useSelector((state) => state.data.courses)
  const teachers = useSelector((state) => state.data.teachers)
  const categories = useSelector((state) => state.data.categories)

  const [courseForm, setCourseForm] = useState(() => getEmptyCourseForm(teachers, categories))
  const [teacherForm, setTeacherForm] = useState(getEmptyTeacherForm)
  const [categoryForm, setCategoryForm] = useState(getEmptyCategoryForm)

  const [editingCourseId, setEditingCourseId] = useState(null)
  const [editingTeacherId, setEditingTeacherId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)

  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [emailJobs, setEmailJobs] = useState(null)
  const [maintenanceJobs, setMaintenanceJobs] = useState(null)

  useEffect(() => {
    setCourseForm((prev) => {
      if (!teachers.length) {
        return prev.teacherId === '' ? prev : { ...prev, teacherId: '' }
      }

      if (teachers.some((teacher) => teacher.id === prev.teacherId)) {
        return prev
      }

      return { ...prev, teacherId: teachers[0].id }
    })
  }, [teachers])

  useEffect(() => {
    setCourseForm((prev) => {
      if (!categories.length) {
        return prev.categoryId === '' ? prev : { ...prev, categoryId: '' }
      }

      if (categories.some((category) => category.id === prev.categoryId)) {
        return prev
      }

      return { ...prev, categoryId: categories[0].id }
    })
  }, [categories])

  const resetCourseForm = () => {
    setCourseForm(getEmptyCourseForm(teachers, categories))
    setEditingCourseId(null)
  }
  const resetTeacherForm = () => {
    setTeacherForm(getEmptyTeacherForm())
    setEditingTeacherId(null)
  }
  const resetCategoryForm = () => {
    setCategoryForm(getEmptyCategoryForm())
    setEditingCategoryId(null)
  }

  const handleCourseChange = (e) =>
    setCourseForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const handleTeacherChange = (e) =>
    setTeacherForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const handleCategoryChange = (e) =>
    setCategoryForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleCourseSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...courseForm,
      lessons: Number(courseForm.lessons) || 0,
      capacity: Number(courseForm.capacity) || 100,
    }
    try {
      if (editingCourseId) {
        const course = await catalogApi.updateCourse(editingCourseId, payload)
        dispatch(courseUpdated(course))
        setNotice('Course updated.')
      } else {
        const course = await catalogApi.createCourse(payload)
        dispatch(courseAdded(course))
        setNotice('Course added.')
      }
      resetCourseForm()
    } catch (err) {
      setNotice(err.message || 'Error saving course.')
    }
  }

  const handleTeacherSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...teacherForm, rating: Number(teacherForm.rating) }
    try {
      if (editingTeacherId) {
        const teacher = await catalogApi.updateTeacher(editingTeacherId, payload)
        dispatch(teacherUpdated(teacher))
        setNotice('Teacher updated.')
      } else {
        const teacher = await catalogApi.createTeacher(payload)
        dispatch(teacherAdded(teacher))
        setNotice('Teacher added.')
      }
      resetTeacherForm()
    } catch (err) {
      setNotice(err.message || 'Error saving teacher.')
    }
  }

  const handleCategorySubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCategoryId) {
        const category = await catalogApi.updateCategory(editingCategoryId, categoryForm)
        dispatch(categoryUpdated(category))
        setNotice('Category updated.')
      } else {
        const category = await catalogApi.createCategory(categoryForm)
        dispatch(categoryAdded(category))
        setNotice('Category added.')
      }
      resetCategoryForm()
    } catch (err) {
      setNotice(err.message || 'Error saving category.')
    }
  }

  const loadOperations = useCallback(async () => {
    try {
      const [logs, email, maintenance] = await Promise.all([
        adminApi.getAuditLogs({ limit: 10 }),
        adminApi.getEmailJobs(),
        adminApi.getMaintenanceJobs(),
      ])
      setAuditLogs(logs)
      setEmailJobs(email)
      setMaintenanceJobs(maintenance)
    } catch (err) {
      setNotice(err.message || 'Failed to load admin operations data.')
    }
  }, [])

  useEffect(() => {
    loadOperations()
  }, [loadOperations])

  const updateCourseStatus = async (course, status) => {
    try {
      const updated = await catalogApi.updateCourse(course.id, {
        ...course,
        status,
      })
      dispatch(courseUpdated(updated))
      setNotice(`Course marked as ${status}.`)
      await loadOperations()
    } catch (err) {
      setNotice(err.message || `Failed to set status ${status}.`)
    }
  }

  const startEditCourse = (course) => {
    setEditingCourseId(course.id)
    setCourseForm({
      name: course.name,
      shortDescription: course.shortDescription,
      description: course.description,
      categoryId: course.categoryId,
      teacherId: course.teacherId,
      lessons: course.lessons,
      level: course.level,
      status: course.status ?? 'draft',
      capacity: course.capacity ?? 100,
    })
  }

  const startEditTeacher = (teacher) => {
    setEditingTeacherId(teacher.id)
    setTeacherForm({
      name: teacher.name,
      subject: teacher.subject,
      rating: teacher.rating,
      bio: teacher.bio,
    })
  }

  const startEditCategory = (cat) => {
    setEditingCategoryId(cat.id)
    setCategoryForm({ name: cat.name, description: cat.description ?? '' })
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <h1>Admin Panel</h1>
        <p>Manage courses, teachers and categories.</p>
      </section>

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
            x
          </button>
        </div>
      )}

      <section className="admin-section">
        <div className="section-heading">
          <h2>Categories</h2>
          <p>{categories.length} total</p>
        </div>

        <div className="admin-grid">
          <form className="card form-card" onSubmit={handleCategorySubmit}>
            <div className="form-heading">
              <h3>{editingCategoryId ? 'Edit category' : 'Add category'}</h3>
              {editingCategoryId && (
                <button className="button button-ghost" onClick={resetCategoryForm} type="button">
                  Cancel
                </button>
              )}
            </div>

            <div className="field">
              <label htmlFor="cat-name">Name</label>
              <input
                id="cat-name"
                name="name"
                required
                type="text"
                value={categoryForm.name}
                onChange={handleCategoryChange}
              />
            </div>

            <div className="field">
              <label htmlFor="cat-description">Description</label>
              <textarea
                id="cat-description"
                name="description"
                rows="4"
                value={categoryForm.description}
                onChange={handleCategoryChange}
              />
            </div>

            <button className="button button-primary" type="submit">
              {editingCategoryId ? 'Save changes' : 'Add category'}
            </button>
          </form>

          <div className="card list-panel">
            {categories.length === 0 && (
              <p style={{ padding: '1rem', color: 'var(--color-text-subtle)' }}>
                No categories yet.
              </p>
            )}
            {categories.map((cat) => {
              const inUse = courses.some((c) => c.categoryId === cat.id)
              return (
                <article className="list-item" key={cat.id}>
                  <div>
                    <h3>{cat.name}</h3>
                    {cat.description && <p>{cat.description}</p>}
                    <div className="meta-row subtle">
                      <span>{courses.filter((c) => c.categoryId === cat.id).length} course(s)</span>
                    </div>
                  </div>
                  <div className="action-row">
                    <button
                      className="button button-ghost"
                      onClick={() => startEditCategory(cat)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-danger"
                      disabled={inUse}
                      onClick={() => setConfirm({ type: 'category', id: cat.id })}
                      type="button"
                    >
                      {inUse ? 'In use' : 'Delete'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <h2>Courses</h2>
          <p>{courses.length} total</p>
        </div>

        <div className="admin-grid">
          <form className="card form-card" onSubmit={handleCourseSubmit}>
            <div className="form-heading">
              <h3>{editingCourseId ? 'Edit course' : 'Add course'}</h3>
              {editingCourseId && (
                <button className="button button-ghost" onClick={resetCourseForm} type="button">
                  Cancel
                </button>
              )}
            </div>

            <div className="field">
              <label htmlFor="course-name">Name</label>
              <input
                id="course-name"
                name="name"
                required
                type="text"
                value={courseForm.name}
                onChange={handleCourseChange}
              />
            </div>

            <div className="field">
              <label htmlFor="course-short">Short description</label>
              <input
                id="course-short"
                name="shortDescription"
                required
                type="text"
                value={courseForm.shortDescription}
                onChange={handleCourseChange}
              />
            </div>

            <div className="field">
              <label htmlFor="course-description">Description</label>
              <textarea
                id="course-description"
                name="description"
                required
                rows="5"
                value={courseForm.description}
                onChange={handleCourseChange}
              />
            </div>

            <div className="split-fields">
              <div className="field">
                <label htmlFor="course-category">Category</label>
                <select
                  id="course-category"
                  name="categoryId"
                  value={courseForm.categoryId}
                  onChange={handleCourseChange}
                >
                  {categories.length ? (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Add a category first</option>
                  )}
                </select>
              </div>

              <div className="field">
                <label htmlFor="course-teacher">Teacher</label>
                <select
                  id="course-teacher"
                  name="teacherId"
                  required
                  value={courseForm.teacherId}
                  onChange={handleCourseChange}
                >
                  {teachers.length ? (
                    teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Add a teacher first</option>
                  )}
                </select>
              </div>
            </div>

            <div className="split-fields">
              <div className="field">
                <label htmlFor="course-lessons">Lessons</label>
                <input
                  id="course-lessons"
                  min="1"
                  name="lessons"
                  required
                  type="number"
                  value={courseForm.lessons}
                  onChange={handleCourseChange}
                />
              </div>

              <div className="field">
                <label htmlFor="course-level">Level</label>
                <select
                  id="course-level"
                  name="level"
                  required
                  value={courseForm.level}
                  onChange={handleCourseChange}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="split-fields">
              <div className="field">
                <label htmlFor="course-status">Status</label>
                <select
                  id="course-status"
                  name="status"
                  value={courseForm.status}
                  onChange={handleCourseChange}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="course-capacity">Capacity</label>
                <input
                  id="course-capacity"
                  min="1"
                  name="capacity"
                  required
                  type="number"
                  value={courseForm.capacity}
                  onChange={handleCourseChange}
                />
              </div>
            </div>

            <button
              className="button button-primary"
              disabled={!teachers.length || !categories.length}
              type="submit"
            >
              {editingCourseId ? 'Save changes' : 'Add course'}
            </button>
          </form>

          <div className="card list-panel">
            {courses.map((course) => {
              const teacher = teachers.find((t) => t.id === course.teacherId)
              const category = categories.find((c) => c.id === course.categoryId)
              return (
                <article className="list-item" key={course.id}>
                  <div>
                    <h3>{course.name}</h3>
                    <p>{course.shortDescription}</p>
                    <div className="meta-row subtle">
                      <span>{category?.name ?? course.courseCategory?.name ?? '-'}</span>
                      <span>{teacher?.name ?? 'Teacher TBD'}</span>
                      <span>{course.status ?? 'draft'}</span>
                    </div>
                  </div>
                  <div className="action-row">
                    <button
                      className="button button-ghost"
                      onClick={() => startEditCourse(course)}
                      type="button"
                    >
                      Edit
                    </button>
                    {course.status !== 'published' && (
                      <button
                        className="button button-secondary"
                        onClick={() => updateCourseStatus(course, 'published')}
                        type="button"
                      >
                        Publish
                      </button>
                    )}
                    {course.status === 'published' && (
                      <button
                        className="button button-secondary"
                        onClick={() => updateCourseStatus(course, 'archived')}
                        type="button"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      className="button button-danger"
                      onClick={() => setConfirm({ type: 'course', id: course.id })}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <h2>Teachers</h2>
          <p>{teachers.length} total</p>
        </div>

        <div className="admin-grid">
          <form className="card form-card" onSubmit={handleTeacherSubmit}>
            <div className="form-heading">
              <h3>{editingTeacherId ? 'Edit teacher' : 'Add teacher'}</h3>
              {editingTeacherId && (
                <button className="button button-ghost" onClick={resetTeacherForm} type="button">
                  Cancel
                </button>
              )}
            </div>

            <div className="field">
              <label htmlFor="teacher-name">Name</label>
              <input
                id="teacher-name"
                name="name"
                required
                type="text"
                value={teacherForm.name}
                onChange={handleTeacherChange}
              />
            </div>

            <div className="split-fields">
              <div className="field">
                <label htmlFor="teacher-subject">Subject</label>
                <input
                  id="teacher-subject"
                  name="subject"
                  required
                  type="text"
                  value={teacherForm.subject}
                  onChange={handleTeacherChange}
                />
              </div>

              <div className="field">
                <label htmlFor="teacher-rating">Rating</label>
                <input
                  id="teacher-rating"
                  max="5"
                  min="1"
                  name="rating"
                  required
                  step="0.1"
                  type="number"
                  value={teacherForm.rating}
                  onChange={handleTeacherChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="teacher-bio">Bio</label>
              <textarea
                id="teacher-bio"
                name="bio"
                required
                rows="5"
                value={teacherForm.bio}
                onChange={handleTeacherChange}
              />
            </div>

            <button className="button button-primary" type="submit">
              {editingTeacherId ? 'Save changes' : 'Add teacher'}
            </button>
          </form>

          <div className="card list-panel">
            {teachers.map((teacher) => {
              const isAssigned = courses.some((c) => c.teacherId === teacher.id)
              return (
                <article className="list-item" key={teacher.id}>
                  <div>
                    <h3>{teacher.name}</h3>
                    <p>{teacher.bio}</p>
                    <div className="meta-row subtle">
                      <span>{teacher.subject}</span>
                      <span>Rating: {teacher.rating}</span>
                    </div>
                  </div>
                  <div className="action-row">
                    <button
                      className="button button-ghost"
                      onClick={() => startEditTeacher(teacher)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button button-danger"
                      disabled={isAssigned}
                      onClick={() => setConfirm({ type: 'teacher', id: teacher.id })}
                      type="button"
                    >
                      {isAssigned ? 'In use' : 'Delete'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <h2>Operations</h2>
          <p>Audit trail and background job visibility</p>
        </div>

        <div className="admin-grid">
          <div className="card list-panel">
            <div className="form-heading">
              <h3>Recent audit logs</h3>
              <button className="button button-ghost" onClick={loadOperations} type="button">
                Refresh
              </button>
            </div>
            {auditLogs.length === 0 && <p>No audit logs yet.</p>}
            {auditLogs.map((log) => (
              <article className="list-item" key={log.id}>
                <div>
                  <h3>
                    {log.action} - {log.entity_type}
                  </h3>
                  <p>
                    {log.actor?.email ?? 'system'} - {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="card list-panel">
            <div className="form-heading">
              <h3>Background jobs</h3>
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    const payload = await adminApi.triggerCourseDailyStats()
                    setNotice(payload.message || 'Course daily stats job triggered.')
                    await loadOperations()
                  } catch (err) {
                    setNotice(err.message || 'Failed to trigger stats job.')
                  }
                }}
                type="button"
              >
                Run stats rollup
              </button>
            </div>
            {emailJobs && (
              <p>
                Email queue: waiting {emailJobs.waiting ?? 0}, active {emailJobs.active ?? 0},
                failed {emailJobs.failed ?? 0}
              </p>
            )}
            {maintenanceJobs && (
              <p>
                Maintenance queue: waiting {maintenanceJobs.waiting ?? 0}, active{' '}
                {maintenanceJobs.active ?? 0}, failed {maintenanceJobs.failed ?? 0}
              </p>
            )}
          </div>
        </div>
      </section>

      {confirm && (
        <ConfirmModal
          message={
            confirm.type === 'course'
              ? 'This course will be permanently deleted.'
              : confirm.type === 'teacher'
                ? 'This teacher will be permanently deleted.'
                : 'This category will be permanently deleted.'
          }
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              if (confirm.type === 'course') {
                await catalogApi.deleteCourse(confirm.id)
                dispatch(courseRemoved(confirm.id))
              } else if (confirm.type === 'teacher') {
                await catalogApi.deleteTeacher(confirm.id)
                dispatch(teacherRemoved(confirm.id))
              } else {
                await catalogApi.deleteCategory(confirm.id)
                dispatch(categoryRemoved(confirm.id))
              }
              setNotice('Deleted successfully.')
            } catch (err) {
              setNotice(err.message || 'Delete failed.')
            }
            setConfirm(null)
          }}
        />
      )}
    </div>
  )
}
