import { useState } from 'react'
import { useSelector } from 'react-redux'
import CourseCard from '../components/CourseCard'
import TeacherCard from '../components/TeacherCard'

export default function Home() {
  const courses     = useSelector((state) => state.data.courses)
  const teachers    = useSelector((state) => state.data.teachers)
  const categories  = useSelector((state) => state.data.categories)
  const enrolledIds = useSelector((state) => state.data.enrolledIds)

  const [searchTerm,       setSearchTerm]       = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categoryNames = ['All', ...new Set(
    courses.map((course) => {
      const cat = categories.find((c) => c.id === course.categoryId)
      return cat?.name
    }),
  )]

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredCourses = courses.filter((course) => {
    const teacher  = teachers.find((item) => item.id === course.teacherId)
    const category = categories.find((c) => c.id === course.categoryId)

    const matchesSearch =
      !normalizedSearch ||
      course.name.toLowerCase().includes(normalizedSearch) ||
      course.shortDescription.toLowerCase().includes(normalizedSearch) ||
      teacher?.name.toLowerCase().includes(normalizedSearch) ||
      category?.name.toLowerCase().includes(normalizedSearch)

    const matchesCategory =
      selectedCategory === 'All' ||
      category?.name === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-copy">
          <h1>A platform for students, teachers, and convenient course management</h1>
        </div>
        <div className="hero-panel">
          <div className="stat-card">
            <strong>{courses.length}</strong>
            <span>Courses in catalog</span>
          </div>
          <div className="stat-card">
            <strong>{teachers.length}</strong>
            <span>Teachers</span>
          </div>
          <div className="stat-card">
            <strong>{enrolledIds.length}</strong>
            <span>My courses</span>
          </div>
        </div>
      </section>

      <section className="toolbar card">
        <div className="field">
          <label htmlFor="search">Search by course</label>
          <input
            id="search"
            name="search"
            placeholder="e.g. React, API, design..."
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="category">Filter</label>
          <select
            id="category"
            name="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categoryNames.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Courses</span>
            <h2>Study programs</h2>
          </div>
          <p>{filteredCourses.length} courses match your current search</p>
        </div>
        {filteredCourses.length ? (
          <div className="grid grid-courses">
            {filteredCourses.map((course) => {
              const teacher  = teachers.find((t) => t.id === course.teacherId)
              const category = categories.find((c) => c.id === course.categoryId)
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  teacher={teacher}
                  isEnrolled={enrolledIds.includes(course.id)}
                  category={category}
                />
              )
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <h3>Nothing found</h3>
            <p>Try changing your query or selecting a different filter.</p>
          </div>
        )}
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Our Team</span>
            <h2>Teachers</h2>
          </div>
          <p>A team of experts leading key areas</p>
        </div>
        <div className="grid grid-teachers">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      </section>
    </div>
  )
}
