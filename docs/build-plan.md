# Build plan

Agreed 2026-07-29. Ten steps, in this order. Decisions live in
[decisions.md](decisions.md); the schema in [data-model.md](data-model.md); the
architecture rules in [../CLAUDE.md](../CLAUDE.md).

---

## Progress

**Do the first unchecked step below. Only that step. Then tick it and stop.**

- [x] Step 1 — Project skeleton *(done 2026-07-29)*
- [x] Step 2 — Login and roles *(done 2026-07-29)*
- [x] Step 3 — Tenant separation *(done 2026-07-30)*
- [x] Step 4 — People, roles and lifecycle *(done 2026-07-30)*
- [ ] Step 5 — Catalogue: services, prices, packs and levels
- [ ] Step 6 — The credit wallet as a ledger
- [ ] Step 7 — Starter Pack entitlements
- [ ] Step 8 — Sessions, capacity and booking
- [ ] Step 9 — Check-in, cancellation and dynamic group pricing
- [ ] Step 10 — The weekly frequency discount

*Step 1 built the skeleton: the application runs, PostgreSQL 18 is connected, migrations
and tests both work. Step 2 added real accounts, the five roles and server-enforced page
protection, with 141 automated tests. No companies, no gyms and no business data yet —
that is correct.*

**Steps 3 and 4 below were rewritten on 2026-07-30** to match the owner's structural
decisions: the tenant is the **company**, not the gym. The superuser warning that used to
sit here is now the first item of Step 3, where it cannot be missed.

*Roles currently sit on the person. Step 4 reduces `person_role` to platform admin only and
moves the rest into `bridge_membership`; page protection gains a company and gym dimension
along the way.*

---

## Rules for whoever builds this

1. **Do exactly one step per session.** Stop at the end of it and report. Do not begin
   the next step, even if it seems small, and even if the current step finishes quickly.
2. **Every step has a "Not in this step" list. Treat it as binding.** If something you
   want to build appears there, it belongs to a later session.
3. **The schema and the business rules are already decided.** Read them, follow them,
   do not redesign them. If a decision is genuinely missing, stop and ask the owner —
   never assume, never invent a default.
4. **Work directly.** No subagents, no multi-agent workflows, no parallel design phases.
   This is a small, well-specified project; ordinary sequential work is correct.
5. **Every step ends with something the owner can see or try**, plus a plain-language
   explanation of what was built and how to try it. The owner is not a developer.
6. **Tenant isolation and the ledger rules are never "cleaned up later."** They are
   correct from the first line that touches them.
7. **Write tests as you go**, in the same step as the code they cover.

---

## Step 1 — Project skeleton

**What it is:** the empty building with the plumbing connected. Nothing about gyms yet.

**Build:** the Next.js + TypeScript project · PostgreSQL running locally · Prisma with a
working migration command · the test runner (Vitest) with one trivial passing test ·
environment configuration with a committed `.env.example` and a real `.env` that is
ignored by git · a single `/health` page that queries the database and reports what it
finds · a README section telling the owner the exact commands to start and to test.

**Done when:** one command starts the app; visiting `/health` in a browser shows
"application running, database connected" with the PostgreSQL version; one command runs
the test suite and it passes.

**Not in this step:** any table other than what Prisma needs · any login · any gym, user,
service or credit concept · any UI framework styling work · any deployment.

---

## Step 2 — Login and roles

**What it is:** real accounts and the permission skeleton.

**Build:** Auth.js with email-and-password sign in, sign out and password reset · a
`person` table (name, email, password hash, phone, language) · the five roles as a
concept — platform admin, gym owner, front desk/staff, trainer, member — with a person
able to hold more than one · route protection so a page declares which roles may see it,
enforced on the server, not just hidden in the menu · Italian and English text handling
from the start, with Italian as default · tests proving a wrong-role visitor is refused
even when typing the address directly.

**Done when:** the owner can log in as each role and watch the menu change; pasting a
forbidden page's address into the browser is refused, not merely hidden; the refusal is
covered by an automated test.

**Not in this step:** gyms · linking people to gyms · any business data · password
policies beyond a sane minimum · social login · two-factor.

---

## Step 3 — Tenant separation

**What it is:** the walls between companies. **The tenant is the company, not the gym** — a
company (a circuit) owns one or more gyms. The most important step in the project: a mistake
here is a catastrophe, not a bug.

**Build — and the order is part of the design, not a suggestion:**

1. **The restricted database account, before a single policy exists.** Not a superuser,
   without `BYPASSRLS`, owner of nothing. Migrations keep the privileged account.
   *Row-Level Security is silently ignored for superusers and for the owner of a table.*
   Build the walls while the application still connects as `postgres` and every test will
   pass while nothing whatsoever is protected.
2. **`dim_company` and `dim_gym`.** Every gym belongs to exactly one company. Every tenant
   table carries `company_id`, plus `gym_id` where the row belongs to one location.
3. **A minimal `bridge_membership`** — person, company, optional gym (null means the whole
   circuit), role, active. Only what the badge needs; its full shape arrives in Step 4.
   Without it there is no way to know that somebody is an owner of Company A.
4. **The badge.** Every request opens its transaction by setting company, optional gym,
   access level and person. Every database interaction therefore runs inside a transaction —
   which is also precisely what makes it safe when connections are shared: a badge cannot
   leak into another request's query.
5. **`ENABLE` *and* `FORCE ROW LEVEL SECURITY`** on every tenant table, with policies for the
   five access levels — platform admin, company, gym, worker, client.
6. **Configuration.** The company defines; a gym overrides **only** price and opening hours.
7. **A company/gym switcher for the platform admin**, and two demo companies — one of them
   with two gyms — seeded with obviously different data.

**Done when the five wall tests pass, run on the restricted account and written to fail if
the wall is fake:**

- (a) a company A badge issuing a raw query for company B's rows returns **nothing**
- (b) a gym-level badge cannot read sibling gyms of the **same** company
- (c) a client badge cannot read another client's rows in the same gym
- (d) with **no badge at all**, tenant tables return nothing
- (e) the application's own connection is provably **not** a superuser and cannot bypass
  Row-Level Security

**Not in this step:** lifecycle states, client detail, trainer detail,
`bridge_trainer_service`, the audit log or member screens — all Step 4 · services, prices or
any catalogue — Step 5 · the published layer beyond what the wall tests require · a settings
*screen* (the store is enough) · billing companies for using the platform.

---

## Step 4 — People, roles and lifecycle

**What it is:** connecting real humans to real companies and gyms, in full.

**Build:** `bridge_membership` grown to its complete shape — lifecycle state
(Lead → Starter → Client → Dormant/Churn) and since when; the member's level, package cap
and default trainer (this replaces `dim_client_profile`); the trainer's fields (this
replaces `bridge_gym_trainer`) · `dim_trainer_compensation`, dated — per-session (junior),
revenue share (senior), owner draw; **this is where seniority lives, and it changes what a
trainer earns, never what a client pays** ·
`fact_lifecycle_event` recording every state change with its date · **`person_role` reduced
to platform admin only** · deactivation rather than deletion for trainers, with history
preserved · **the full `audit_log`, switched on from here onward** — this is what makes
operational rows safe to update · a member list and a member detail page.

**Done when:** the owner can create a member, see them listed, open their profile, and watch
their state change from Lead to Starter with the change recorded and dated; the same person
can exist at two companies with different roles; a deactivated trainer disappears from
scheduling but keeps their history; and every one of those changes appears in the audit log.

**Not in this step:** the anamnesi and any health data — that needs the art. 9 consent
flow and is deliberately separate · `bridge_trainer_service`, which points at services and
so cannot exist before Step 5 · the automatic Lead → Starter → Client → Dormant machinery,
which needs purchases and consumption that do not exist yet — Step 4 records transitions,
it does not trigger them · credits · bookings · automations or emails.

---

## Step 5 — Catalogue: services, prices, packs and levels

**What it is:** what a gym sells, and for how much. All configuration, no logic.

**Build:** `service` (PT, mobility, osteopathy, BIA, water — each with its category, VAT
treatment, and whether it counts toward the weekly frequency discount) · `price_band`
(price per head by group size: 50 / 35 / 30 / 25 / 20) · `level` for future group
matching · `pack` (recharge SKUs: credits granted, cash price, resulting cash-per-credit,
validity in months) · `starter_product` (the €140 pack and its €84/person couple variant,
and exactly what each grants) · `discount_rule` (2 entries → −7%, 3 → −14%) · **everything
versioned with `valid_from` / `valid_to`**, so changing a price never rewrites history ·
editing screens for the owner · seed data for the founding studio.

**Done when:** the owner can open a price list, change the price of "PT in 3", save it,
and see both the new price and the old one with the date it stopped applying. Non-PT
prices are placeholders (mobility 15, osteopathy 40) and clearly marked as such.

**Not in this step:** charging anyone · the wallet · bookings · VAT calculation or any
fiscal document.

---

## Step 6 — The credit wallet as a ledger

**What it is:** the heart of the system. Get this wrong and everything downstream is wrong.

**Build:** `credit_batch` — every purchase as a dated lot carrying credits bought, cash
actually paid, the resulting cash-per-credit ratio, and its own expiry date (12 months
from that purchase, never extended by a later one) · `credit_movement` — the ledger:
purchase, consumption, expiry, refund, burn, correction; each with date, reason, service,
trainer, and who recorded it · **append-only**: corrections are new offsetting rows, never
edits · the balance is always the sum of the ledger, never a stored number · credits spent
oldest batch first · the current credit ratio calculated from the batches, never stored
and overwritten · `payment` recording cash in, on a separate line from revenue, always ·
the scheduled job that expires credits · the member's wallet page, reading like a bank
statement · the owner's page showing the three numbers that must never be conflated:
credits sold, credits consumed, credits outstanding.

**Done when:** the blueprint's example reproduces line by line — Pack M +600 → 600 · PT in
3 −30 → 570 · mobility −15 → 555 · osteopathy −40 → 515 · late cancellation −30 → 485 —
and the owner's page shows €200 of cash in, €24 of revenue and €176 still owed after a
member on a discounted pack spends 30 credits. Balances are allowed to go below zero, with
a warning.

**Not in this step:** booking · holds · check-in · the frequency discount · group pricing.

---

## Step 7 — Starter Pack entitlements

**What it is:** the €140 entry product, which is **not** credits.

**Build:** `entitlement_grant` and `entitlement_line` — a purchase grants 4 PT sessions +
one 30′ osteopath + one nutritionist evaluation as named, countable entitlements · a
drawdown mechanism that ticks them off one at a time and never touches the wallet · the
couple variant granting each person their own full set · the promotion rule: a Starter's
first credit recharge flips them to Client and opens their wallet · the alert at the third
of the four starter sessions, recorded as an event for now.

**Done when:** the owner can sell a Starter Pack, watch the four PT sessions count down as
they are used, confirm the member's wallet stays untouched and closed throughout, then
record a first recharge and watch the member become a Client with a live wallet.

**Not in this step:** sending any actual email or alert · ActiveCampaign or Botpress ·
booking screens — consuming an entitlement can be a button for now.

---

## Step 8 — Sessions, capacity and booking

**What it is:** the calendar, and the first half of the two-step money movement.

**Build:** `session` — trainer, service, level, start, end, maximum size, status ·
`booking` — who holds a place, when, and **the maximum price they were promised**, stored
permanently so the studio can always prove what the member was told · the hold: booking
writes a `hold` movement at the maximum price, which is **always the solo price** (50 cr
for PT), never the package price · available balance and held balance shown as two
separate figures · capacity enforced so a session cannot be overbooked, including when two
people book the same last place at the same instant · the trainer's calendar · the
member's booking screen, stating in plain words the most that session can cost and why.

**Done when:** the owner books a member into a group session, sees the balance split into
available and on-hold, sees the promised maximum written on the booking, and finds the
session refuses a seventh person in a six-person group.

**Not in this step:** check-in · charging · cancellation rules · the real-head calculation
· automatic level matching — assigning a member to a session by hand is correct for now.

---

## Step 9 — Check-in, cancellation and dynamic group pricing

**What it is:** the moment revenue is created, and the mechanic no off-the-shelf system
handles.

**Build:** trainer check-in from a phone · the real paying head = members present + late
cancellations · each present member charged the band of that real head · cancellation more
than 24 hours before the start releases the hold and returns the credits · cancellation
inside 24 hours burns the credits at that member's band, recognised as PT revenue tagged
`late_cancellation` · the hold converting cleanly into a charge with both movements
visible in the ledger · the member notified when a companion's cancellation changes their
estimate · no double charges and no wrong balances when several people act at once ·
`attendance` recording the real head, the band, and the credits charged.

**Done when:** all four blueprint scenarios produce the right numbers for a group of three
— all present → 30 each · one cancels in time → 35 each, canceller refunded · one cancels
late → 30 each, canceller's 30 burned · two cancel in time → 50 alone — and every one of
those movements is a readable line in the member's statement.

**Not in this step:** the weekly frequency discount · trainer compensation · performance
metrics.

---

## Step 10 — The weekly frequency discount

**What it is:** the automatic loyalty discount, applied retroactively across the week,
with nothing declared in advance.

**Build:** `frequency_entry` — one row per paid entry in a Monday–Sunday week (Europe/Rome),
with its position in the week and the discount applied · the charge formula at entry *n*:
`(sum of full prices of entries 1..n) × (1 − discount of band n) − (credits already charged
this week)` · PT, osteopathy and mobility all counting as entries · a late-cancelled but
paid session counting too · from the fourth entry, the same rate as the third · never a
negative charge · the Sunday-night reset as a scheduled job · two decimal places on credits
· a reversed session does **not** recalculate already-charged sessions in that week · the
member's screen showing why this session cost less than the last one.

**Done when:** the blueprint's week reproduces exactly — Monday 30.00, Wednesday 25.80,
Friday 21.60, total 77.40 instead of 90 — and it still holds when the group size changes
between sessions.

**Not in this step:** anything else. Stop here and review the whole foundation with the
owner before going further.

---

## After the ten steps

Not yet detailed, in rough order: automatic level matching from the anamnesi (needs the
art. 9 consent flow first) · the member PWA and notifications · lifecycle automations with
ActiveCampaign and Botpress · funnel diagnostics · trainer compensation and performance ·
the owner's full financial views.

Deferred by decision: subscriptions (rules still to be defined) · online payments ·
Italian e-invoicing and the multi-purpose-voucher VAT question.
