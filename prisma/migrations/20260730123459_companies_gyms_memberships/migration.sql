-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PLATFORM', 'COMPANY', 'GYM', 'WORKER', 'CLIENT');

-- CreateTable
CREATE TABLE "dim_company" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "fiscal_id" VARCHAR(40),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dim_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_gym" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "city" VARCHAR(120),
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'Europe/Rome',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dim_gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bridge_membership" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "gym_id" UUID,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bridge_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dim_gym_company_id_idx" ON "dim_gym"("company_id");

-- CreateIndex
CREATE INDEX "bridge_membership_company_id_idx" ON "bridge_membership"("company_id");

-- CreateIndex
CREATE INDEX "bridge_membership_gym_id_idx" ON "bridge_membership"("gym_id");

-- CreateIndex
CREATE INDEX "bridge_membership_person_id_idx" ON "bridge_membership"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "bridge_membership_person_id_company_id_gym_id_role_key" ON "bridge_membership"("person_id", "company_id", "gym_id", "role");

-- AddForeignKey
ALTER TABLE "dim_gym" ADD CONSTRAINT "dim_gym_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "dim_company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bridge_membership" ADD CONSTRAINT "bridge_membership_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "dim_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bridge_membership" ADD CONSTRAINT "bridge_membership_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "dim_company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bridge_membership" ADD CONSTRAINT "bridge_membership_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "dim_gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
