# Where the project actually stands

Written 2026-07-29, at the owner's request, after Steps 1 and 2. Work is **frozen** here.

This describes what genuinely exists today — not what is planned. The plan is in
[build-plan.md](build-plan.md); the intended final shape is in
[data-model.md](data-model.md). This file is the honest inventory of the gap between them.

---

## 1. The short version

Two of the ten steps are built. The application runs, people can log in, and the five
roles control what each person can open. **There is no gym in the system, no credit, no
booking and no money.** Three tables exist. The intended design has around twenty-five.

Everything built so far is the *frame*: identity and permissions. None of it is the
business.

---

## 2. Why PostgreSQL

The owner chose PostgreSQL before the build started. Three reasons make it the right fit
for this particular business, rather than just a reasonable default:

**Credits are real money, so half-finished operations are unacceptable.** When a member
checks in, the system must charge credits *and* record attendance *and* recognise revenue.
PostgreSQL guarantees these either all happen or none do. A crash mid-way cannot leave a
member charged for a session nobody recorded.

**The discount maths must be exact.** The weekly frequency discount produces 25.80 and
21.60 credits. PostgreSQL's `NUMERIC` type stores these precisely. Databases that store
money as floating-point numbers produce 21.599999999 and lose fractions of a cent on every
transaction — invisible individually, a reconciliation nightmare across a year.

**Row-Level Security.** PostgreSQL can enforce, inside the database itself, that a query
belonging to Gym A physically cannot return Gym B's rows — regardless of what the
application code asks for. Very few databases offer this. It is the second, independent
wall the build plan requires for tenant separation, and it is the single strongest reason
to stay with PostgreSQL.

Alternatives considered and why they lose here: **MySQL / MariaDB** — no Row-Level
Security, so the second wall disappears. **MongoDB** — weak fit for a ledger whose whole
purpose is exact balances and joins across services, trainers and dates. **SQL Server /
Oracle** — licence costs incompatible with a €30–50/month infrastructure budget.
**Cloud-proprietary databases** — vendor lock-in, which the project rules already forbid.
**CockroachDB / YugabyteDB** — PostgreSQL-compatible and distributed, but built for
millions of users; at ~10,000 they add cost and operational complexity for nothing.

**Migration risk if this were reversed later:** low but not zero. The three tables that
exist are ordinary and would port anywhere. The genuinely PostgreSQL-specific commitment
is Row-Level Security, which has not been built yet. That decision is still fully open.

---

## 3. What exists in the database today

Four tables. One is Prisma's own bookkeeping and can be ignored.

### `dim_person` — a human being (5 rows, all demo accounts)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Permanent internal identifier |
| `name` | text | |
| `email` | text | Unique. Stored lower-cased, so sign-in ignores capitals |
| `password_hash` | text | The scrambled password. The real one is never stored |
| `phone` | text | Optional |
| `language` | `IT` / `EN` | Defaults to Italian |
| `created_at`, `updated_at` | timestamp | With timezone |

**Deliberately has no `gym_id`.** A person is one global human being, per the owner's
decision that the same individual can be a member at one gym and a trainer at another.

### `person_role` — which roles somebody holds (6 rows)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `person_id` | uuid | Points at `dim_person` |
| `role` | one of five | `PLATFORM_ADMIN`, `GYM_OWNER`, `STAFF`, `TRAINER`, `MEMBER` |
| `granted_at` | timestamp | |

One row per role, so a person can hold several — six rows across five people, because the
demo owner is also a trainer.

**This table is temporary in its current form.** See section 6.

### `password_reset_token` — pending "I forgot my password" requests (1 row)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `person_id` | uuid | |
| `token_hash` | text | Only the *scrambled* token. A stolen database cannot reset accounts |
| `expires_at` | timestamp | One hour after it was created |
| `used_at` | timestamp | Set when used, so a link works exactly once |
| `created_at` | timestamp | |

---

## 4. What does NOT exist

Everything below is designed in [data-model.md](data-model.md) and built by nothing:

- **`dim_gym`** — the tenant. *No gym exists in the system.*
- **`bridge_gym_person`**, **`bridge_gym_trainer`** — who belongs to which gym, in which role
- **`dim_service`**, **`dim_price_band`**, **`dim_pack`**, **`dim_level`**,
  **`dim_discount_rule`**, **`dim_starter_product`** — the catalogue and all pricing
- **`fact_credit_batch`**, **`fact_credit_movement`** — the wallet and the ledger
- **`fact_session`**, **`fact_booking`**, **`fact_attendance`** — the calendar and check-in
- **`fact_frequency_entry`** — the weekly discount
- **`fact_payment`** — cash in
- **`fact_entitlement_grant` / `_line`** — the Starter Pack
- **`fact_lifecycle_event`**, **`audit_log`** — history and the audit trail
- **`dim_anamnesi`**, **`dim_consent`** — health data and consents
- **`dim_date`**, **`dim_client_profile`**, **`dim_trainer_compensation`**

Also absent: **Row-Level Security** (nothing is switched on), **any tenant filtering**
(there is nothing to filter), the **audit log**, and **any money or credit logic
whatsoever**.

---

## 5. How the code is organised

45 files, about half of them tests. In plain terms:

**Identity and permissions** — `src/lib/auth/`
- `roles.ts` — the five roles as a plain list
- `route-policy.ts` — **the single place that says who may open what.** Five lines of
  actual rules
- `guard.ts` — the check every protected page runs on the server before rendering
- `passwords.ts` — scrambling and verifying passwords
- `password-reset.ts` — the forgotten-password flow

**Sign-in machinery** — `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`

**Language** — `src/i18n/dictionaries.ts` holds every phrase in Italian and English.
English cannot compile if it is missing a phrase.

**Screens** — `src/app/`. Sign in, forgotten password, reset password, a refusal page, a
health page, and five near-empty role areas that exist only to prove permissions work.

**Not connected to anything** — `src/lib/email.ts`. The password-reset flow is complete,
but no email service has been chosen, so the link is printed to the terminal instead.
See OQ-7 in [decisions.md](decisions.md).

**141 automated tests**, covering every role against every protected area, addresses that
merely resemble protected ones, damaged login tokens, and password handling.

---

## 6. The two temporary arrangements

Both are recorded in [decisions.md](decisions.md). Neither is a mistake; both are
consequences of building in order, and both must be dealt with before or during Step 3.

### 6.1 The application uses the database's master key

Today the app connects as `postgres`, the account that can do anything.

**Why this matters:** PostgreSQL's Row-Level Security — the second wall between gyms —
**does not apply to the master-key account, nor to the account that owns the table.** If
Step 3 is built without changing this first, the walls would be created, the tests would
pass, and nothing would actually be protected.

**The fix:** a second, restricted database account for everyday work, with the master key
reserved for structural changes. Roughly twenty minutes. There is no sensible alternative;
the only open question is whether it happens now or as the first task of Step 3.

### 6.2 Roles sit on the person, not on the person-at-a-gym

Today the system records "Luca is a trainer" globally. The agreed design records "Luca is
a trainer **at Gym A**".

**Why it was built this way:** gyms do not exist until Step 3 and people are not linked to
them until Step 4 — but login and permissions could not be built at all without some
notion of roles.

**What changes in Step 4:** the four gym-scoped roles (owner, front desk, trainer, member)
move onto `bridge_gym_person`. `PLATFORM_ADMIN` stays global, because the founders belong
to no gym. `route-policy.ts` gains a gym dimension.

**Risk:** low. The move is a migration plus one permission check, and the existing tests
fail loudly if it goes wrong.

---

## 7. What would be cheap or costly to change now

Useful if any of the foundations are to be reconsidered.

| Change | Cost | Why |
| --- | --- | --- |
| Different database | **Low** | Only three ordinary tables exist. Nothing PostgreSQL-specific has been built yet |
| Different login library | **Low–medium** | Confined to three files; the role logic is independent of it |
| Different way of handling languages | **Low** | All text is in one file |
| Different permission model | **Low** | The rules are five lines in `route-policy.ts`, with 141 tests describing the current behaviour |
| Different table-naming style | **Low** | Three tables, one migration |
| Abandoning the dimensional (`dim_` / `fact_`) design | **Low now, high later** | It has barely been expressed yet. After Step 6 the ledger makes it expensive |
| Not using Row-Level Security | **Free now** | Nothing has been built on it |

**In short: almost every foundational decision is still cheap to reverse.** That stops
being true around Step 5–6, when the catalogue and the ledger arrive.

---

## 8. Honest summary

What has been built is small, conventional, well-tested, and largely disposable. Two
temporary arrangements are documented and neither is dangerous *provided the first one is
fixed before Row-Level Security is introduced*.

Nothing about the credit model, the pricing, the ledger or the accounting rules has been
built or committed to yet. Every one of those decisions remains fully open.
