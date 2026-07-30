-- ===========================================================================
-- STEP 4: the audit trail, the policies for the new tables, and the reduction
-- of person_role to platform admin only.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- person_role shrinks to what it was always meant to be
--
-- The four gym roles now live on bridge_membership, where they are attached to
-- a company and a gym. Platform admin is the only genuinely global role, and
-- the CHECK constraint makes that permanent rather than a one-off tidy-up.
--
-- Done before the triggers are attached, so the cleanup does not fill the
-- audit trail with entries nobody made.
-- ---------------------------------------------------------------------------

DELETE FROM person_role WHERE role <> 'PLATFORM_ADMIN';

ALTER TABLE person_role
  ADD CONSTRAINT person_role_is_platform_only CHECK (role = 'PLATFORM_ADMIN');


-- ---------------------------------------------------------------------------
-- THE AUDIT TRAIL
--
-- Written by a database trigger, never by application code. That is the whole
-- point: a trigger fires no matter which code path did the writing, so the
-- next feature cannot forget to record itself.
--
-- It knows *who* without being told, by reading the same badge the transaction
-- is already carrying for Row-Level Security.
--
-- SECURITY DEFINER, because the application is granted SELECT on audit_log and
-- nothing else: it can read the trail but can neither forge an entry nor erase
-- one.
-- ---------------------------------------------------------------------------

CREATE FUNCTION app.audit_row() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS
$$
DECLARE
  v_before jsonb;
  v_after  jsonb;
  v_row    jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_row    := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_after  := to_jsonb(NEW);
    v_row    := to_jsonb(NEW);
  ELSE
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    v_row    := to_jsonb(NEW);
  END IF;

  -- A password hash must never be copied into the audit trail, where it would
  -- outlive every password change.
  v_before := v_before - 'password_hash';
  v_after  := v_after  - 'password_hash';

  INSERT INTO audit_log (
    company_id, gym_id, table_name, row_id, action, changed_by_id, before, after
  )
  VALUES (
    nullif(v_row->>'company_id', '')::uuid,
    nullif(v_row->>'gym_id', '')::uuid,
    TG_TABLE_NAME,
    v_row->>'id',
    TG_OP,
    nullif(current_setting('app.person_id', true), '')::uuid,
    v_before,
    v_after
  );

  RETURN NULL; -- AFTER trigger: the row is already written.
END;
$$;

-- Everything that describes who somebody is, or what they are owed, is audited
-- from here onward. Credits, bookings and payments join this list as they are
-- built.
CREATE TRIGGER audit_company
  AFTER INSERT OR UPDATE OR DELETE ON dim_company
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE TRIGGER audit_gym
  AFTER INSERT OR UPDATE OR DELETE ON dim_gym
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE TRIGGER audit_membership
  AFTER INSERT OR UPDATE OR DELETE ON bridge_membership
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE TRIGGER audit_person
  AFTER INSERT OR UPDATE OR DELETE ON dim_person
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE TRIGGER audit_person_role
  AFTER INSERT OR UPDATE OR DELETE ON person_role
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE TRIGGER audit_lifecycle_event
  AFTER INSERT OR UPDATE OR DELETE ON fact_lifecycle_event
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

CREATE TRIGGER audit_trainer_compensation
  AFTER INSERT OR UPDATE OR DELETE ON dim_trainer_compensation
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();


-- ---------------------------------------------------------------------------
-- WHAT THE APPLICATION MAY TOUCH
--
-- Note what is missing: no INSERT, UPDATE or DELETE on audit_log at any level.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT ON fact_lifecycle_event TO gestionale_app;
GRANT SELECT, INSERT, UPDATE ON dim_trainer_compensation TO gestionale_app;
GRANT SELECT ON audit_log TO gestionale_app;


-- ---------------------------------------------------------------------------
-- THE POLICIES
-- ---------------------------------------------------------------------------

ALTER TABLE fact_lifecycle_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_lifecycle_event FORCE ROW LEVEL SECURITY;

-- Composed over the membership policy rather than restating it: a client can
-- see only their own membership, so they see only their own history; a worker
-- sees their gym's memberships, so they see their gym's history.
CREATE POLICY lifecycle_visibility ON fact_lifecycle_event
  USING (
    app.is_platform()
    OR EXISTS (
      SELECT 1 FROM bridge_membership m
      WHERE m.id = fact_lifecycle_event.membership_id
    )
  );


ALTER TABLE dim_trainer_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_trainer_compensation FORCE ROW LEVEL SECURITY;

-- Deliberately NOT composed over membership. What a trainer is paid is
-- financial data, and workers and clients see no financial data at all — not
-- even a trainer's own. Owner-level only.
CREATE POLICY trainer_compensation_visibility ON dim_trainer_compensation
  USING (
    app.is_platform()
    OR (
      company_id = app.current_company()
      AND (
        app.sees_whole_company()
        OR (app.current_level() = 'GYM' AND gym_id = app.current_gym())
      )
    )
  );


ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Same reasoning: the trail of who changed what is an owner's business.
-- Rows with no company at all — a change to a person, who belongs to none —
-- are visible to the platform only.
CREATE POLICY audit_visibility ON audit_log
  USING (
    app.is_platform()
    OR (
      company_id IS NOT NULL
      AND company_id = app.current_company()
      AND (
        app.sees_whole_company()
        OR (app.current_level() = 'GYM' AND gym_id = app.current_gym())
      )
    )
  );
