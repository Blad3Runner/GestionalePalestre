-- ===========================================================================
-- ROW-LEVEL SECURITY: the walls between companies.
--
-- This is the second, independent lock required by CLAUDE.md and Step 3 of
-- docs/build-plan.md. The first lock is the application filtering its own
-- queries; this one is the database refusing to hand the rows over at all,
-- even if the application asks wrongly.
--
-- It only works because the application connects as `gestionale_app`, which is
-- not a superuser and has NOBYPASSRLS. PostgreSQL ignores every policy below
-- for superusers. FORCE ROW LEVEL SECURITY is added as well, so that even the
-- table owner is subject to them.
-- ===========================================================================

CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO gestionale_app;


-- ---------------------------------------------------------------------------
-- THE BADGE
--
-- Every request opens its transaction by setting these four values with
-- set_config(..., true), which makes them last exactly as long as that
-- transaction. That is what makes this safe when database connections are
-- shared between requests: a badge cannot leak into somebody else's query.
--
-- Reading a badge that was never set returns NULL, never an error, so a
-- forgotten badge produces "no rows" rather than a crash — see wall test (d).
-- ---------------------------------------------------------------------------

CREATE FUNCTION app.current_level() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.access_level', true), '') $$;

CREATE FUNCTION app.current_company() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.company_id', true), '')::uuid $$;

CREATE FUNCTION app.current_gym() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.gym_id', true), '')::uuid $$;

CREATE FUNCTION app.current_person() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.person_id', true), '')::uuid $$;

-- The founders, who see across every company.
CREATE FUNCTION app.is_platform() RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT app.current_level() = 'PLATFORM' $$;

-- True when the badge may see everything belonging to one company.
CREATE FUNCTION app.sees_whole_company() RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT app.current_level() = 'COMPANY' $$;

-- Gym-level and worker badges are confined to a single named gym.
CREATE FUNCTION app.sees_one_gym() RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT app.current_level() IN ('GYM', 'WORKER') $$;

CREATE FUNCTION app.is_client() RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT app.current_level() = 'CLIENT' $$;


-- ---------------------------------------------------------------------------
-- SIGNING IN HAPPENS BEFORE THERE IS A BADGE
--
-- Looking somebody up by email must work before the system knows who they are,
-- so it cannot go through the policies below. That exception is confined to
-- the handful of functions here.
--
-- They are SECURITY DEFINER and owned by the privileged account, so they see
-- past Row-Level Security — but their *shape* is the limit: one email in, one
-- person out. There is no general-purpose way for the application to read the
-- person table without a badge.
-- ---------------------------------------------------------------------------

CREATE FUNCTION app.auth_find_person_by_email(p_email text)
  RETURNS TABLE (id uuid, name varchar, email varchar, password_hash varchar, language text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
  SELECT p.id, p.name, p.email, p.password_hash, p.language::text
  FROM dim_person p
  WHERE p.email = lower(trim(p_email))
$$;

-- Everything needed to build a badge: the person's platform roles, and every
-- company and gym they belong to.
CREATE FUNCTION app.auth_person_context(p_person_id uuid)
  RETURNS TABLE (
    source text,
    role text,
    company_id uuid,
    gym_id uuid,
    company_name varchar,
    gym_name varchar
  )
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
  SELECT 'platform'::text, pr.role::text, NULL::uuid, NULL::uuid, NULL::varchar, NULL::varchar
  FROM person_role pr
  WHERE pr.person_id = p_person_id
  UNION ALL
  SELECT 'membership'::text, m.role::text, m.company_id, m.gym_id, c.name, g.name
  FROM bridge_membership m
  JOIN dim_company c ON c.id = m.company_id
  LEFT JOIN dim_gym g ON g.id = m.gym_id
  WHERE m.person_id = p_person_id
    AND m.is_active
    AND c.is_active
    AND (g.id IS NULL OR g.is_active)
$$;

CREATE FUNCTION app.auth_create_reset_token(
  p_person_id uuid, p_token_hash text, p_expires_at timestamptz
) RETURNS void
  LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
  INSERT INTO password_reset_token (id, person_id, token_hash, expires_at)
  VALUES (gen_random_uuid(), p_person_id, p_token_hash, p_expires_at)
$$;

CREATE FUNCTION app.auth_find_reset_token(p_token_hash text)
  RETURNS TABLE (id uuid, person_id uuid, expires_at timestamptz, used_at timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
  SELECT t.id, t.person_id, t.expires_at, t.used_at
  FROM password_reset_token t
  WHERE t.token_hash = p_token_hash
$$;

-- Sets the new password and burns every outstanding link for that person.
CREATE FUNCTION app.auth_complete_reset(p_person_id uuid, p_password_hash text)
  RETURNS void
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
BEGIN
  UPDATE dim_person SET password_hash = p_password_hash, updated_at = now()
  WHERE id = p_person_id;

  UPDATE password_reset_token SET used_at = now()
  WHERE person_id = p_person_id AND used_at IS NULL;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO gestionale_app;


-- ---------------------------------------------------------------------------
-- WHAT THE APPLICATION MAY TOUCH AT ALL
--
-- Granted deliberately, table by table. The password reset table is reachable
-- only through the functions above, so the application gets nothing on it.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON dim_company, dim_gym, bridge_membership TO gestionale_app;
GRANT SELECT, UPDATE ON dim_person TO gestionale_app;
GRANT SELECT ON person_role TO gestionale_app;


-- ---------------------------------------------------------------------------
-- THE POLICIES
-- ---------------------------------------------------------------------------

ALTER TABLE dim_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_company FORCE ROW LEVEL SECURITY;

CREATE POLICY company_visibility ON dim_company
  USING (app.is_platform() OR id = app.current_company());


ALTER TABLE dim_gym ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_gym FORCE ROW LEVEL SECURITY;

-- A company badge sees every gym of its circuit. A gym or worker badge sees
-- exactly one — this is wall test (b): sibling gyms of the same company are
-- invisible to a gym-level badge.
CREATE POLICY gym_visibility ON dim_gym
  USING (
    app.is_platform()
    OR (
      company_id = app.current_company()
      AND (
        app.sees_whole_company()
        OR ((app.sees_one_gym() OR app.is_client()) AND id = app.current_gym())
      )
    )
  );


ALTER TABLE bridge_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_membership FORCE ROW LEVEL SECURITY;

-- A client sees only their own membership — wall test (c).
CREATE POLICY membership_visibility ON bridge_membership
  USING (
    app.is_platform()
    OR (
      company_id = app.current_company()
      AND (
        app.sees_whole_company()
        OR (app.sees_one_gym() AND (gym_id = app.current_gym() OR gym_id IS NULL))
        OR (app.is_client() AND person_id = app.current_person())
      )
    )
  );


ALTER TABLE dim_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_person FORCE ROW LEVEL SECURITY;

-- The hard case: a person carries no company_id, being one global human being.
-- They are reachable only through a membership the badge can already see, or as
-- one's own row.
--
-- Note what happens by composition: the sub-query below is itself filtered by
-- the membership policy above. A client badge can see only its own membership,
-- so it can see only its own person row. A worker badge sees its gym's
-- memberships, so it sees its gym's people. The right answer falls out; it does
-- not have to be restated here.
CREATE POLICY person_visibility ON dim_person
  USING (
    app.is_platform()
    OR id = app.current_person()
    OR EXISTS (
      SELECT 1 FROM bridge_membership m WHERE m.person_id = dim_person.id
    )
  );


ALTER TABLE person_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_role FORCE ROW LEVEL SECURITY;

-- Platform roles are nobody else's business.
CREATE POLICY person_role_visibility ON person_role
  USING (app.is_platform() OR person_id = app.current_person());


ALTER TABLE password_reset_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_token FORCE ROW LEVEL SECURITY;

-- Deliberately no policy at all: with Row-Level Security enabled and nothing
-- permitted, every direct query returns nothing. The only way in is through the
-- auth functions above.
