ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'verify_email';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'request_password_reset';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'reset_password';

CREATE TYPE "AccountTokenPurpose" AS ENUM ('email_verification', 'password_reset');

ALTER TABLE "app_users"
  ADD COLUMN "email_verified_at" TIMESTAMPTZ;

UPDATE "app_users"
SET "email_verified_at" = COALESCE("last_login_at", "created_at", CURRENT_TIMESTAMP)
WHERE "email_verified_at" IS NULL;

CREATE INDEX "app_users_email_verified_at_idx" ON "app_users"("email_verified_at");

CREATE TABLE "account_tokens" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "purpose" "AccountTokenPurpose" NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_tokens_token_hash_key" ON "account_tokens"("token_hash");
CREATE INDEX "account_tokens_user_id_purpose_expires_at_idx" ON "account_tokens"("user_id", "purpose", "expires_at");
CREATE INDEX "account_tokens_purpose_expires_at_used_at_idx" ON "account_tokens"("purpose", "expires_at", "used_at");

ALTER TABLE "account_tokens"
  ADD CONSTRAINT "account_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
