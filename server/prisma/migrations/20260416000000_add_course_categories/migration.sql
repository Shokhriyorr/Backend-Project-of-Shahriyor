-- CreateTable: course_categories
CREATE TABLE "course_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex on name
CREATE UNIQUE INDEX "course_categories_name_key" ON "course_categories"("name");

-- Seed two default categories so existing courses can be migrated
INSERT INTO "course_categories" ("name", "description") VALUES
  ('Frontend', 'Courses about Frontend development'),
  ('Backend',  'Courses about Backend development');

-- AddColumn category_id to courses (nullable first, then fill, then set NOT NULL)
ALTER TABLE "courses" ADD COLUMN "category_id" BIGINT;

-- Fill existing rows: map old enum value to new id
UPDATE "courses"
SET "category_id" = (
  SELECT "id" FROM "course_categories" WHERE "name" = "courses"."category"::TEXT
);

-- Set NOT NULL after fill
ALTER TABLE "courses" ALTER COLUMN "category_id" SET NOT NULL;

-- DropColumn old enum column
ALTER TABLE "courses" DROP COLUMN "category";

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "course_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "Category";
