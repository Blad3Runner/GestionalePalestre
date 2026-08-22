-- ===========================================================================
-- THE DEACTIVATION DATE BELONGS TO THE DATABASE TOO.
--
-- The clock was taken away from the application on 2026-07-30, after every
-- timestamp it wrote was found to be two hours adrift. One place was missed:
-- `setTrainerActiveAction` still stamped `deactivated_at` with the
-- application's own `new Date()`, and the test that guards the rule checks a
-- fixed list of columns that did not include it.
--
-- Rather than fix the one call site and hope the next one remembers, the
-- column is now DERIVED. The application cannot set it, correctly or
-- incorrectly: whatever it sends is overwritten by the rule below.
--
--   active            -> NULL
--   newly deactivated -> now(), from the database clock
--   still deactivated -> the original date, never restamped by an unrelated edit
-- ===========================================================================

CREATE FUNCTION app.set_deactivated_at() RETURNS trigger
  LANGUAGE plpgsql AS
$$
BEGIN
  NEW.deactivated_at := CASE
    WHEN NEW.is_active THEN NULL
    WHEN TG_OP = 'UPDATE' AND NOT OLD.is_active THEN OLD.deactivated_at
    ELSE now()
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_deactivated_at
  BEFORE INSERT OR UPDATE ON bridge_membership
  FOR EACH ROW EXECUTE FUNCTION app.set_deactivated_at();
