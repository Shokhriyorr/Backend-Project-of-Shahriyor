import * as v from 'valibot'

const roleSchema = v.picklist(['student', 'admin'])
const levelSchema = v.picklist(['beginner', 'intermediate', 'advanced'])
const courseStatusSchema = v.picklist(['draft', 'published', 'archived'])
const enrollmentStatusSchema = v.picklist(['active', 'cancelled'])

const trimmedRequiredString = (label, maxLength) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, `${label} is required.`),
    v.maxLength(maxLength, `${label} must be at most ${maxLength} characters long.`),
  )

const optionalTrimmedString = (maxLength) =>
  v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(maxLength, `Field must be at most ${maxLength} characters long.`),
    ),
  )

const optionalRawString = (maxLength) =>
  v.optional(
    v.pipe(
      v.string(),
      v.maxLength(maxLength, `Field must be at most ${maxLength} characters long.`),
    ),
  )

const positiveInteger = (label) =>
  v.pipe(
    v.union([
      v.number(),
      v.pipe(v.string(), v.regex(/^\d+$/, `${label} must be a positive integer.`)),
    ]),
    v.transform(Number),
    v.integer(`${label} must be an integer.`),
    v.minValue(1, `${label} must be greater than 0.`),
  )

const numericId = (label) =>
  v.pipe(v.string(), v.trim(), v.regex(/^\d+$/, `${label} must be a numeric string.`))

const ratingSchema = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.regex(/^\d+(\.\d+)?$/, 'rating must be numeric.'))]),
  v.transform(Number),
  v.minValue(1, 'rating must be at least 1.'),
  v.maxValue(5, 'rating must be at most 5.'),
)

const passwordSchema = v.pipe(
  v.string(),
  v.minLength(8, 'password must be at least 8 characters long.'),
  v.regex(/[A-Z]/, 'password must contain at least one uppercase letter.'),
  v.regex(/[a-z]/, 'password must contain at least one lowercase letter.'),
  v.regex(/\d/, 'password must contain at least one digit.'),
)

export const registerBodySchema = v.pipe(
  v.looseObject({
    email: v.pipe(v.string(), v.trim(), v.email('email must be a valid email address.')),
    password: passwordSchema,
    role: roleSchema,
    display_name: optionalTrimmedString(120),
    displayName: optionalTrimmedString(120),
  }),
  v.check(
    (input) => Boolean(input.email && input.password && input.role),
    'email, password, and role are required.',
  ),
)

export const loginBodySchema = v.looseObject({
  email: v.pipe(v.string(), v.trim(), v.email('email must be a valid email address.')),
  password: v.pipe(v.string(), v.minLength(8, 'password must be at least 8 characters long.')),
})

export const refreshTokenBodySchema = v.pipe(
  v.looseObject({
    refresh_token: optionalTrimmedString(4096),
    refreshToken: optionalTrimmedString(4096),
  }),
  v.check(
    (input) => Boolean(input.refresh_token || input.refreshToken),
    'refresh_token is required.',
  ),
)

export const emailBodySchema = v.looseObject({
  email: v.pipe(v.string(), v.trim(), v.email('email must be a valid email address.')),
})

export const accountTokenBodySchema = v.pipe(
  v.looseObject({
    token: optionalTrimmedString(4096),
  }),
  v.check((input) => Boolean(input.token), 'token is required.'),
)

export const passwordResetConfirmBodySchema = v.pipe(
  v.looseObject({
    token: optionalTrimmedString(4096),
    password: passwordSchema,
  }),
  v.check((input) => Boolean(input.token && input.password), 'token and password are required.'),
)

export const userProfileUpdateBodySchema = v.pipe(
  v.looseObject({
    display_name: optionalTrimmedString(120),
    displayName: optionalTrimmedString(120),
  }),
  v.check(
    (input) => input.display_name !== undefined || input.displayName !== undefined,
    'display_name is required.',
  ),
)

export const passwordChangeBodySchema = v.pipe(
  v.looseObject({
    current_password: optionalRawString(4096),
    currentPassword: optionalRawString(4096),
    new_password: v.optional(passwordSchema),
    newPassword: v.optional(passwordSchema),
    password: v.optional(passwordSchema),
  }),
  v.check(
    (input) => Boolean(input.current_password || input.currentPassword),
    'current_password is required.',
  ),
  v.check(
    (input) => Boolean(input.new_password || input.newPassword || input.password),
    'new_password is required.',
  ),
)

export const categoryBodySchema = v.pipe(
  v.looseObject({
    slug: optionalTrimmedString(120),
    name: trimmedRequiredString('name', 100),
    description: optionalTrimmedString(2000),
    is_active: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  }),
  v.check((input) => Boolean(input.name), 'name is required.'),
)

export const teacherBodySchema = v.pipe(
  v.looseObject({
    full_name: optionalTrimmedString(150),
    name: optionalTrimmedString(150),
    subject: trimmedRequiredString('subject', 120),
    rating: ratingSchema,
    bio: optionalTrimmedString(5000),
    is_active: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  }),
  v.check((input) => Boolean(input.full_name || input.name), 'full_name is required.'),
)

export const courseBodySchema = v.pipe(
  v.looseObject({
    slug: optionalTrimmedString(160),
    name: trimmedRequiredString('name', 150),
    short_description: optionalTrimmedString(255),
    shortDescription: optionalTrimmedString(255),
    description: v.pipe(v.string(), v.trim(), v.minLength(1, 'description is required.')),
    category_id: v.optional(numericId('category_id')),
    categoryId: v.optional(numericId('categoryId')),
    teacher_id: v.optional(numericId('teacher_id')),
    teacherId: v.optional(numericId('teacherId')),
    lessons: positiveInteger('lessons'),
    level: levelSchema,
    status: v.optional(courseStatusSchema),
    capacity: v.optional(positiveInteger('capacity')),
  }),
  v.check((input) => Boolean(input.category_id || input.categoryId), 'category_id is required.'),
  v.check((input) => Boolean(input.teacher_id || input.teacherId), 'teacher_id is required.'),
)

export const enrollmentBodySchema = v.pipe(
  v.looseObject({
    course_id: v.optional(numericId('course_id')),
    courseId: v.optional(numericId('courseId')),
  }),
  v.check((input) => Boolean(input.course_id || input.courseId), 'course_id is required.'),
)

export const courseStatusQuerySchema = courseStatusSchema
export const enrollmentStatusQuerySchema = enrollmentStatusSchema
