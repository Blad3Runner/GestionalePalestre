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

*(OQ-7, the email provider, was answered on 2026-07-30: **Resend**. See the decision above.)*

---

*Resolved and moved into the decision log above: OQ-1 (credit cash ratio), OQ-2 (no expiry
reset on recharge), OQ-3 (no weekly recalculation).*
