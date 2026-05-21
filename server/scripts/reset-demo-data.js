import 'dotenv/config'
import prisma from '../src/prisma.js'

const categories = [
  {
    slug: 'web-development',
    name: 'Web Development',
    description: 'Frontend and backend courses for modern web applications.',
  },
  {
    slug: 'data-science',
    name: 'Data Science',
    description: 'Python, analytics, and machine learning courses.',
  },
  {
    slug: 'mobile-development',
    name: 'Mobile Development',
    description: 'Native and cross-platform mobile development.',
  },
  {
    slug: 'cloud-computing',
    name: 'Cloud Computing',
    description: 'Cloud architecture, deployment, and operations.',
  },
]

const teachers = [
  {
    fullName: 'John Smith',
    subject: 'Web Development',
    rating: 4.8,
    bio: 'Senior full-stack engineer focused on React and Node.js.',
  },
  {
    fullName: 'Jane Doe',
    subject: 'Data Science',
    rating: 4.9,
    bio: 'Data scientist teaching practical analytics and ML workflows.',
  },
]

const courses = [
  {
    slug: 'react-fundamentals',
    name: 'React Fundamentals',
    shortDescription: 'Learn React basics including components, hooks, and state management',
    description:
      'Complete guide to React fundamentals including components, hooks, state management, and modern React patterns.',
    categorySlug: 'web-development',
    teacherName: 'John Smith',
    lessons: 12,
    level: 'beginner',
    capacity: 30,
  },
  {
    slug: 'advanced-nodejs',
    name: 'Advanced Node.js',
    shortDescription: 'Master Node.js for building scalable server applications',
    description:
      'Advanced Node.js concepts including streams, clustering, performance optimization, and enterprise patterns.',
    categorySlug: 'web-development',
    teacherName: 'Jane Doe',
    lessons: 15,
    level: 'advanced',
    capacity: 20,
  },
  {
    slug: 'python-data-science',
    name: 'Python for Data Science',
    shortDescription: 'Learn Python, pandas, NumPy, and scikit-learn for data analysis',
    description:
      'Comprehensive Python data science course covering pandas, NumPy, matplotlib, and machine learning with scikit-learn.',
    categorySlug: 'data-science',
    teacherName: 'Jane Doe',
    lessons: 20,
    level: 'intermediate',
    capacity: 25,
  },
  {
    slug: 'aws-cloud-architecture',
    name: 'AWS Cloud Architecture',
    shortDescription: 'Design and deploy scalable cloud solutions on AWS',
    description:
      'Learn AWS cloud architecture, EC2, S3, Lambda, RDS, and best practices for scalable cloud solutions.',
    categorySlug: 'cloud-computing',
    teacherName: 'John Smith',
    lessons: 14,
    level: 'advanced',
    capacity: 15,
  },
]

const categoryBySlug = new Map()
const teacherByName = new Map()

for (const category of categories) {
  const saved = await prisma.courseCategory.upsert({
    where: { slug: category.slug },
    update: {
      name: category.name,
      description: category.description,
      isActive: true,
    },
    create: {
      ...category,
      isActive: true,
    },
  })
  categoryBySlug.set(saved.slug, saved)
}

for (const teacher of teachers) {
  const existing = await prisma.teacher.findFirst({
    where: {
      fullName: teacher.fullName,
      subject: teacher.subject,
    },
  })

  const saved = existing
    ? await prisma.teacher.update({
        where: { id: existing.id },
        data: {
          rating: teacher.rating,
          bio: teacher.bio,
          isActive: true,
        },
      })
    : await prisma.teacher.create({
        data: {
          ...teacher,
          isActive: true,
        },
      })

  teacherByName.set(saved.fullName, saved)
}

for (const course of courses) {
  const category = categoryBySlug.get(course.categorySlug)
  const teacher = teacherByName.get(course.teacherName)

  await prisma.course.upsert({
    where: { slug: course.slug },
    update: {
      name: course.name,
      shortDescription: course.shortDescription,
      description: course.description,
      categoryId: category.id,
      teacherId: teacher.id,
      lessons: course.lessons,
      level: course.level,
      status: 'published',
      capacity: course.capacity,
      publishedAt: new Date(),
      archivedAt: null,
    },
    create: {
      slug: course.slug,
      name: course.name,
      shortDescription: course.shortDescription,
      description: course.description,
      categoryId: category.id,
      teacherId: teacher.id,
      lessons: course.lessons,
      level: course.level,
      status: 'published',
      capacity: course.capacity,
      publishedAt: new Date(),
    },
  })
}

console.log(
  `Seeded ${categories.length} categories, ${teachers.length} teachers, and ${courses.length} courses.`,
)

await prisma.$disconnect()
