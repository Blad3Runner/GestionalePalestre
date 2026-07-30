# Data model

Rewritten 2026-07-30 following the owner's structural decisions — see
[decisions.md](decisions.md), entries dated 2026-07-30. This supersedes the earlier
design sketch.

**Not code — this is the map the code follows.** The "Step" column is binding: no table is
created before the step that needs it. Three tables exist today; everything else is
planned.

---

## The shape

Reference tables (`dim_`) describe *what exists*. Event tables (`fact_`) record *what
happened*, one row per event. Everything is joined by permanent internal identifiers, so an
email can change and a price can be revised without breaking a single historical record.

**Three rules govern this model. They are not negotiable.**

1. **The tenant is the company.** Every tenant table carries `company_id`, plus `gym_id`
   where the row belongs to one location. The single exception is `dim_person`.
2. **Nothing derivable is stored.** No snapshot tables, no stored aggregates, no running
   totals. A balance is always the sum of the ledger, computed on demand — never a number
   kept up to date.
3. **`fact_credit_movement` is append-only.** A mistake is corrected with a new offsetting
   row, never by editing history. Other fact tables may be updated as events unfold; their
   history is preserved by `audit_log`.

### Stored evidence is not a stored aggregate

A few values are written down and never recalculated, and this does not contradict rule 2:

| Value | Where | Why it is recorded |
| --- | --- | --- |
| Maximum price promised | `fact_booking` | The studio must be able to prove what the member was told |
| Band price, discount, credits charged | `fact_booking` | The receipt for that session |
| Real paying head count | `fact_session` | The basis the price was calculated from |
| Cash paid, credits granted, cash-per-credit | `fact_credit_batch` | The terms of that purchase |

These are receipts. A stored *balance* would be a violation; a stored *receipt* is not.

---

## Tenancy and people

| Table | Step | What it holds |
| --- | --- | --- |
| `dim_company` | 3 | **The tenant.** A circuit owning one or more gyms. Name, fiscal identifiers, status, and the configuration bag that makes every business rule adjustable per client. |
| `dim_gym` | 3 | A single location. Belongs to exactly one company. Name, city, timezone, status, and its own configuration, which overrides the company's. |
| `dim_person` | **2 · built** | A human being: name, email, password hash, phone, language. **No `company_id`** — one global identity, which is what lets the same individual be a member at one company and a trainer at another. |
| `person_role` | **2 · built** | Shrinks to **platform admin only** in Step 4. Everything else moves to `bridge_membership`. |
| `password_reset_token` | **2 · built** | Pending "I forgot my password" requests. Stores only a hash of the token. |
| `bridge_membership` | 4 | **The heart of who-is-what-where.** One row per person, per scope, per role. Replaces `bridge_gym_person`, `bridge_gym_trainer` and `dim_client_profile`. |

### `bridge_membership` in detail

| Column | Notes |
| --- | --- |
| `company_id` | Always set |
| `gym_id` | **Null means the role applies to every gym of the company.** Set means this location only |
| `person_id`, `role` | `GYM_OWNER`, `STAFF`, `TRAINER` or `MEMBER` |
| `joined_at`, `left_at`, `is_active` | Trainers are deactivated, never deleted, so history stays attributed |
| `lifecycle_state` | Member rows only: Lead → Starter → Client → Dormant/Churn |
| `level`, `package_cap`, `default_trainer_id` | Member rows only — was `dim_client_profile`. `level` is a plain value; permitted values live in the gym's configuration |
| *(trainer fields)* | Trainer rows only — was `bridge_gym_trainer` |

---

## Catalogue — what a gym sells

| Table | Step | What it holds |
| --- | --- | --- |
| `dim_service` | 5 | PT, mobility, osteopathy, BIA, water. Category, VAT treatment, and whether it counts toward the weekly frequency discount. |
| `dim_price_band` | 5 | Price per head by group size (50 / 35 / 30 / 25 / 20), with `valid_from` / `valid_to`. |
| `dim_discount_rule` | 5 | The frequency scale: 2 entries → −7%, 3 → −14%. Dated. |
| `dim_product` | 5 | **Merged `dim_pack` + `dim_starter_product`.** A `kind` of credit pack or starter. Credit packs carry credits granted, cash price, resulting cash-per-credit and validity in months; starters carry their contents as structured data (4 PT + 1 osteopath + 1 nutritionist evaluation). Dated. |
| `dim_trainer_compensation` | 4 | Per trainer, dated: per-session, revenue share, or owner draw. |
| *(reserved)* `dim_subscription_product` | later | Recurring memberships. Rules still deferred. |

---

## Money — the part that must be exactly right

| Table | Step | What it records |
| --- | --- | --- |
| `fact_credit_batch` | 6 | **Every credit purchase as a dated lot:** credits bought, cash actually paid, the resulting cash-per-credit, and its own expiry date. Never extended by a later purchase. |
| `fact_credit_movement` | 6 | **The ledger. Append-only.** One row per movement: purchase / hold / hold release / charge / refund / expiry / burn / correction. Carries credits, cash value, service, trainer, booking, who did it and why. **The balance is always the sum of this table.** |
| `fact_payment` | 6 | **Cash in. Never revenue.** `cash_amount` is always filled, for every kind of gym. Amount, method, what it was for, who recorded it. |
| `fact_entitlement` | 7 | **Merged grant + line.** One row per granted unit of a starter product, with when it was consumed and by which booking. Never touches the wallet. |

**The credit-adjusted view is computed, never stored.** Credits consumed multiplied by the
ratio of the batch they came from. An owner toggles between total cash-in and this. For
subscription gyms the same toggle uses time elapsed instead of credits.

---

## The calendar

| Table | Step | What it records |
| --- | --- | --- |
| `fact_session` | 8 | A slot: trainer, service, level, start, end, maximum size, status. At close, the **real paying head count** (members present + late cancellations). |
| `fact_booking` | 8 | **Absorbs `fact_attendance` and `fact_frequency_entry`.** See below. |

### `fact_booking` in detail

| Column | Filled | Notes |
| --- | --- | --- |
| `session_id`, `person_id` | at booking | |
| `status` | throughout | held → attended / cancelled / late_cancelled / no_show |
| `promised_max_price` | at booking | **Always the solo price.** Permanent proof of what the member was told |
| `band_price`, `discount_applied`, `credits_charged` | at check-in | The receipt |
| `week_start`, `position_in_week` | at charge | Monday–Sunday, in the gym's timezone. Was `fact_frequency_entry` |

---

## History, compliance and health

| Table | Step | What it holds |
| --- | --- | --- |
| `fact_lifecycle_event` | 4 | Every state change with its date. The backbone of funnel diagnostics. |
| `audit_log` | 4 | Who changed what, when, before and after. Covers everything touching credits or money — **and every change to a booking**, which is what makes operational rows safe to update. |
| `dim_anamnesi` | later | **Special-category health data**, deliberately in its own table: goal, strength, mobility, history, clinical flags. Encrypted, access restricted, separately deletable. Requires the art. 9 consent flow first. |
| `dim_consent` | later | Contract signature (artt. 1341–1342 c.c.), privacy, health questionnaire, art. 9 consent — each dated and versioned. |

---

## Removed from the earlier design

| Was | Now |
| --- | --- |
| `dim_date` | Gone. The week is computed from timestamps in the gym's timezone |
| `fact_frequency_entry` | Columns on `fact_booking` |
| `fact_attendance` | Merged into `fact_booking` |
| `dim_client_profile` | Columns on `bridge_membership` |
| `bridge_gym_trainer` | Columns on `bridge_membership` |
| `bridge_gym_person` | Renamed `bridge_membership`, now company-aware |
| `dim_pack` + `dim_starter_product` | One `dim_product` with a `kind` |
| `fact_entitlement_grant` + `_line` | One `fact_entitlement` |
| `dim_level` | A column, with permitted values in gym configuration |

Roughly 28 tables become 21.

---

## Row-Level Security

The full rules are in [decisions.md](decisions.md). In short: a restricted database account
is created **before any policy exists**; every request sets a badge (company, optional gym,
access level, person) for the life of its transaction; every tenant table has Row-Level
Security both `ENABLE`d and `FORCE`d.

`dim_person` is the hard case: it has no `company_id`, so it is reachable only through a
membership in the badge's company or gym, or as one's own row.

Five wall tests run **on the restricted account** and are written to fail if the wall is
fake — including an assertion that the application's own connection is not a superuser and
cannot bypass Row-Level Security.

---

## Two things this shape has to get right

**Credits are consumed from batches, not from a pot.** Because a credit bought in a
discounted pack cost less than €1, the system draws credits oldest-first. That single
choice makes three things correct at once: revenue is recognised at the cash actually
received, the debt to the member clears exactly, and credits expire in the order the member
would expect. The client record shows a **current credit ratio** — the cash value of the
credits held right now — but it is *calculated from the batches*, never stored.

**Money moves in two steps.** Booking writes a `hold` at the maximum price. Check-in writes
a `hold release` plus a `charge` at the real price. Cancelling in time writes a `hold
release`. Cancelling late converts the hold into a `burn`. Every one of those is a visible
line in the member's statement, which is what makes the wallet a ledger rather than a
number.
