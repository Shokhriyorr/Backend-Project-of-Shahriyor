import { env } from '../config/env.js'

export function serializeUser(user) {
  return {
    id: user.id.toString(),
    email: user.email,
    display_name: user.displayName ?? null,
    role: user.role,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
    is_verified: Boolean(user.emailVerifiedAt),
    created_at: user.createdAt.toISOString(),
  }
}

export function serializeAuthResponse({ accessToken, refreshToken, user }) {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: env.JWT_ACCESS_TTL_SECONDS,
    user: serializeUser(user),
    token: accessToken,
  }
}

export function serializeAuditLog(auditLog) {
  return {
    id: auditLog.id.toString(),
    actor_user_id: auditLog.actorUserId?.toString() ?? null,
    entity_type: auditLog.entityType,
    entity_id: auditLog.entityId.toString(),
    action: auditLog.action,
    before_json: auditLog.beforeJson ?? null,
    after_json: auditLog.afterJson ?? null,
    request_id: auditLog.requestId ?? null,
    ip_address: auditLog.ipAddress ?? null,
    created_at: auditLog.createdAt.toISOString(),
    actor: auditLog.actor ? serializeUser(auditLog.actor) : null,
  }
}

export function serializeCourseDailyStat(stat) {
  return {
    id: stat.id.toString(),
    course_id: stat.courseId.toString(),
    metric_date: stat.metricDate.toISOString().slice(0, 10),
    active_enrollment_count: stat.activeEnrollmentCount,
    new_enrollment_count: stat.newEnrollmentCount,
    created_at: stat.createdAt.toISOString(),
    course: stat.course ? {
      id: stat.course.id.toString(),
      slug: stat.course.slug,
      name: stat.course.name,
      status: stat.course.status,
    } : null,
  }
}

export function serializeTeacher(teacher) {
  return {
    id: teacher.id.toString(),
    full_name: teacher.fullName,
    name: teacher.fullName,
    subject: teacher.subject,
    rating: Number(teacher.rating),
    bio: teacher.bio ?? null,
    is_active: teacher.isActive,
    created_at: teacher.createdAt.toISOString(),
    updated_at: teacher.updatedAt.toISOString(),
  }
}

export function serializeCategory(category) {
  return {
    id: category.id.toString(),
    slug: category.slug,
    name: category.name,
    description: category.description ?? null,
    is_active: category.isActive,
    created_at: category.createdAt.toISOString(),
    updated_at: category.updatedAt.toISOString(),
  }
}

export function serializeCourse(course) {
  return {
    id: course.id.toString(),
    slug: course.slug,
    name: course.name,
    short_description: course.shortDescription,
    shortDescription: course.shortDescription,
    description: course.description,
    category_id: course.categoryId.toString(),
    categoryId: course.categoryId.toString(),
    teacher_id: course.teacherId.toString(),
    teacherId: course.teacherId.toString(),
    lessons: course.lessons,
    level: course.level,
    status: course.status,
    capacity: course.capacity,
    seats_taken: course.seatsTaken,
    seatsTaken: course.seatsTaken,
    published_at: course.publishedAt?.toISOString() ?? null,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    archived_at: course.archivedAt?.toISOString() ?? null,
    archivedAt: course.archivedAt?.toISOString() ?? null,
    created_at: course.createdAt.toISOString(),
    createdAt: course.createdAt.toISOString(),
    updated_at: course.updatedAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    teacher: course.teacher ? {
      id: course.teacher.id.toString(),
      full_name: course.teacher.fullName,
      subject: course.teacher.subject,
    } : null,
    category: course.courseCategory ? {
      id: course.courseCategory.id.toString(),
      slug: course.courseCategory.slug,
      name: course.courseCategory.name,
    } : null,
    active_enrollment_count: course._count?.enrollments ?? course.activeEnrollmentCount ?? 0,
  }
}

export function serializeEnrollment(enrollment) {
  return {
    id: enrollment.id.toString(),
    course_id: enrollment.courseId.toString(),
    status: enrollment.status,
    enrolled_at: enrollment.enrolledAt.toISOString(),
    cancelled_at: enrollment.cancelledAt?.toISOString() ?? null,
    course: enrollment.course ? {
      id: enrollment.course.id.toString(),
      slug: enrollment.course.slug,
      name: enrollment.course.name,
      level: enrollment.course.level,
      teacher: {
        id: enrollment.course.teacher.id.toString(),
        full_name: enrollment.course.teacher.fullName,
        subject: enrollment.course.teacher.subject,
      },
      category: {
        id: enrollment.course.courseCategory.id.toString(),
        slug: enrollment.course.courseCategory.slug,
        name: enrollment.course.courseCategory.name,
      },
    } : null,
  }
}
