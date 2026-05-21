CREATE TYPE "CourseLevel" AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE "CourseStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'cancelled');
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'publish', 'archive', 'enroll', 'unenroll', 'login');
CREATE TYPE "AuditEntityType" AS ENUM ('user', 'teacher', 'category', 'course', 'enrollment', 'session');

ALTER TABLE "app_users"
  ADD COLUMN "display_name" VARCHAR(120),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "last_login_at" TIMESTAMPTZ;

UPDATE "app_users"
SET "password_hash" = '$2b$10$y2.eyJv05U156I9KbbUnjeHFaGEZDUk/lXCbGILxvfz6mtQNwwCXe'
WHERE "password_hash" IS NULL;

ALTER TABLE "app_users"
  ALTER COLUMN "password_hash" SET NOT NULL;

CREATE INDEX "app_users_role_created_at_idx" ON "app_users"("role", "created_at");

ALTER TABLE "teachers"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "teachers"
  ADD CONSTRAINT "teachers_rating_check"
  CHECK ("rating" >= 1.0 AND "rating" <= 5.0);

CREATE INDEX "teachers_is_active_created_at_idx" ON "teachers"("is_active", "created_at");
CREATE INDEX "teachers_subject_is_active_idx" ON "teachers"("subject", "is_active");

ALTER TABLE "course_categories"
  ADD COLUMN "slug" VARCHAR(120),
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "course_categories"
SET "slug" = trim(BOTH '-' FROM regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

ALTER TABLE "course_categories"
  ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "course_categories_slug_key" ON "course_categories"("slug");
CREATE INDEX "course_categories_is_active_name_idx" ON "course_categories"("is_active", "name");

ALTER TABLE "courses"
  ADD COLUMN "slug" VARCHAR(160),
  ADD COLUMN "status" "CourseStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "seats_taken" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "published_at" TIMESTAMPTZ,
  ADD COLUMN "archived_at" TIMESTAMPTZ,
  ADD COLUMN "level_new" "CourseLevel";

UPDATE "courses"
SET "slug" = trim(BOTH '-' FROM regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) || '-' || "id"::TEXT
WHERE "slug" IS NULL;

UPDATE "courses"
SET "level_new" = CASE lower("level")
  WHEN 'beginner' THEN 'beginner'::"CourseLevel"
  WHEN 'intermediate' THEN 'intermediate'::"CourseLevel"
  WHEN 'advanced' THEN 'advanced'::"CourseLevel"
  ELSE 'beginner'::"CourseLevel"
END;

ALTER TABLE "courses" DROP COLUMN "level";
ALTER TABLE "courses" RENAME COLUMN "level_new" TO "level";
ALTER TABLE "courses" ALTER COLUMN "slug" SET NOT NULL;

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_lessons_check" CHECK ("lessons" > 0),
  ADD CONSTRAINT "courses_capacity_check" CHECK ("capacity" > 0),
  ADD CONSTRAINT "courses_seats_taken_non_negative_check" CHECK ("seats_taken" >= 0),
  ADD CONSTRAINT "courses_seats_taken_capacity_check" CHECK ("seats_taken" <= "capacity");

CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_status_created_at_id_idx" ON "courses"("status", "created_at", "id");
CREATE INDEX "courses_category_id_status_created_at_id_idx" ON "courses"("category_id", "status", "created_at", "id");
CREATE INDEX "courses_teacher_id_status_created_at_id_idx" ON "courses"("teacher_id", "status", "created_at", "id");
CREATE INDEX "courses_level_status_created_at_id_idx" ON "courses"("level", "status", "created_at", "id");

ALTER TABLE "enrollments"
  ADD COLUMN "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "cancelled_at" TIMESTAMPTZ;

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_cancelled_at_check"
  CHECK ("status" <> 'cancelled' OR "cancelled_at" IS NOT NULL);

DROP INDEX IF EXISTS "enrollments_user_id_course_id_key";
CREATE UNIQUE INDEX "enrollments_user_course_key" ON "enrollments"("user_id", "course_id");
CREATE INDEX "enrollments_user_id_status_enrolled_at_idx" ON "enrollments"("user_id", "status", "enrolled_at");
CREATE INDEX "enrollments_course_id_status_enrolled_at_idx" ON "enrollments"("course_id", "status", "enrolled_at");

CREATE TABLE "auth_sessions" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "jti" VARCHAR(120) NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "ip_address" VARCHAR(64),
  "user_agent" VARCHAR(255),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_jti_key" ON "auth_sessions"("jti");
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id", "expires_at");
CREATE INDEX "auth_sessions_expires_at_revoked_at_idx" ON "auth_sessions"("expires_at", "revoked_at");

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_logs" (
  "id" BIGSERIAL NOT NULL,
  "actor_user_id" BIGINT,
  "entity_type" "AuditEntityType" NOT NULL,
  "entity_id" BIGINT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "before_json" JSONB,
  "after_json" JSONB,
  "request_id" VARCHAR(120),
  "ip_address" VARCHAR(64),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "app_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "course_daily_stats" (
  "id" BIGSERIAL NOT NULL,
  "course_id" BIGINT NOT NULL,
  "metric_date" DATE NOT NULL,
  "active_enrollment_count" INTEGER NOT NULL DEFAULT 0,
  "new_enrollment_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_daily_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_daily_stats_unique" ON "course_daily_stats"("course_id", "metric_date");
CREATE INDEX "course_daily_stats_metric_date_idx" ON "course_daily_stats"("metric_date");

ALTER TABLE "course_daily_stats"
  ADD CONSTRAINT "course_daily_stats_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
