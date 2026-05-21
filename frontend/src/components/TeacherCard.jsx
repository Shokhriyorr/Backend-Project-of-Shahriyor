export default function TeacherCard({ teacher }) {
  return (
    <article className="card teacher-card">
      <div className="avatar-badge">{teacher.name.slice(0, 1)}</div>
      <div className="teacher-content">
        <h3>{teacher.name}</h3>
        <p>{teacher.subject}</p>
        <span className="rating">Rating {teacher.rating}</span>
      </div>
    </article>
  );
}
