# Data model

Design sketch, agreed 2026-07-29. Not code — this is the map the code will follow.

## Shape: dimensional style

The database is organised the way a reporting warehouse is organised:

- **Dimension tables** hold the slow-moving things — gyms, people, services, price
  bands, levels, calendar days. They describe *what exists*.
- **Fact tables** hold events — credit movements, bookings, attendances, payments.
  They record *what happened*, one row per event, and they are **append-only**: a
  mistake is corrected by adding an offsetting row, never by editing history.
- Everything is joined by **surrogate primary keys** (a meaningless permanent id
  number), so a person can change their email, a service can be renamed and a price can
  change without breaking a single historical record.

This fits the business unusually well, because the credit ledger is a fact table by
nature: "on this date, this member, this service, this many credits". The owner's
financial views — revenue by service, revenue per trainer hour, live credit liability —
then come straight out of the design rather than being bolted on afterwards.

**One honest caveat.** A textbook star schema is built for *reading*. This app also has
to *write* safely: two people booking the last slot at the same moment must not both get
it, and a balance must never be wrong. So a handful of tables carry stricter rules than a
warehouse would use. The shape is dimensional; the guarantees are transactional.

## The tenant rule

Every table below carries `gym_id`, with one deliberate exception: `dim_person`. A person
is one global human being — the same individual can be a member at one gym and a trainer
at another (owner's decision, 2026-07-29). What ties them to a gym, and in what role, is
the bridge table.

---

## Dimensions

| Table | What it holds |
| --- | --- |
| `dim_gym` | The tenant. Name, city, timezone, status, and the settings bag that makes every business rule configurable per client. |
| `dim_person` | A human being: name, email, password, phone, language. **No `gym_id`** — see the tenant rule above. |
| `dim_service` | Something sellable: PT, mobility, osteopathy, BIA, water. Carries its category, its VAT treatment, and whether it counts toward the weekly frequency discount. |
| `dim_price_band` | Price per head by group size (50 / 35 / 30 / 25 / 20), with `valid_from` / `valid_to`. Changing a price never rewrites last year. |
| `dim_level` | Strength/mobility classification that drives automatic group matching. |
| `dim_discount_rule` | The frequency scale: 2 entries → −7%, 3 → −14%, and beyond. Dated, so changes don't corrupt past weeks. |
| `dim_pack` | Recharge SKUs: credits granted, cash price, resulting cash-per-credit, validity in months. |
| `dim_starter_product` | The €140 Starter Pack and its €84/person couple variant, and exactly what each grants. |
| `dim_trainer_compensation` | Per trainer, dated: per-session, revenue share, or owner draw. |
| `dim_date` | One row per calendar day, with the Monday–Sunday week it belongs to. Makes the weekly counter and every report trivial. |
| `dim_client_profile` | A member's gym-specific detail: assigned level, package cap ("da 2/3/4"), default trainer. |
| `dim_anamnesi` | **Special-category health data**, deliberately in its own table: goal, strength, mobility, history, clinical flags. Encrypted, access restricted, separately deletable. |
| `dim_consent` | Contract signature (artt. 1341–1342 c.c.), privacy, health questionnaire, art. 9 consent — each dated and versioned. |
| *(reserved)* `dim_subscription_product` | Recurring memberships. Placeholder now, rules later. |

## Bridges

| Table | What it holds |
| --- | --- |
| `bridge_gym_person` | **Gym ↔ User.** Which person belongs to which gym, in which role (owner / staff / trainer / member — more than one allowed, since Matteo is owner *and* trainer), their lifecycle state (Lead → Starter → Client → Dormant/Churn), and when they joined. |
| `bridge_gym_trainer` | **Gym ↔ PT.** Trainer-specific detail at that gym: which services they can deliver, their compensation model, active or deactivated, and the dates. Trainers are never deleted — deactivated, so history stays attributed. |

## Facts

| Table | What it records |
| --- | --- |
| `fact_credit_batch` | Every credit purchase as a dated lot: credits bought, cash actually paid, the resulting cash-per-credit, and its own expiry date. This is what lets a discounted credit be valued correctly and expired oldest-first. |
| `fact_credit_movement` | **The ledger.** One row per movement: purchase / hold / hold release / charge / refund / expiry / burn / correction. Carries the credits, the cash value, the service, the trainer, the booking, who did it and why. Append-only. The balance is always the sum of this table — never a stored number that could drift. |
| `fact_session` | A slot on the calendar: trainer, service, level, start, end, maximum size, status. |
| `fact_booking` | A member holding a place: when, which session, and **the maximum price they were promised** — stored, so we can always prove what they were told. |
| `fact_attendance` | Check-in — the event that creates revenue: who was present, the real paying head count, the band price, the discount applied, and the credits actually charged. |
| `fact_frequency_entry` | One row per paid entry in a Monday–Sunday week, with its position in the week and the discount applied. Makes the retroactive discount auditable instead of magic. |
| `fact_payment` | Cash in: amount, method, what it was for, who recorded it. **Never revenue.** |
| `fact_entitlement_grant` / `fact_entitlement_line` | The Starter Pack as bought and as consumed — 4 PT, 1 osteopath, 1 nutritionist evaluation, ticked off one at a time. Does not touch the wallet. |
| `fact_lifecycle_event` | Every state change with its date. The backbone of the funnel diagnostics. |
| `audit_log` | Who changed what, when, before and after — on everything touching credits or money. |
| *(reserved)* `fact_subscription_period` | Recurring membership periods. Placeholder now. |

---

## Two things the shape has to get right

**Credits are consumed from batches, not from a pot.** Because a credit bought in a
discounted pack cost less than €1, the system draws credits oldest-first from
`fact_credit_batch`. That single choice makes three things correct at once: revenue is
recognised at the cash actually received, the debt to the member clears exactly, and
credits expire in the order the member would expect.

The client record shows a **current credit ratio** — the cash value of the credits the
member holds right now — but that number is *calculated from the batches*, never stored
and overwritten. A member holding 220 credits bought at €0.80 who then buys 600 more at
€0.667 still owns 220 credits genuinely worth €0.80; overwriting a single ratio would
quietly revalue them.

**Money moves in two steps.** Booking writes a `hold` movement at the maximum price.
Check-in writes a `hold release` plus a `charge` at the real price. Cancelling in time
writes a `hold release`. Cancelling late converts the hold into a `burn`. Every one of
those is a visible line in the member's statement, which is what makes the wallet a
ledger rather than a number.
