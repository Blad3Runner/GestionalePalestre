-- ===========================================================================
-- RESET TOKENS EXPIRE BY THE DATABASE'S CLOCK.
--
-- Found 2026-08-22, while building the first-password link. A reset token's
-- `expires_at` was computed in the application as "now + one hour" and sent
-- through Prisma as a parameter. Measured against the database clock it landed
-- ONE HOUR IN THE PAST — a two-hour shift, the same drift that was removed
-- from every other column on 2026-07-30 and missed here because `expires_at`
-- is a future timestamp and so could never have a DEFAULT to check.
--
-- It went unnoticed because the application then compared the value against
-- its OWN clock, which drifts identically: wrong twice, consistently, and so
-- invisible. Any check written in SQL would have rejected every token
-- immediately.
--
-- Two changes, so the application no longer has an opinion about time:
--
--   1. The lifetime is computed here, in `auth_create_reset_token`, from
--      `now()`. The caller no longer passes a moment at all.
--   2. `auth_find_reset_token` reports whether the token is still good,
--      instead of handing back a date for the application to judge.
-- ===========================================================================

-- The caller passes a LIFETIME, not a moment. There is no way to express a
-- wrong "now" through this signature.
DROP FUNCTION IF EXISTS app.auth_create_reset_token(uuid, text, timestamptz);

CREATE FUNCTION app.auth_create_reset_token(
  p_person_id uuid, p_token_hash text, p_lifetime interval
) RETURNS void
  LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
  INSERT INTO password_reset_token (id, person_id, token_hash, expires_at)
  VALUES (gen_random_uuid(), p_person_id, p_token_hash, now() + p_lifetime)
$$;

-- Returns the verdict, not the evidence. `still_valid` is computed against the
-- same clock that wrote the row, so the two can never disagree.
DROP FUNCTION IF EXISTS app.auth_find_reset_token(text);

CREATE FUNCTION app.auth_find_reset_token(p_token_hash text)
  RETURNS TABLE (
    id uuid,
    person_id uuid,
    expires_at timestamptz,
    used_at timestamptz,
    still_valid boolean
  )
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$
  SELECT t.id, t.person_id, t.expires_at, t.used_at,
         (t.used_at IS NULL AND t.expires_at > now()) AS still_valid
  FROM password_reset_token t
  WHERE t.token_hash = p_token_hash
$$;

GRANT EXECUTE ON FUNCTION app.auth_create_reset_token(uuid, text, interval) TO gestionale_app;
GRANT EXECUTE ON FUNCTION app.auth_find_reset_token(text) TO gestionale_app;
