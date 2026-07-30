-- ===========================================================================
-- Front desk staff and owners need to be able to add a new member.
--
-- Reading a person is governed by `person_visibility`, which requires a
-- membership the badge can already see. A brand-new person has no membership
-- yet, so that rule could never permit their creation — hence a separate
-- policy for INSERT alone.
--
-- Note it is only INSERT: this does not widen who may *read* anybody. A person
-- created here becomes visible through the membership created with them, in
-- the same transaction, and through nothing else.
-- ===========================================================================

GRANT INSERT ON dim_person TO gestionale_app;

CREATE POLICY person_insert ON dim_person FOR INSERT
  WITH CHECK (
    app.is_platform()
    OR app.sees_whole_company()
    OR app.sees_one_gym()
  );
