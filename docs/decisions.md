# Decisions

Every significant decision — technical or business — gets recorded here, with the
date, what was decided, and why. Nothing is decided until it appears in this file.

Format:

```
## YYYY-MM-DD — Short title
**Decision:** what was decided.
**Why:** the reasoning.
**Consequences:** what this now commits us to.
```

---

## 2026-07-29 — Technology stack (confirmed)

**Decision:** PostgreSQL (already decided by the owner) · TypeScript · Next.js (React) ·
Prisma · PostgreSQL Row-Level Security · Auth.js · Tailwind CSS + shadcn/ui ·
NUMERIC + decimal.js for money · pg-boss for scheduled jobs · Vitest + Playwright ·
Sentry (EU) · hosting on an EU provider (Scaleway or Hetzner), to be chosen later.

**Why:** all mainstream, heavily documented, hireable, and maintainable by a very small
team. One project that serves both the screens and the server logic, matching the
"one deployment" rule.

**Consequences:** no separate front-end/back-end projects; no vendor-specific cloud
services that would be painful to leave. Hosting choice is deferred until deployment.

---

## 2026-07-29 — Credit value and recharge tiers

**Decision:** 1 credit = 1 € as the nominal reference. Tenants can configure discounted
recharge packs where credits cost less than €1 (owner's examples: 250 cr for €200;
550 cr for €400). The blueprint's Pack S/M/L/XL table is an example, not a fixed list.

**Why:** maximum readability for the member, while preserving the prepaid-volume lever.

**Consequences:** a credit's **face value** (1 cr) and its **cash value** (what the member
actually paid for it) are two different numbers and must both be stored. Credits are
therefore tracked in dated purchase batches, each carrying its own cash-per-credit rate.
How revenue is recognised follows from this — see "Revenue recognition: the credit cash
ratio" below.

---

## 2026-07-29 — Negative balances allowed

**Decision:** a member's wallet may go below zero for now. Revisit later.

**Why:** check-in must never be blocked by arithmetic; the trainer's job is to record
what happened, not to police the balance.

**Consequences:** the system warns but does not refuse. A "members in debit" view will
be needed for the owner.

---

## 2026-07-29 — The Starter Pack is an entitlement, not credits

**Decision:** the €140 Starter Pack (4 PT sessions + 30′ osteopath + nutritionist
evaluation; couple variant €84/person) grants **specific named sessions**, not credits.
The wallet and the credit logic begin only afterwards, at the first recharge — which is
exactly what promotes a Starter to a Client.

**Why:** confirmed by the owner and by the blueprint (§04): "Client = prima ricarica di
crediti dopo lo starter".

**Consequences:** the system needs two parallel ways to consume a booking — a starter
entitlement drawdown and a credit charge. A Starter's bookings must not touch the wallet.

---

## 2026-07-29 — Late cancellation accounting

**Decision:** credits burned by a late cancellation are recognised as revenue against the
PT service, carrying a distinct `late_cancellation` tag.

**Why:** the hour was monetised even though nothing was delivered; the owner still needs
to see how much of PT revenue comes from cancellations rather than training.

**Consequences:** revenue-by-service reports must be able to show, and exclude, the
late-cancellation portion.

---

## 2026-07-29 — Credit expiry

**Decision:** default validity 12 months from purchase. Like every other number in the
system, this is tenant configuration, not a constant.

**Why:** owner's choice; turns purchase into habit without being aggressive.

**Consequences:** each credit batch carries its own expiry date. A new recharge does
**not** extend the life of older credits — they expire on their original date regardless
(owner, 2026-07-29). Combined with oldest-first consumption, this means a member who keeps
training never loses anything, while dormant credits do lapse on schedule.

---

## 2026-07-29 — The 24-hour rule

**Decision:** the window closes exactly 24 hours before the session's start time.
A session whose credits were burned by a late cancellation **does** count toward the
member's weekly frequency discount, because it was paid for.

**Why:** owner's decision; the member paid, so the member gets the loyalty credit for it.

**Consequences:** the frequency counter is driven by *paid* sessions, not by *attended*
sessions.

---

## 2026-07-29 — What counts toward the weekly frequency discount

**Decision:** PT, osteopathy and mobility all count as entries.

**Why:** owner's decision. **Note: this reverses the blueprint** (§03.8 and features doc
§5), which proposed excluding mobility and osteopathy. Recorded here deliberately so the
change is not mistaken for an error later.

**Consequences:** the frequency counter is not PT-only. See OQ-4 — whether these services
also *receive* the discount, or merely *count* toward it, is still open.

---

## 2026-07-29 — Frequency discount scale

**Decision:** −7% at 2 entries, −14% at 3, for now — tenant-configurable, as are all
pricing parameters. The current non-uniform paper list (individuale −4,2/−8,3 · coppia
−6,0/−11,9 · 3 persone −6,9/−13,9 · 4 persone −8,3/−16,7 · small group −6,3/−9,7) is
deliberately replaced by a clean uniform scale.

**Why:** simpler to communicate; the paper list is internally inconsistent (small group
5/6 discounts less than the 4-person band).

**Consequences:** some prices will shift slightly against the printed flyer. Accepted.

---

## 2026-07-29 — Maximum price shown at booking

**Decision:** always the solo price (50 cr for PT), regardless of the package the member
chose.

**Why:** it is the true worst case — if every companion cancels in time, the member
trains alone and pays the solo band. Confirmed by the owner and by the blueprint
("Sai però da subito il tuo massimo: il prezzo 'da solo'").

**Consequences:** the member is never surprised. The app promises the worst case and
almost always charges less.

---

## 2026-07-29 — Payments are recorded, not taken

**Decision:** version 1 records payments made elsewhere (cash, card at the desk, bank
transfer). No online payment processing, no instalments, no dunning.

**Why:** the payment provider and the fiscal treatment can wait; nothing else depends
on them.

**Consequences:** a payment provider can be added later without reworking the ledger,
because cash-in and revenue are already separate lines.

---

## 2026-07-29 — Non-PT credit prices are placeholders

**Decision:** mobility, osteopathy, BIA, water and merchandise get provisional credit
prices (mobility 15, osteopathy 40, from the blueprint's worked example). Real prices are
set later through the tenant settings screen.

**Why:** they are configuration, not structure — a five-minute adjustment once the app
exists.

---

## 2026-07-29 — Subscriptions are deferred, not dropped

**Decision:** recurring memberships (e.g. €55/month for unlimited entry) remain a core
part of the platform, but their rules are defined later. The database and module
boundaries are designed now so that adding them changes no existing module.

**Why:** owner's assessment — "this is just math, not a blocker".

**Consequences:** the schema reserves a place for subscription products and periods from
the start; the logic arrives later.

---

## 2026-07-29 — Access and languages

**Decision:** members log in with email and password, through the web app, installable
on a phone (PWA). Interface in Italian and English. One person may hold accounts at more
than one gym. The founding studio's front-desk role is held by the owner.

**Consequences:** a person is a single global identity, linked to each gym through a
bridge table that carries their role there — so the same person can be an owner at one
gym and a member at another.

---

## 2026-07-29 — Italian e-invoicing is deferred

**Decision:** fattura elettronica / corrispettivi, and the multi-purpose-voucher VAT
question, are out of scope until the core system works.

**Why:** owner's assessment. It remains blocking for the fiscal module specifically, and
requires the commercialista, so it is worth starting that conversation early even though
no code depends on it yet.

---

## 2026-07-29 — Database shape

**Decision:** the schema follows a dimensional style — reference ("dimension") tables for
the slow-moving things (gyms, people, services, price bands, levels, dates) and event
("fact") tables for everything that happens (credit movements, bookings, attendances,
payments), joined by surrogate primary keys. Bridge tables link Gym↔User and Gym↔Trainer.

**Why:** owner's instruction, and it fits unusually well: the credit ledger is already a
fact table by nature, so the reporting the owner needs falls out of the design instead of
being bolted on.

**Consequences:** see [data-model.md](data-model.md). Fact tables are append-only —
mistakes are corrected with a new offsetting row, never by editing history.

---

## 2026-07-29 — Revenue recognition: the credit cash ratio

**Decision:** a credit is worth what the member actually paid for it, not its €1 face
value. Buy 250 credits for €200 and each is worth €0.80; spend 30 and the studio has
earned €24, not €30. Every client therefore has a **current credit ratio** — the cash
value of the credits they currently hold.

**Why:** owner's decision. Any other treatment books income the studio never received,
and the debt owed to members never fully clears.

**Consequences:** the ratio is *shown* on the client record as the owner asked, but the
**underlying truth is stored per purchase batch**, and the ratio is calculated from those
batches rather than typed over. This is forced by the expiry rule already decided: since
credits expire 12 months from *their own* purchase date and are never extended, the system
must already know which credits came from which purchase. Once it knows that, the ratio
comes for free and stays correct even when a member holds two packs bought at different
rates. A single stored number, overwritten at each purchase, would silently revalue the
member's older credits — real money, quietly lost or invented.

---

## 2026-07-29 — A reversed session does not recalculate the week

**Decision:** if a session is undone after the fact (trainer ill, studio closed, check-in
recorded by mistake), already-charged sessions in that week stay as they are. Only
subsequent sessions use the corrected count. Revisit later if it causes real complaints.

**Why:** owner's decision — simpler, kinder to the member, and rare enough not to matter.

**Consequences:** a member can occasionally end a week having paid slightly less than the
strict formula would give. Accepted.

---

## 2026-07-29 — Infrastructure budget

**Decision:** the technology stack is confirmed, subject to recurring hosting costs
staying in the €30–50/month range.

**Consequences:** hosting will be a single EU provider with managed PostgreSQL rather than
a self-managed database — see the cost breakdown discussed 2026-07-29. Excluded from that
figure and to be budgeted separately when the time comes: transactional email above the
free tier, the e-invoicing provider, payment-processing fees, and the one-off legal and
commercialista reviews the project documents already require.

---

## 2026-07-29 — Local development database: PostgreSQL 18, installed natively

**Decision:** PostgreSQL 18.4 is installed directly on the owner's Windows machine as an
automatic background service, rather than run inside Docker. Database name
`gestionale_palestre`.

**Why:** owner's choice when asked. The machine had neither PostgreSQL nor Docker. A
native service starts with the computer and needs no thought day to day; Docker Desktop
is several gigabytes and has to be started before the app will work.

**Consequences:** the local database password lives only in `.env`, which is not
committed. It protects nothing but an empty local database and is unrelated to any
future production credential. Docker remains available later for the deployment work
without disturbing this.

---

## 2026-07-29 — Version pins forced by the toolchain

**Decision:** TypeScript is pinned to version 6, not 7. Prisma 7 is used with the
`@prisma/adapter-pg` driver adapter.

**Why:** neither was a free choice. Next.js 16 rejects TypeScript 7 outright — it needs a
compiler interface TypeScript 7 no longer provides, and the alternative was an
*experimental* Next.js flag, which is the wrong foundation for a system meant to be
maintained for years. Prisma 7 no longer connects to a database without a driver adapter.

**Consequences:** raising TypeScript to 7 must wait until Next.js supports it. Recorded so
the pin is not mistaken for carelessness and quietly "fixed" by a later session.

---

## 2026-07-29 — Known upstream security warnings, no action available

**Decision:** `npm audit` reports three high-severity advisories in `postcss` and `sharp`.
Both are Next.js's own bundled dependencies, not ours. No fix is accepted; the only
"fix" npm offers is downgrading Next.js from 16 to 9, which is absurd.

**Why:** no fixed release exists upstream yet. Neither package is reachable by our code —
they serve Next.js's build step and image handling.

**Consequences:** re-check on each Next.js upgrade. This must be resolved before the
system is exposed on the public internet.

---

## 2026-07-29 — ⚠ The application connects as a PostgreSQL superuser (must change in Step 3)

**Decision:** for Step 1 the application connects as the `postgres` superuser, because the
database is empty and no isolation rules exist yet.

**Why:** the simplest thing that proves the plumbing works, and Step 1's scope explicitly
excludes tenant separation.

**Consequences — this is a trap and must not be forgotten.** PostgreSQL Row-Level
Security, which Step 3 relies on as the second lock around each gym's data, **does not
apply to superusers, nor to the user that owns the table.** If Step 3 is built while the
application is still connecting as `postgres`, the isolation tests will appear to pass
while the lock is doing nothing at all. **Step 3 must therefore begin by creating a
separate, non-superuser application role** and pointing `DATABASE_URL` at it, keeping the
privileged account for migrations only.

---

## 2026-07-29 — Roles live on the person until gyms exist

**Decision:** Step 2 stores the five roles on the person, in a `person_role` table, not
scoped to any gym. `PLATFORM_ADMIN` is genuinely global — the founders belong to no gym.
The other four describe what somebody does *at a gym*.

**Why:** gyms do not exist until Step 3 and people are not linked to them until Step 4,
but login and route protection had to be built and tested now. Holding the roles at
platform level was the only way to do that without building Step 4 early.

**Consequences:** when Step 4 creates `bridge_gym_person`, the four gym-scoped roles move
there and `person_role` keeps only `PLATFORM_ADMIN`. The route policy in
`src/lib/auth/route-policy.ts` then gains a gym dimension. This is expected, not a
mistake to be discovered later.

---

## 2026-07-29 — Auth.js v5, sessions in a signed cookie

**Decision:** Auth.js version 5 with an email-and-password provider. The session lives in
a signed cookie rather than a database table, and lasts 8 hours.

**Why:** version 5 is the one built for the way this application is structured; version 4
predates it. Auth.js requires the cookie approach when signing in with a password rather
than through Google or Facebook. Version 5 is still labelled "beta" by its authors, but it
is what essentially every current Next.js application uses.

**Consequences:** the `AUTH_SECRET` value in `.env` signs those cookies. Anyone holding it
could forge a login, so the live server must use a different one. Signing out is
immediate, but changing somebody's roles only takes effect at their next sign-in — a
consequence of not storing sessions in the database. Acceptable now; revisit if roles ever
need to be revoked instantly.

---

## 2026-07-29 — Passwords hashed with bcrypt

**Decision:** bcrypt, work factor 12, minimum password length 10 characters.

**Why:** the long-standing, well-understood standard. The work factor makes each guess
slow enough that stolen hashes are impractical to crack.

**Consequences:** bcrypt silently ignores anything past 72 bytes, so the system rejects
longer passwords outright rather than letting two different long passwords become
interchangeable. Step 2's scope deliberately excludes any further password policy.

---

## 2026-07-29 — Italian and English held as dictionaries in the code

**Decision:** all interface text lives in `src/i18n/dictionaries.ts`, one entry per phrase
in both languages. Italian is the reference: the English version will not compile if it
omits a phrase or invents one. No translation library.

**Why:** the alternative libraries restructure every address in the application
(`/it/accedi`, `/en/signin`), which is a large commitment for a system whose screens are
not designed yet. A dictionary delivers what Step 2 asks for and can be swapped later
without touching the screens.

**Consequences:** the language shown follows, in order: the language saved on the account,
then the visitor's choice kept in a cookie, then Italian.

---

## 2026-07-30 — The tenant is the company, not the gym

**Decision:** a new `dim_company` sits above `dim_gym`. A company (a "circuit") owns one
or more gyms; every gym belongs to exactly one company. **For isolation purposes the
tenant is the company**, not the gym.

Roles attach either at company level — valid across all of that company's gyms — or at a
single gym. `person_role` shrinks to platform admin only, as already planned.

**Why:** owner's decision. A client business may run several locations; its owner must see
all of them, while a manager of one location must not see the others.

**Consequences:** replaces "every table carries `gym_id`" with **every tenant table carries
`company_id`**, plus `gym_id` where the row belongs to one location. Row-Level Security is
built around the company. This supersedes the earlier assumption that the gym was the
tenant.

---

## 2026-07-30 — Streamlining the model (the ledger design is untouchable)

**Decision:** `fact_credit_batch`, `fact_credit_movement`, `fact_payment`, `audit_log`,
`dim_anamnesi`, `dim_consent` and the dated price bands and discount rules are **unchanged**.
Everything else is consolidated:

1. **`dim_date` dropped.** The Monday–Sunday week is computed from timestamps.
2. **`fact_frequency_entry` dropped.** Week, position in the week and the discount applied
   become columns on the booking.
3. **`fact_attendance` merged into `fact_booking`.** A booking has a status —
   held / attended / cancelled / late_cancelled / no_show. Check-in fills the band price,
   the discount and the credits charged. The real paying head count is written on
   `fact_session` when the session closes.
4. **`dim_client_profile` merged** into the person–gym membership record.
5. **`bridge_gym_trainer` merged** into the same membership record.
   `dim_trainer_compensation` stays separate and dated.
6. **`dim_pack` + `dim_starter_product` → one `dim_product`** with a kind
   (credit pack / starter), the starter's contents held as structured data.
   **`fact_entitlement_grant` + `fact_entitlement_line` → one `fact_entitlement`**: one row
   per granted unit, carrying when it was consumed and by which booking.
7. **`dim_level` dropped as a table.** Level becomes a column; the permitted values live in
   the gym's configuration.

**Why:** owner's decision. The earlier design was warehouse-shaped, with more tables than
the business needs.

**Consequences:** roughly 28 designed tables become about 21. **`fact_credit_movement`
remains append-only and is the immutable record of money.** Bookings, by contrast, are
operational rows that change as the day unfolds; their history is preserved by `audit_log`,
not by forbidding updates.

---

## 2026-07-30 — One financial design for both kinds of gym

**Decision:**

1. `fact_payment` records **every** cash-in, with `cash_amount` **always** filled — for
   subscription gyms and credit gyms alike.
2. Credit gyms additionally record, per purchase, the credits granted and the resulting
   cash-per-credit ratio (€100 for 125 credits → €0.80 per credit). This lives on the
   credit batch.
3. The **credit-adjusted cash amount** (credits consumed × the ratio of the batch they came
   from; 50 consumed in that example → €40) is **always computed from the ledger.** It is a
   view or a measure, **never a stored column that gets updated.**
4. An owner can switch between the **total cash-in** view and the **credit-adjusted** view.
   Subscription gyms use the same mechanism with time elapsed in place of credits — an
   annual pass recognises its value month by month — so the toggle exists for every tenant.

**Why:** owner's decision. Cash received and value delivered are different numbers, and the
owner needs both without either being able to drift out of agreement with the facts.

**Consequences:** this is the accounting rule from CLAUDE.md made concrete and extended to
subscription gyms. The subscription half of point 4 cannot be built until subscription
rules are defined, which remains deferred.

---

## 2026-07-30 — Row-Level Security: five access levels

**Decision:** five levels of access.

| Level | Sees |
| --- | --- |
| 1 · Platform admin | Everything, across all companies |
| 2 · Company | All gyms of their own circuit |
| 3 · Gym | Owner-type access, restricted to a single gym |
| 4 · Worker (trainer, doctor, front desk) | Their gym only, **no financial data**; each trainer only their own agenda and clients |
| 5 · Client | **Only their own rows** — their wallet, bookings, payments, profile. Never anything gym-wide |

Implementation, strictly in this order:

6. **Before any policy is written:** create the restricted database account the application
   will use — not a superuser, without `BYPASSRLS`, and owner of nothing. Migrations keep
   using the privileged account.
7. Every request opens its transaction by setting a **badge** via `SET LOCAL`: company,
   optional gym, access level, person. Every tenant table gets `ENABLE` **and** `FORCE ROW
   LEVEL SECURITY`, with policies that match the badge.
8. `dim_person` is global and has no `company_id`. It is visible only through a membership
   in the badge's company or gym, or when it is one's own row. Platform admin overrides.
9. **Wall tests, run on the restricted account and designed to fail if the wall is fake:**
   (a) a company A badge issuing a raw query for company B's rows returns zero;
   (b) a gym-level badge cannot read sibling gyms of the same company;
   (c) a client badge cannot read another client's rows in the same gym;
   (d) with no badge at all, tenant tables return nothing;
   (e) an assertion that the application's connection is not a superuser and cannot bypass
   Row-Level Security.

**Why:** owner's decision. Test (e) exists because Row-Level Security is silently ignored
for superusers and for the owner of a table — without it, every other test could pass while
protecting nothing.

**Consequences:** every database interaction runs inside a transaction, because `SET LOCAL`
lasts only as long as one. This is also what makes the approach safe with connection
pooling: the badge cannot leak into another request's query.

---

## 2026-07-30 — Anti-warehouse rules (permanent)

**Decision:**

1. In [data-model.md](data-model.md), **every table is marked with the build step that
   creates it.** No table is created before its step needs it.
2. **No snapshot tables, no stored aggregates, no stored running totals.** Anything
   derivable — balances, adjusted amounts, KPIs — is computed from the facts. Fact tables
   grow only when a real event happens.
3. **If a future feature appears to need a new table, it is proposed to the owner first,
   with the reason.**

**Why:** owner's decision, and it prevents the drift that produced the earlier
warehouse-shaped design.

**Consequences:** a small number of stored values look like exceptions but are not. The
maximum price promised at booking, the band price and credits charged at check-in, the real
paying head count at session close, and the cash-per-credit ratio on a batch are all
**recorded evidence of what happened at a moment in time** — the studio must be able to
prove what the member was told and charged. They are never recalculated. A stored *balance*
would be a violation; a stored *receipt* is not.

---

## 2026-07-30 — Trainers and services: a real many-to-many, with price on the service side

**Decision:** `bridge_trainer_service` is created — a genuine many-to-many between a
trainer's membership row and the services they deliver. Services are configurable records
(PT, mobility, osteopathy, postural gymnastics, massage), and a worker's profile is tied to
what they deliver.

**Price does not go on that bridge.** Price is a property of **service + duration**, held on
the service side, as **rows** — `(service, duration, price)` — never as columns
`price_30 / price_60 / price_90`.

**Confirmed against the founding tenant's specification:** price does **not** vary with a
trainer's seniority. The spec prices PT purely by group size (solo 50 · in 2 → 35 · in 3 →
30 · in 4 → 25 · small group 20) with no trainer dimension, and puts seniority where it
belongs — in compensation: "per-session (junior), revenue share (senior), owner draw". A
senior osteopath therefore costs the client the same and earns more. That distinction
already lives in `dim_trainer_compensation`, dated.

**Why rows rather than columns:** a massage may sell only 60 and 90 minutes; osteopathy
sells 30 (the Starter Pack proves it). Rows let a 45-minute option be added as data,
without a database migration.

**Consequences:** `dim_price_band` becomes `dim_price`, keyed on service plus two optional
axes — group size *and* duration. PT rows set group size; osteopathy rows set duration; a
60-minute group mobility class sets both. Still dated with `valid_from` / `valid_to`;
changing a price never rewrites history. If seniority-based pricing is ever wanted, it is a
separate table and a separate decision — not a column added here.

---

## 2026-07-30 — Check-in is a state transition; the system writes the money

**Decision:** at check-in the trainer writes **one field**: the booking moves from held to
attended. The trainer does **not** enter a financial value. The credit charge is a
server-side consequence, computed from the session's service and duration, which are
already fixed. The ledger entry is written by the system under its own authority.

Whether a trainer *reads* the session's credit cost is a product choice and is harmless —
prices are not confidential and the client already sees them at booking. What stays closed
to workers: **wallet balances, payment records, revenue, and anything about clients other
than the one in front of them.**

When check-in cannot proceed because the client is short of credits, the system returns
**"blocked — insufficient credits" without ever exposing the balance.**

**Why:** owner's correction. It dissolves the apparent conflict between "trainers do
check-in" and "workers see no financial data" — the trainer never handles the number.

**Consequences, and they are neat.** PostgreSQL allows different Row-Level Security rules
per operation, so a worker's badge can be granted **INSERT on `fact_credit_movement` with no
SELECT at all**: they can cause a ledger entry to exist without ever being able to read one.
The sufficiency check runs in a function with elevated rights that returns only
sufficient/insufficient — never the figure. No general-purpose privileged escape hatch is
needed anywhere.

---

## 2026-07-30 — Clients see a published layer, not a list of exceptions

**Decision:** a client may read **their own gym's published catalogue** — services, prices,
schedule, trainer public profiles, gym details — **plus their own rows, and nothing else.**

**Why:** owner's correction. Carving out "bookable sessions" alone would have hit the same
wall immediately for services, prices and trainer profiles: a client cannot book from a
schedule when they cannot see what the sessions are. One rule replaces a list of exceptions
that would only have grown.

**Consequences:** the published layer is built as a set of **read-only views**, which also
settles a problem that would otherwise have needed column-by-column permissions. A trainer's
public profile — name, photo, biography, services delivered — is a view over the membership
record; their compensation and private details sit in the same table and are simply not in
the view. Adding something to the published layer becomes a deliberate act: putting it in a
view.

---

## 2026-07-30 — Configuration: company defines, gym overrides — but only where it varies

**Decision:** the company defines the service catalogue; a gym may override **price** and
**opening hours**. A company owner automatically receives gym-level access to every gym in
their circuit.

**Only fields that genuinely vary by location are overridable, and they are a short explicit
list — not a general override mechanism.**

**Why:** owner's decision. It is exactly the circuit-with-different-pricing case. The
restraint matters: every overridable field costs resolution logic in the code and a
permanent "is this inherited or set here?" question in every screen that touches it. Most
configuration does not vary by location and must not be made to look as though it might.
On access: the alternative is an owner who cannot see their own schedule.

**Consequences:** adding a field to the overridable list is a decision to be taken
explicitly, with the same scrutiny as adding a table.

---

## 2026-07-30 — Email provider: Resend (resolves OQ-7)

**Decision:** Resend sends transactional email. The free tier more than covers password
resets at these volumes.

**Why:** owner's decision, taken deliberately quickly — simple to wire, and because every
message already passes through the single unconnected `src/lib/email.ts`, swapping provider
later costs almost nothing. Not a decision worth more than ten minutes.

**Consequences:** `RESEND_API_KEY` and `EMAIL_FROM` join the environment configuration.
**Without a key the system still logs the message to the terminal instead of sending it**, so
development and tests never depend on an external service or on network access. The owner
must create the Resend account and paste the key into `.env` — no account is created on
their behalf.

**Still outstanding before real clients use this:** Resend is US-headquartered. The project
requires EU/EEA data storage, so before go-live either confirm Resend's EU region and sign a
data-processing agreement, or move to an EU provider. Password-reset emails contain a name
and an email address, which is personal data. This is a go-live item, not a build blocker.

---

## 2026-07-30 — `bridge_membership` moves into Step 3, in minimal form

**Decision:** a minimal `bridge_membership` — person, company, optional gym, role, active —
is created in **Step 3**, not Step 4. Step 4 grows it to its full shape.

**Why:** forced by the design, not chosen. The badge carries the access level, and there is
no way to know that somebody is an owner of Company A without a row saying so. Step 3
without membership could set a badge but could never *justify* one. Rule E1 says every table
is marked with the step that needs it — and Step 3 genuinely needs this one.

**Consequences:** the split is deliberate and narrow.

- **Step 3 gets only what the badge requires:** who, which company, which gym if any, which
  role, still active.
- **Step 4 adds everything else:** lifecycle state, level, package cap, default trainer,
  trainer fields, `bridge_trainer_service`, joined and left dates, `fact_lifecycle_event`,
  `audit_log`, and the member screens.

This is a sequencing consequence of the owner's own design rather than a new decision about
the model. It is recorded here so it is visible and can be objected to.

**APPROVED by the owner on 2026-08-22.** The split stands as built: Step 3 took only
what the badge required, Step 4 grew the rest. No objection raised, and the table is now
load-bearing for every screen in the system.

---

## 2026-07-30 — ⚠ The database owns the clock (a real bug, found and fixed)

**What happened:** every timestamp written by the application landed **two hours adrift** —
exactly the local UTC offset — while every timestamp PostgreSQL wrote itself was correct.
Two rows created in the same transaction disagreed about when "now" was: the audit entry
said 14:34 UTC, the lifecycle entry said 12:34 UTC.

**Why it matters far more than it looks.** Credits expire twelve months from purchase.
Cancelling is free until exactly 24 hours before a session and costs the full price a
minute later. The frequency discount depends on which Monday–Sunday week a session falls
in. A two-hour error moves a cancellation across the line, moves a session into the wrong
week, and expires credits on the wrong day. That is money, not cosmetics — and it would
have been almost invisible until someone disputed a charge.

**Decision:** the application never generates a timestamp. Every timestamp column is filled
by PostgreSQL — `@default(dbgenerated("CURRENT_TIMESTAMP"))` instead of `@default(now())`,
and a database trigger instead of Prisma's `@updatedAt`.

**Why this rather than fixing the conversion:** there is now exactly **one clock**, and it
is the one the ledger, the expiry job and the weekly reset will all read. Making the
application's clock agree would have left two clocks that merely happened to agree.

**Consequences:** `src/lib/db.clock.test.ts` fails if anybody hands the clock back — it
checks that every timestamp column has a database default, that the `updated_at` triggers
exist, and that two rows written in one transaction agree with each other and with the
database. Found before any money code existed, which is the cheapest possible moment.

---

## 2026-07-30 — Audit entries for a person are visible to the platform only

**Decision:** the audit trail attributes each entry to a company. Changes to `dim_person` —
a name, a phone number — have no company, because a person can belong to several, so those
entries are visible to platform admins only. A gym owner sees every change to memberships,
lifecycle and compensation in their own company, but not the edit to a member's phone
number.

**Why:** attributing a person's record to one company would be wrong when they belong to
two, and showing it to both would leak the existence of the other.

**Consequences:** accepted for now, and visible on the member page, where the change log
lists membership changes but not personal-detail changes. If owners need the latter, the
answer is a per-company "contact detail" record rather than weakening the rule.

---

## 2026-07-30 — The permanent rules of modularity

**Decision:** six rules, now written into [CLAUDE.md](../CLAUDE.md) as hard rules.

1. **One concept = one table, for all tenants.** A booking is a booking: any module that
   creates bookings writes `fact_booking`. Shared concepts are never duplicated per module.
2. **Module-private concepts** — credit batches, subscription periods, future things like
   drink orders — **live in the module's own side tables**, joined to the spine:
   person · gym/company · membership · payment · booking.
3. **Where new data lives — a test, applied case by case.** (a) A **column** on the shared
   table when it is a natural attribute of that concept, single-valued, and would make sense
   for any tenant even if only one uses it today ("a booking has an internal note").
   (b) A **side table** when it is a cluster of fields with its own lifecycle, or one-to-many,
   or special-category data ("a booking has drink orders"). (c) **Tenant custom fields** —
   the existing configuration mechanism — for one-tenant quirks that are pure attributes.
   Structural changes to spine tables are proposed to the owner with the reasoning, one line,
   then proceed on approval.
4. **Modules interact only through the spine.** No module reads or writes another module's
   private tables.
5. **Replacing a core section for one tenant means building an alternative module**
   (e.g. `booking-v2`) and switching that tenant to it. The default module and all other
   tenants are untouched.
6. **Activation is per-gym (or per-company) configuration.** A deactivated module is
   invisible: no screens, no menu entries, no data.

**Why:** owner's decision. This modularity is the product's commercial edge — the ability to
sell a capability to one client and switch it on without touching anyone else, and to keep
selling reports that work across every client whatever they have enabled. Rule 1 is what
makes those reports possible: the moment a module invents its own booking table, every screen
and every report has to learn about it, and the platform quietly becomes twenty platforms.
Rule 3 exists because the two obvious failure modes are equal and opposite — a table per
quirk, or a column per quirk — and the custom-field mechanism is the release valve for both.

**Consequences:** when a shortcut is faster but breaks these rules, the compliant design is
proposed instead — that is now binding, not advisory. Rule 3 also formalises how rule E3 of
the anti-warehouse decision (2026-07-30) is applied: *whether* a new structure is justified
is that decision; *what shape* it takes is this one. Rule 5 is the only sanctioned way to
diverge for a single tenant, and it stays inside the "no per-client code versioning" rule
because the alternative module lives in the same shared codebase and is available to
everyone.

---

## 2026-08-22 — The test sandbox: the owner verifies through the app, never through the database

**Decision:** the project keeps a permanent, resettable demo world, and the owner inspects
the system through it using ordinary accounts. Four parts:

1. **A platform-admin account for the owner** — `admin@example.com`. Full visibility
   through the application. The database master key is never a way for the owner to check
   something: if a fact cannot be reached through a screen or an automated test, it is not
   verified, it is assumed.
2. **Demo data with two companies of deliberately different shape** — one single-gym
   credit-based studio (Studio Seregno, the founding tenant), one multi-gym
   subscription-based circuit (Circuito Nord). Each carries an owner, a front desk, two
   trainers of whom one is deactivated, and members spread across the lifecycle states,
   plus the person who is a trainer at one company and a member at the other. Every
   account and its password is listed at the top of the seed script.
3. **Screens for creating a company, a gym and a person in any role**, so the owner can
   build a new tenant by hand rather than by editing a script.
4. **One command that resets the demo world** — `npm run db:reset-demo` — so the owner can
   break anything freely and get back to a known state.

**Why:** owner's decision, and it closes a gap this session exposed. Step 4 was declared
done on the strength of 220 passing tests, but three of its five "done when" criteria had
no test at all, and the owner had no way to check for himself — the only route to the data
was the master key, which is exactly the account the tenant walls do not apply to. A
sandbox the owner drives through the front door is the only honest way for a non-developer
to confirm the system does what it claims.

**Consequences:**

- The demo world is part of the product's tooling, not a scratch file. It is maintained as
  the system grows, and every step adds whatever fixtures its acceptance script needs.
- `npm run db:reset-demo` deletes all domain data and re-seeds. It refuses to run against
  anything but a local database, because the same command pointed at production would be a
  catastrophe.
- **The business model of each demo company (credits / subscriptions) is recorded as a
  label in company settings, not as behaviour.** Neither module exists yet — credits arrive
  in Step 6, subscriptions are deferred entirely. The label exists so the sandbox has the
  two shapes the owner asked for and so the screens have something to display. **It is not
  the module-activation mechanism**, which is still to be designed; when that arrives, this
  label is replaced by it rather than grown into it.
- Creating another platform admin is deliberately **not** a screen. The application has no
  INSERT privilege on `person_role`, so it cannot mint a founder even if asked. Founders are
  created by the seed, with the privileged account. This is on the invisible list on
  purpose.

---

## 2026-08-22 — Every step closes with an owner acceptance script

**Decision:** a step is not done when the tests pass. It is done when the owner has been
handed a written acceptance script and can work through it himself. The script is delivered
**before** the step is declared finished, and it contains four things:

1. **A numbered click-through**, written for somebody who does not read code. Exact
   actions — *"open /desk, sign in as `reception@example.com` / `Palestra2026!`, press
   'Nuovo membro', type a name and an email, press Save"* — each with the expected result
   in plain words **and what failure would look like**, so the owner can tell a working
   system from a broken one without asking. The demo accounts to use are named in the step.
2. **The step's full "done when" table**, three columns: criterion / proven by (the name of
   an automated test, or "owner script item *n*") / status, Yes or No. **No row may rest on
   "trust me."** A criterion with nothing in the middle column is a criterion that is not
   met, and the step is not done.
3. **An invisible list**: what exists but has no screen yet, and is therefore proven only by
   automated tests. This is what the owner is *trusting* rather than *verifying*, and he is
   entitled to know exactly what is on it.
4. **Business behaviour, not mechanics.** The script exercises the awkward cases — the
   person who is a trainer at one company and a member at another, a deactivated trainer
   whose history must survive, a late cancellation, deliberately wrong input — because those
   are where a system is actually wrong. A script that only walks the happy path proves
   almost nothing.

**Most checks are performed from the limited accounts** — owner, front desk, trainer,
member. The platform-admin account is for setup only. Walls and role-specific views are
verified **from below**: the proof that a trainer cannot see another gym is a trainer trying
and failing, not an administrator observing that they should not be able to.

**Why:** owner's decision. The project's rule has always been that every step ends with
something the owner can see or try, but "here is what I built" was being delivered as prose
rather than as a procedure, and prose cannot be failed. A numbered script with expected
results is falsifiable: the owner either sees what it says or he does not. It also forces
the honest question at the end of every step — *which of these criteria can I actually
demonstrate?* — which is precisely the question that went unasked when Step 4 was declared
done.

**Consequences:**

- Acceptance scripts live in `docs/acceptance/`, one per step, and are kept working as later
  steps change the screens. A script that no longer matches the system is a defect.
- Writing the script is part of the step, not an afterthought. If a criterion cannot be
  demonstrated from a limited account, that is discovered while there is still time to build
  the screen — or it goes on the invisible list with the reason stated.
- The "done when" table is the step's contract. It is re-issued at the end of the step with
  every row filled in, and a row at No means the step stays open.

---

## 2026-08-22 — What the owner's first acceptance run found

The owner worked through `docs/acceptance/steps-1-4.md` and reported eight things. Two were
defects in the script rather than in the system; four were real warts on screen; one was a
genuine gap; one was a naming problem serious enough to fix everywhere. All are dealt with
here.

**Company and gym names can never overlap again.** The demo world had a company called
*Studio Seregno* whose only gym was also called *Seregno*, in a circuit whose gyms were
Monza and Como. Reading a dropdown, there was no way to tell which word meant the business
and which meant the building. On the owner's instruction the two are now kept in separate
vocabularies: **a company name never contains a city, and a gym name is only ever a city.**

- **Studio Corpo Libero** — one gym, **Milano**. Sells credits. The founding tenant.
- **Circuito Nord** — two gyms, **Bologna** and **Torino**. Sells subscriptions.

Two tests in `demo-world.test.ts` now fail if a company is ever given a name containing one
of its own gyms, or if two gyms share a name.

**The platform admin's location list no longer repeats itself.** It offered both
"the whole company" and "its only gym" for a single-gym company — the same thing twice,
which reads as a bug rather than as precision. The circuit-wide entry is now offered only
where there is genuinely a circuit to stand above.

**The "Cambia sede" label is visible.** It existed only for screen readers, so the owner saw
a bare dropdown with nothing saying what it was for.

**The member list now says where it is looking.** It read "Le persone iscritte in questa
sede" — *at this location* — even for a company-level owner who was in fact seeing every
location at once. It now distinguishes the two.

**A person created by the platform admin has no password, and the screen now says so.** This
was correct behaviour reported as a bug, because nothing on screen explained it. Worth
recording precisely, because it bites in the sandbox: every demo address ends in
`@example.com`, and **Resend refuses those outright** ("please use our testing email address
instead of domains like example.com"). The reset link therefore never arrives by email — it
falls back to being printed in the terminal running `npm run dev`, which is where the owner
must look. That is workable but poor, and is now open question **OQ-11**.

**Two corrections to the script itself, which was wrong rather than the system.** It promised
a location switcher to the owner of the whole circuit — who has exactly one scope and
therefore gets none — and it described the gym name as a heading when it was a phrase at the
end of a sentence. The script had been written partly from the tests rather than entirely
from the screen. Both fixed, and the remaining items were re-walked in a browser before
being rewritten.

**Consequence for how acceptance scripts are written:** every expected result must be
observed on the screen it describes, not inferred from a passing test. A test proves the
system does something; only looking proves the owner can see it.

---

## 2026-08-22 — OQ-10 answered: narrowing to one gym is a FILTER, not a demotion

**Decision:** somebody who holds a role over a whole company can narrow what they are
looking at to a single gym. The owner's words settle the design: *"it's fundamentally a
filter, but to someone trying to track the status of a gym in terms of bookings and trainer
appointments, seeing all other gyms is noise."*

**That word decides the implementation.** A filter changes what is **shown**. It does not
change who you **are**.

- The badge is untouched. A company owner filtering to Bologna is still the company owner,
  with company-level reach. Narrowing the view must never quietly narrow authority, or
  tidying your screen would cost you access to your own business.
- Because the badge is unchanged, the filter can only ever **subtract**. Row-Level Security
  still applies underneath: filtering by a gym belonging to somebody else returns nothing,
  which is tested.
- The choice lives in the address (`?sede=…`), so it survives a refresh and can be
  bookmarked — a person watching one location all morning should not have to re-choose it.
- It appears only when there is a genuine choice: two or more gyms in view. One gym is not
  a choice.

**Why not the alternative.** The obvious other design is to add gym entries to the location
switcher, which would hand the person a gym-level badge. That is *safe* — a narrower badge
than they already hold — but it is wrong. They would silently lose sight of company-wide
rows while "just looking at one gym", and would have no way to understand why. Two controls
that look alike must not mean different things: the switcher answers *who am I here*, the
filter answers *what am I looking at*.

**Consequences:** built on the member list, which is the only list that exists today. The
same filter is what bookings, trainer calendars and takings will use from Step 8 onward —
that is the use the owner actually described.

---

## 2026-08-22 — OQ-11 answered: a single-use link, shown once, on screen

**Decision:** when the platform admin creates a person, the screen shows a **single-use,
one-hour link** that lets that person choose their own password. Option two of the three
offered.

**Why this and not the others.** Leaving it as it was meant hunting through terminal output,
because no demo address can receive email. Letting the admin type an initial password was
the weakest of the three: it puts a real, working password in a second pair of hands, and
"nobody ever knows another person's password" is a rule worth keeping absolute.

The link is the ordinary reset machinery, unchanged — same one hour, same single use, and
only the *hash* of the token is stored, so a stolen backup is still worthless.

**Why it is not an escalation.** The link is minted only for an account created a moment
earlier by the person now holding it. An email that already belongs to somebody is refused
before any link exists, so this screen can never produce a way into an existing account —
which is tested explicitly.

**Consequences:** the note on the form now explains all of this. If the link is lost, the
person uses "Password dimenticata" as before; nothing depends on the link surviving.

---

## 2026-08-22 — ⚠ The forgotten-password flow had never worked

**What happened:** building the link above uncovered that "Password dimenticata" was broken
from Step 2 until today, in two separate ways, neither of which any test could see.

**One — the wrong Prisma call.** Every write went through `$queryRaw` to an `app.auth_*`
function that returns `void`. Prisma tries to deserialize a result set that does not exist
and throws. Requesting a reset threw; completing one would have thrown too.

**Two — the clock again.** `expires_at` was computed in the application as "now plus an
hour" and sent as a parameter. Measured against the database clock it landed **an hour in
the past**: a two-hour shift, the same drift removed from everything else on 2026-07-30.
Every token was born expired.

**Why neither was caught.** The password-reset tests covered token hashing and password
rules — pure calculations that never touch the database. And the second bug was invisible
even in principle, because the application then compared `expires_at` against its *own*
clock, which drifts identically. Wrong twice, consistently, and therefore self-consistent.
`expires_at` also escaped the clock guard by its nature: it is a *future* timestamp, so it
can never have a database DEFAULT for that test to check.

**The fix, in the shape the project already decided.** The application no longer has an
opinion about time. `auth_create_reset_token` now takes a **lifetime**, not a moment, and
adds it to its own `now()`. `auth_find_reset_token` returns `still_valid` — the verdict, not
the evidence — so nothing is ever recomputed against a second clock. There is no longer a
signature through which a wrong "now" could be expressed.

**And the missing test now exists.** `password-reset.db.test.ts` runs the whole journey
against the real database: ask for a link, follow it, set a new password, confirm the old
one stops working, confirm the link dies after one use and takes every other outstanding
link with it. Two more in `db.clock.test.ts` fail if a token is ever given the wrong
lifetime or judged by the wrong clock.

**The lesson, stated plainly, because it is the third time:** testing the parts is not
testing the thing. Every one of these bugs sat behind a green suite.

---

# Open questions

Numbered so they can be answered by reference. Nothing that depends on these gets built.

**OQ-4 · Do osteopathy and mobility *receive* the frequency discount, or only *count*
toward it?** Both now count as entries. Separate question: if the week's third entry is an
osteopathy session, is the osteopathy charge itself discounted by 14%? **Parked by the
owner** — a detail to settle when the pricing engine is actually built, not before.

**OQ-5 · Rounding.** Proceeding with two decimal places on credits (27.90 cr) unless
told otherwise, matching how euros behave.

**OQ-6 · The couple Starter Pack.** €84/person — two separate people, each with their own
4 PT sessions, osteopath and nutritionist evaluation. Proceeding on that reading.

**OQ-8 · How long is "no consumption" before somebody is Dormant?** The specification says
Dormant means "no consumption for N weeks / idle balance", and **N was never chosen**.
Churn is named in the state list but never defined at all. Not blocking: consumption does
not exist until Step 6, so the rule cannot run yet, and Step 4 records these transitions
by hand. Needs answering before the dormancy job is built.

**OQ-9 · Which hat should somebody land on when they hold more than one?** Found on
2026-08-22 while writing the acceptance script. `titolare@example.com` is both the owner of
Studio Seregno and a trainer there. On signing in he lands on **whichever membership the
database happens to return first** — in practice the trainer one, which means the owner of
the business sees a trainer's menu and is refused his own front desk until he uses the
location switcher.

Nothing is insecure: both roles are genuinely his, and the switcher works. But the landing
place is **arbitrary**, which is a poor thing for it to be. Three plausible answers: land on
the **strongest** role held; land on the **most recently used** place, remembered per person;
or **ask** on first sign-in. Needs deciding before real owners use the system daily — it is
the first thing they will see every morning.

*(OQ-7 was answered on 2026-07-30: **Resend**. OQ-10 (narrowing to one gym) and OQ-11
(first passwords) were answered on 2026-08-22. All three are in the decision log above.)*

---

*Resolved and moved into the decision log above: OQ-1 (credit cash ratio), OQ-2 (no expiry
reset on recharge), OQ-3 (no weekly recalculation).*
