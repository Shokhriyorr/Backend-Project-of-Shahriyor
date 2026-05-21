# Объяснение кода по файлам

Этот документ можно использовать на pre-defense. Он объясняет, за что отвечает каждый важный файл backend-проекта Academy Portal.

## Общая идея проекта

Backend построен как production-style API для учебной платформы. Пользователь регистрируется, подтверждает email, логинится, получает JWT access/refresh tokens, просматривает курсы и записывается на опубликованные курсы. Admin управляет teachers, categories, courses, audit logs и background jobs. Все операции с базой идут через Prisma ORM.

Главные архитектурные правила:

- `src/routes` отвечает за HTTP endpoints.
- `src/services` содержит бизнес-логику.
- `src/middleware` защищает endpoints и валидирует запросы.
- `src/queues` и `src/workers` отвечают за Redis/BullMQ фоновые задачи.
- `src/jobs` содержит recurring/manual jobs.
- `src/utils` содержит общие helper-функции.
- `tests` проверяет auth, policies, email, env, pagination и readiness.

## Корневые файлы

### `package.json`

Описывает Node.js проект, зависимости и команды. Важные scripts:

- `npm start` запускает production server через `src/index.js`.
- `npm run dev` запускает сервер через `nodemon`.
- `npm test` запускает Jest tests.
- `npm run lint` проверяет синтаксис, Prisma schema, OpenAPI YAML и отсутствие raw SQL в application code.
- `npm run prisma:deploy` применяет migrations.
- `npm run seed:admin` создает admin account.
- `npm run seed:demo` создает demo categories, teachers и courses.
- `npm run email:test` отправляет тестовое письмо.
- `npm run predefense:check` проверяет готовность проекта к локальной демонстрации.
- `npm run predefense:strict` проверяет строгий defense mode с SMTP и Redis.

### `.env.example`

Шаблон environment variables. Он показывает, какие настройки нужны для запуска:

- `DATABASE_URL` для PostgreSQL.
- `JWT_SECRET` для подписи JWT.
- `CORS_ORIGINS` для разрешенных frontend origins.
- `EMAIL_PROVIDER`, `SMTP_*`, `EMAIL_FROM` для email.
- `ENABLE_BACKGROUND_WORKERS`, `REDIS_URL` для Redis/BullMQ.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` для seed-admin.

### `.gitignore`

Запрещает попадание в GitHub файлов, которые нельзя коммитить:

- `node_modules/`
- `.env`
- logs
- coverage/build folders

Это важно для безопасности, потому что реальные secrets не должны быть в репозитории.

### `.dockerignore`

Исключает лишние файлы из Docker build context: dependencies, logs, env files, coverage, dist.

### `Dockerfile`

Описывает сборку Docker image для backend. Используется, если нужно запустить API в контейнере.

### `docker-compose.yml`

Описывает локальные сервисы для разработки, например PostgreSQL и Redis. Это помогает быстро поднять инфраструктуру для defense.

### `prisma.config.ts`

Конфигурация Prisma CLI. Указывает:

- путь к Prisma schema;
- путь к migrations;
- `DATABASE_URL` как источник подключения.

### `jest.config.js`

Конфигурация тестов. Указывает:

- тестовая среда `node`;
- папка `tests`;
- setup files для environment variables и common test setup.

### `openapi.yaml`

Полный API contract. Описывает все endpoints, request/response schemas, auth requirements и error formats. Swagger UI читает именно этот файл.

### `ARCHITECTURE.md`

Кратко объясняет архитектурные границы проекта: routes, services, queues, workers, jobs, validation, utils. Это удобно для ответа на вопрос "почему проект так организован".

### `CHANGELOG.md`

История важных изменений. Показывает, какие hardening/final changes были сделаны перед defense.

### `DEFENSE_SCRIPT.md`

Пошаговый сценарий демонстрации: как открыть Postman, показать auth flow, business workflow, email, jobs, tests и Swagger.

### `README.md`

Основная инструкция для запуска проекта: установка, env, migrations, seed, tests, API docs.

## Prisma и база данных

### `prisma/schema.prisma`

Главный database schema файл. Он описывает models, enums, relations и indexes.

Основные models:

- `User` хранит пользователей, роли, email verification status и password hash.
- `AccountToken` хранит hashed tokens для email verification и password reset.
- `AuthSession` хранит refresh token sessions с revoked/expired state.
- `Teacher` хранит преподавателей.
- `CourseCategory` хранит категории курсов.
- `Course` хранит курсы, status, capacity и seats taken.
- `Enrollment` хранит запись студента на курс.
- `AuditLog` хранит историю важных действий.
- `CourseDailyStat` хранит daily statistics для admin reporting.

Enums:

- `Role`: `student`, `admin`.
- `CourseStatus`: `draft`, `published`, `archived`.
- `EnrollmentStatus`: `active`, `cancelled`.
- `AuditAction`, `AuditEntityType`, `AccountTokenPurpose`.

### `prisma/migrations/*/migration.sql`

История изменения базы данных. Эти файлы показывают, как schema развивалась от initial version до final pre-defense schema. Их нельзя удалять, потому что они доказывают migration history.

### `prisma/migrations/migration_lock.toml`

Служебный файл Prisma, фиксирует provider migrations.

## Entry point и app setup

### `src/index.js`

Главный runtime entry point. Он:

- запускает Express server;
- стартует email worker;
- стартует maintenance worker;
- стартует daily stats scheduler;
- регистрирует graceful shutdown для `SIGINT` и `SIGTERM`;
- закрывает Prisma, Redis, queues и workers при остановке.

На защите можно сказать: "Этот файл отвечает за lifecycle приложения".

### `src/app.js`

Создает Express app. Он:

- подключает request id middleware;
- настраивает CORS;
- включает JSON parser;
- публикует `/health`, `/health/ready`, `/openapi.yaml`, `/docs`;
- подключает route modules;
- подключает `notFoundHandler` и `errorHandler`.

На защите можно сказать: "Этот файл отвечает за HTTP composition и API mounting".

### `src/prisma.js`

Создает Prisma Client через PostgreSQL adapter. Экспортирует:

- `prisma` для ORM access;
- `Prisma` для enum/errors/transaction isolation;
- `disconnectPrisma()` для graceful shutdown.

Важно: application code использует Prisma ORM, raw SQL не используется.

## Config

### `src/config/env.js`

Валидирует environment variables через Valibot. Если critical env отсутствует или неправильный, app не boot-ится.

Проверяет:

- `DATABASE_URL`;
- длину `JWT_SECRET`;
- `CORS_ORIGINS`;
- SMTP settings when `EMAIL_PROVIDER=smtp`;
- Redis URL when `ENABLE_BACKGROUND_WORKERS=true`;
- production ограничения: нельзя placeholder JWT и wildcard CORS.

На защите можно сказать: "Проект fail-fast валидирует конфигурацию".

## Middleware

### `src/middleware/auth.js`

JWT authentication и RBAC.

Функции:

- `optionalAuth` пытается прочитать Bearer token, но не падает, если его нет.
- `requireAuth` требует valid access token.
- `requireRole(...roles)` проверяет role пользователя.

Также middleware блокирует access tokens без `email_verified=true`.

### `src/middleware/rateLimit.js`

Rate limiting для auth endpoints. Ограничивает brute-force попытки login/register/reset/verify.

При превышении возвращает standardized error response с code `too_many_requests`.

### `src/middleware/validate.js`

Оборачивает Valibot schemas. Если request body неправильный, возвращает `422 unprocessable_entity` с details по полям.

## Validation

### `src/validation/schemas.js`

Все request body schemas.

Проверяет:

- email format;
- password complexity;
- role values;
- course level/status;
- required fields;
- numeric IDs;
- teacher/category/course/enrollment body structure.

Это защищает routes от плохих данных до бизнес-логики.

## Routes

### `src/routes/auth.js`

Auth endpoints:

- `POST /api/auth/register`: создает student account, хеширует пароль, создает verification token, queue verification email.
- `POST /api/auth/login`: проверяет email/password, требует verified email, выдает access/refresh tokens.
- `POST /api/auth/refresh`: rotation refresh token.
- `POST /api/auth/logout`: revoke refresh token.
- `GET /api/auth/verify-email`: verification через link token.
- `POST /api/auth/verify-email`: verification через body token.
- `POST /api/auth/resend-verification`: повторная отправка verification email.
- `POST /api/auth/password-reset/request`: создает reset token и queue reset email.
- `POST /api/auth/password-reset/confirm`: меняет пароль, revokes sessions.

Важная защита: public registration разрешает только `student`, admin создается через seed.

### `src/routes/users.js`

Account endpoints для authenticated user:

- `GET /api/users/me`: вернуть текущего пользователя.
- `PATCH /api/users/me`: обновить display name и отправить account update email.
- `PUT /api/users/me/password`: сменить пароль, revoke refresh sessions, отправить password changed email.

### `src/routes/courses.js`

Course catalog endpoints:

- `GET /api/courses`: public видит только published courses, admin может фильтровать по status.
- `GET /api/courses/:id`: получить один course.
- `POST /api/courses`: admin создает course.
- `PUT /api/courses/:id`: admin обновляет course и может publish/archive.
- `DELETE /api/courses/:id`: admin archives course.

Бизнес-правила:

- published course должен иметь complete payload;
- archived course нельзя republish;
- published course нельзя вернуть в draft;
- publication может queue email notification.

### `src/routes/categories.js`

Category endpoints:

- `GET /api/categories`: list categories with cursor pagination.
- `POST /api/categories`: admin создает category.
- `PUT /api/categories/:id`: admin обновляет category.
- `DELETE /api/categories/:id`: admin удаляет category, если нет non-archived courses.

### `src/routes/teachers.js`

Teacher endpoints:

- `GET /api/teachers`: list teachers with search/filter/sort.
- `POST /api/teachers`: admin создает teacher.
- `PUT /api/teachers/:id`: admin обновляет teacher.
- `DELETE /api/teachers/:id`: admin удаляет teacher, если нет active course references.

### `src/routes/enrollments.js`

Student enrollment endpoints:

- `GET /api/enrollments`: student смотрит свои enrollments.
- `POST /api/enrollments`: student enrolls in course.
- `DELETE /api/enrollments/:courseId`: student cancels enrollment.

Route полностью защищен `requireAuth` и `requireRole('student')`.

### `src/routes/admin.js`

Admin visibility endpoints:

- `GET /api/admin/audit-logs`: audit trail.
- `GET /api/admin/course-daily-stats`: daily reporting.
- `GET /api/admin/jobs/email`: email queue snapshot.
- `GET /api/admin/jobs/maintenance`: maintenance queue snapshot.
- `POST /api/admin/jobs/course-daily-stats`: trigger stats job.

Все endpoints требуют admin role.

## Services

### `src/services/authService.js`

JWT lifecycle logic.

Функции:

- создает access token;
- создает refresh token;
- хранит refresh session hash в базе;
- refresh token rotation;
- revoke refresh token;
- проверяет expired/revoked sessions.

Важный security point: refresh token в базе хранится как SHA-256 hash, не plain text.

### `src/services/accountTokenService.js`

Email verification и password reset token logic.

Функции:

- создает opaque token;
- хранит hash token в базе;
- делает old active tokens used;
- consume token one time;
- verify email;
- reset password;
- revoke active sessions after password reset.

### `src/services/enrollmentService.js`

Главная business logic для enrollment.

Правила:

- курс должен существовать;
- курс должен быть `published`;
- нельзя дважды enroll active enrollment;
- нельзя превышать capacity;
- seat increment/decrement идет внутри transaction;
- используется Serializable isolation;
- есть retry при конфликте transaction.

Это самый сильный пример ACID/business logic.

### `src/services/coursePolicy.js`

Правила публикации курса.

Функции:

- проверяет, что published course заполнен корректно;
- определяет audit action при переходе статусов.

### `src/services/auditService.js`

Создает audit logs для важных действий. Сохраняет:

- actor user id;
- entity type;
- entity id;
- action;
- before/after snapshots;
- request id;
- ip address.

### `src/services/emailTemplates.js`

Генерирует email message objects.

Templates:

- email verification;
- password reset;
- enrollment confirmation;
- enrollment cancelled;
- course published;
- account updated;
- password changed.

Каждый template содержит `to`, `subject`, `text`, `html`, `metadata`.

### `src/services/emailService.js`

Реальная отправка email.

Modes:

- `EMAIL_PROVIDER=smtp`: отправляет через Nodemailer SMTP.
- `EMAIL_PROVIDER=log`: пишет email в `email.out.log` для локального теста.

### `src/services/notificationService.js`

Связывает business events с email templates и queue. Используется routes/services, чтобы отправлять письма best-effort.

Events:

- enrollment created;
- enrollment cancelled;
- course published;
- account updated;
- password changed.

### `src/services/readinessService.js`

Логика `/health/ready`. Проверяет:

- database через Prisma query;
- Redis через `ping`, если workers enabled.

Возвращает status snapshot с latency и error details.

## Queues

### `src/queues/redis.js`

Создает shared Redis connection для BullMQ. Если background workers выключены, connection не создается.

### `src/queues/emailQueue.js`

Email queue logic.

Если workers enabled:

- добавляет job в BullMQ;
- attempts = 3;
- exponential backoff;
- сохраняет queue visibility data.

Если workers disabled:

- отправляет email через `setImmediate`;
- API не ждет SMTP response.

### `src/queues/maintenanceQueue.js`

Maintenance queue logic.

Функции:

- queue daily stats job;
- schedule repeating stats sync;
- return queue snapshot for admin endpoint;
- close queue on shutdown.

## Workers

### `src/workers/emailWorker.js`

BullMQ worker для email jobs.

Он:

- слушает `academy-email` queue;
- вызывает `sendEmailNow`;
- работает с concurrency 5;
- логирует failed/completed jobs.

### `src/workers/maintenanceWorker.js`

BullMQ worker для maintenance jobs.

Он:

- слушает maintenance queue;
- выполняет `syncCourseDailyStats`;
- логирует failed/completed jobs.

## Jobs

### `src/jobs/courseDailyStats.js`

Собирает daily course statistics.

Что делает:

- считает active enrollments по каждому course;
- считает today's new enrollments;
- делает upsert в `CourseDailyStat`;
- может запускаться scheduler-ом каждые 15 минут, если Redis workers disabled.

## Utils

### `src/utils/api.js`

Общие API helpers.

Содержит:

- `ApiError` для standard error handling;
- `asyncHandler` для async Express routes;
- `requestIdMiddleware`;
- `getClientIp`;
- `toAuditJson`;
- `buildErrorBody`;
- `notFoundHandler`;
- `errorHandler`;
- Prisma error normalization;
- `parseId`;
- `mutationSuccess`.

### `src/utils/pagination.js`

Cursor pagination helpers.

Содержит:

- limit validation;
- cursor encode/decode;
- created_at cursor filters;
- string cursor filters;
- common paginated response builder.

### `src/utils/serializers.js`

Преобразует Prisma models в API response format.

Важно: BigInt превращается в string, чтобы JSON не ломался.

Serializers:

- user;
- auth response;
- audit log;
- course daily stat;
- teacher;
- category;
- course;
- enrollment.

### `src/utils/slug.js`

Создает URL-friendly slug из текста. Используется для course/category slugs.

## Scripts

### `scripts/lint.js`

Custom lint script.

Проверяет:

- JS syntax через `node --check`;
- raw SQL patterns в `src`;
- OpenAPI YAML parse;
- Prisma schema validate.

Это защищает от automatic 50% deduction за raw SQL.

### `scripts/predefense-check.js`

Smoke check перед защитой.

Проверяет:

- required env;
- JWT secret;
- CORS;
- SMTP mode warning/error;
- Redis workers warning/error;
- PostgreSQL TCP reachability;
- Redis TCP reachability if enabled;
- `/health`;
- `/health/ready`;
- `/docs`;
- `/api/courses`.

### `scripts/seed-admin.js`

Создает или обновляет admin user из env:

- `ADMIN_EMAIL`;
- `ADMIN_PASSWORD`;
- `ADMIN_NAME`.

Пароль хешируется bcrypt. Admin сразу email-verified.

### `scripts/reset-demo-data.js`

Создает demo data:

- categories;
- teachers;
- published courses.

Используется для быстрой демонстрации API.

### `scripts/send-test-email.js`

Отправляет тестовое письмо через текущий email provider. Удобно для проверки SMTP перед защитой.

## Tests

### `tests/setupEnv.js`

Ставит test environment variables, чтобы tests запускались стабильно без реального `.env`.

### `tests/setup.js`

Общий test setup после env setup. Используется Jest перед тестами.

### `tests/unit/coursePolicy.test.js`

Проверяет правила публикации курса и audit action transition.

### `tests/unit/emailTemplates.test.js`

Проверяет, что email templates создают корректный subject/body/metadata.

### `tests/unit/emailService.test.js`

Проверяет email sending behavior, включая log provider.

### `tests/unit/env.test.js`

Проверяет environment validation: missing secrets, placeholder secrets, production CORS и SMTP/Redis constraints.

### `tests/unit/pagination.test.js`

Проверяет limit validation, cursor filters и common paginated response.

### `tests/unit/readinessService.test.js`

Проверяет readiness snapshot для DB/Redis states.

### `tests/unit/slug.test.js`

Проверяет генерацию slug.

### `tests/integration/authMiddleware.test.js`

Проверяет protected routes:

- no token gives 401;
- unverified token gives 403;
- student token cannot access admin endpoint.

### `tests/integration/authRoutes.test.js`

Проверяет auth route behavior, например запрет public admin self-registration.

## CI

### `.github/workflows/ci.yml`

GitHub Actions workflow.

Он:

- поднимает PostgreSQL service;
- устанавливает dependencies;
- генерирует Prisma client;
- применяет migrations;
- запускает lint;
- запускает tests;
- проверяет Docker build.

## Файлы, которые не являются source code

### `email.out.log`

Локальный email log для `EMAIL_PROVIDER=log`. В него записываются verification/reset/test emails. Этот файл не должен попадать в GitHub.

### `server.out.log` и `server.err.log`

Runtime logs локального сервера. Они нужны только во время локального запуска и не должны попадать в GitHub.

### `.env`

Локальные реальные environment variables. В GitHub нельзя коммитить.

### `node_modules/`

Установленные dependencies. В GitHub не коммитится, восстанавливается через `npm install` или `npm ci`.

## Короткое объяснение для преподавателя

Если нужно объяснить проект за 1 минуту:

"Это Express + Prisma backend для Academy Portal. Auth реализует registration, email verification, login, refresh rotation, logout and password reset. Protected endpoints проверяют JWT и RBAC. Admin управляет teachers, categories and courses, student может enroll только в published courses. Enrollment защищен Serializable transaction и conditional seat update, поэтому capacity не переполняется при concurrency. Email notifications идут через queue или async fallback. Redis/BullMQ используется для email и maintenance jobs. API полностью описан в OpenAPI, есть Swagger UI, migrations, env validation, tests and pre-defense check."

