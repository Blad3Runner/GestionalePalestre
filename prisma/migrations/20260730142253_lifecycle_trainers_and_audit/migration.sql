-- CreateEnum
CREATE TYPE "LifecycleState" AS ENUM ('LEAD', 'STARTER', 'CLIENT', 'DORMANT', 'CHURN');

-- CreateEnum
CREATE TYPE "CompensationModel" AS ENUM ('PER_SESSION', 'REVENUE_SHARE', 'OWNER_DRAW');

-- AlterTable
ALTER TABLE "bridge_membership" ADD COLUMN     "deactivated_at" TIMESTAMPTZ(6),
ADD COLUMN     "default_trainer_id" UUID,
ADD COLUMN     "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "left_at" TIMESTAMPTZ(6),
ADD COLUMN     "level" VARCHAR(60),
ADD COLUMN     "lifecycle_state" "LifecycleState",
ADD COLUMN     "package_cap" INTEGER;

-- CreateTable
CREATE TABLE "fact_lifecycle_event" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "gym_id" UUID,
    "from_state" "LifecycleState",
    "to_state" "LifecycleState" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" UUID,
    "note" VARCHAR(500),

    CONSTRAINT "fact_lifecycle_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dim_trainer_compensation" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "gym_id" UUID,
    "model" "CompensationModel" NOT NULL,
    "amount" DECIMAL(12,2),
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_trainer_compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "company_id" UUID,
    "gym_id" UUID,
    "table_name" VARCHAR(63) NOT NULL,
    "row_id" VARCHAR(64),
    "action" VARCHAR(10) NOT NULL,
    "changed_by_id" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fact_lifecycle_event_membership_id_idx" ON "fact_lifecycle_event"("membership_id");

-- CreateIndex
CREATE INDEX "fact_lifecycle_event_company_id_idx" ON "fact_lifecycle_event"("company_id");

-- CreateIndex
CREATE INDEX "fact_lifecycle_event_occurred_at_idx" ON "fact_lifecycle_event"("occurred_at");

-- CreateIndex
CREATE INDEX "dim_trainer_compensation_membership_id_idx" ON "dim_trainer_compensation"("membership_id");

-- CreateIndex
CREATE INDEX "dim_trainer_compensation_company_id_idx" ON "dim_trainer_compensation"("company_id");

-- CreateIndex
CREATE INDEX "audit_log_company_id_changed_at_idx" ON "audit_log"("company_id", "changed_at");

-- CreateIndex
CREATE INDEX "audit_log_table_name_row_id_idx" ON "audit_log"("table_name", "row_id");

-- CreateIndex
CREATE INDEX "bridge_membership_default_trainer_id_idx" ON "bridge_membership"("default_trainer_id");

-- AddForeignKey
ALTER TABLE "bridge_membership" ADD CONSTRAINT "bridge_membership_default_trainer_id_fkey" FOREIGN KEY ("default_trainer_id") REFERENCES "bridge_membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_lifecycle_event" ADD CONSTRAINT "fact_lifecycle_event_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "bridge_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dim_trainer_compensation" ADD CONSTRAINT "dim_trainer_compensation_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "bridge_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
