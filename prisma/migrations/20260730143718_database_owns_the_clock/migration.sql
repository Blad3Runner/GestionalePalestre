-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "changed_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "bridge_membership" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "joined_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "dim_company" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "dim_gym" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "dim_person" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "dim_trainer_compensation" ALTER COLUMN "valid_from" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "fact_lifecycle_event" ALTER COLUMN "occurred_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "password_reset_token" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "person_role" ALTER COLUMN "granted_at" SET DEFAULT CURRENT_TIMESTAMP;


-- ===========================================================================
-- THE DATABASE OWNS THE CLOCK
--
-- Timestamps written by the application arrived two hours adrift — the local
-- UTC offset — while everything PostgreSQL wrote itself was correct. The
-- statements above move every default onto the database. This trigger does the
-- same for `updated_at`, which Prisma used to set from the application on
-- every write.
--
-- Why it is worth a migration of its own: credits expire twelve months from
-- purchase, cancellation is free until exactly 24 hours before a session, and
-- the frequency discount depends on which Monday–Sunday week a session falls
-- in. A two-hour error in any of those is money, not cosmetics.
-- ===========================================================================

CREATE FUNCTION app.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_company    BEFORE UPDATE ON dim_company
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER touch_gym        BEFORE UPDATE ON dim_gym
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER touch_membership BEFORE UPDATE ON bridge_membership
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER touch_person     BEFORE UPDATE ON dim_person
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
