-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'GYM_OWNER', 'STAFF', 'TRAINER', 'MEMBER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('IT', 'EN');

-- CreateTable
CREATE TABLE "dim_person" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(60) NOT NULL,
    "phone" VARCHAR(40),
    "language" "Language" NOT NULL DEFAULT 'IT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dim_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_role" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dim_person_email_key" ON "dim_person"("email");

-- CreateIndex
CREATE INDEX "person_role_role_idx" ON "person_role"("role");

-- CreateIndex
CREATE UNIQUE INDEX "person_role_person_id_role_key" ON "person_role"("person_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_hash_key" ON "password_reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_token_person_id_idx" ON "password_reset_token"("person_id");

-- AddForeignKey
ALTER TABLE "person_role" ADD CONSTRAINT "person_role_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "dim_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "dim_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
