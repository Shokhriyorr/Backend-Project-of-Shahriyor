// BYOI-5: Analytics rollups in course_daily_stats to avoid heavy OLTP aggregates.
import prisma from '../prisma.js'
import { env } from '../config/env.js'

let intervalHandle = null

function getUtcDayRange(referenceDate = new Date()) {
  const start = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  )
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export async function syncCourseDailyStats() {
  const { start, end } = getUtcDayRange()
  const [courses, activeCounts, newCounts] = await Promise.all([
    prisma.course.findMany({
      select: { id: true },
    }),
    prisma.enrollment.groupBy({
      by: ['courseId'],
      _count: {
        _all: true,
      },
      where: {
        status: 'active',
      },
    }),
    prisma.enrollment.groupBy({
      by: ['courseId'],
      _count: {
        _all: true,
      },
      where: {
        status: 'active',
        enrolledAt: {
          gte: start,
          lt: end,
        },
      },
    }),
  ])

  const activeMap = new Map(
    activeCounts.map((entry) => [entry.courseId.toString(), entry._count._all]),
  )
  const newMap = new Map(newCounts.map((entry) => [entry.courseId.toString(), entry._count._all]))

  await prisma.$transaction(
    courses.map((course) =>
      prisma.courseDailyStat.upsert({
        where: {
          courseId_metricDate: {
            courseId: course.id,
            metricDate: start,
          },
        },
        update: {
          activeEnrollmentCount: activeMap.get(course.id.toString()) ?? 0,
          newEnrollmentCount: newMap.get(course.id.toString()) ?? 0,
        },
        create: {
          courseId: course.id,
          metricDate: start,
          activeEnrollmentCount: activeMap.get(course.id.toString()) ?? 0,
          newEnrollmentCount: newMap.get(course.id.toString()) ?? 0,
        },
      }),
    ),
  )
}

export function startCourseDailyStatsScheduler() {
  if (
    !env.ENABLE_DAILY_STATS_JOB ||
    env.ENABLE_BACKGROUND_WORKERS ||
    env.NODE_ENV === 'test' ||
    intervalHandle
  ) {
    return
  }

  syncCourseDailyStats().catch((error) => {
    console.error('Failed to sync course daily stats:', error)
  })

  intervalHandle = setInterval(
    () => {
      syncCourseDailyStats().catch((error) => {
        console.error('Failed to sync course daily stats:', error)
      })
    },
    15 * 60 * 1000,
  )

  intervalHandle.unref?.()
}

export function stopCourseDailyStatsScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
