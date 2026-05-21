import { Link } from "react-router-dom";

export default function CourseCard({ course, teacher, isEnrolled = false, category }) {
  return (
    <article className="card course-card">
      <div className="card-topline">
        <span className="badge">{category?.name ?? "—"}</span>
        {isEnrolled && <span className="status-pill">Enrolled</span>}
      </div>

      <h3>{course.name}</h3>
      <p>{course.shortDescription}</p>

      <div className="meta-row">
        <span>{teacher?.name ?? "Teacher TBD"}</span>
        <span>{course.lessons} lessons</span>
      </div>

      <div className="meta-row subtle">
        <span>{teacher?.subject ?? "Subject"}</span>
        <span>{course.level}</span>
      </div>

      <Link className="button button-primary" to={`/courses/${course.id}`}>
        View details
      </Link>
    </article>
  );
}
