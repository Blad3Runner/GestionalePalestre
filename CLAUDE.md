# Gestionale Palestre

## How to work on this project — read this first

**This project is built one step at a time, from a written plan. Nothing is improvised.**

1. **Read [docs/build-plan.md](docs/build-plan.md) before doing anything else.** It
   contains ten numbered steps and a progress checklist.
2. **Do the first unchecked step. Only that step. Then stop.** Tick it off in the
   checklist, explain in plain language what you built and how the owner can try it, and
   end your turn. Do not start the next step — not even a small part of it, not even if
   the step you just finished took five minutes.
3. **Every step has a "Not in this step" list. It is binding.** If you find yourself
   wanting to build something on that list, you are in the wrong step.
4. **The architecture, the schema and the business rules are already decided.** They are
   in this file, in [docs/data-model.md](docs/data-model.md) and in
   [docs/decisions.md](docs/decisions.md). Read them and follow them. **Do not redesign
   them, do not "evaluate options", do not produce alternative schemas.** That work is
   finished.
5. **Work directly and sequentially. No subagents, no multi-agent workflows, no parallel
   research or design phases.** This project is small and fully specified; ordinary
   step-by-step work is the correct and expected approach. A previous session spent an
   hour and a million tokens on a design workflow that produced nothing — do not repeat it.
6. **If a decision you need is genuinely missing, stop and ask the owner.** Never assume,
   never invent a default, never pick "the sensible option" and carry on. Unresolved
   questions are listed at the end of [docs/decisions.md](docs/decisions.md) and at the
   end of [docs/features-credit-model.md](docs/features-credit-model.md).
7. **Record every decision in [docs/decisions.md](docs/decisions.md)** as it is taken,
   with the date and the reasoning.
8. **The project owner is not a developer.** Explain everything — choices, problems,
   progress — in simple, non-technical language, always.

### Documents

| File | What's in it |
| --- | --- |
| `CLAUDE.md` (this file) | Architecture and hard rules — the project constitution |
| [docs/build-plan.md](docs/build-plan.md) | The ten steps and the progress checklist |
| [docs/decisions.md](docs/decisions.md) | Every decision taken, dated, plus open questions |
| [docs/data-model.md](docs/data-model.md) | The agreed database shape |
| [docs/features-credit-model.md](docs/features-credit-model.md) | Full business spec of the founding tenant |

---

## What this is

A multi-tenant web platform for managing training businesses (gyms, personal training
studios). Around 20 client businesses ("tenants") initially, up to ~500 end customers
each; all roles use it through the browser. The founding tenant is a premium PT studio
with an advanced credit-based business model, fully specified in
/docs/features-credit-model.md — read that file before working on anything touching
credits, pricing, booking, check-in, or accounting. The project owner is not a developer:
explain technical choices and problems in simple, non-technical language.

## Core architecture — hard rules

- One shared application, one shared PostgreSQL database, one deployment. Never create
  per-client code copies, branches, builds, or deployments. Client differences are
  configuration, never code duplication.
- Every domain table carries a tenant_id. Every query is filtered by tenant. Tenant
  isolation is absolute; write automated tests that verify it.
- Roles: platform admin (the founders); within a tenant: owner, front desk/staff, trainer,
  member. Each trainer sees only their own agenda and clients. Financial data is visible
  to the tenant owner only.
- Full audit log on everything that moves credits or money: an internal currency is real
  money — every movement, refund, and correction must be traceable.
- Accounting rule, non-negotiable: a credit sold is a liability (deferred revenue), never
  revenue. Revenue is recognized only at consumption and attributed to the service
  delivered. Cash-in and revenue live on separate lines everywhere in the system.

## Modularity — first-class principle

Small core (tenants, users, roles, configuration, audit) plus self-contained modules, each
enabled per tenant through configuration with zero code changes:

- Business modules: subscriptions · credit wallet & ledger · bookings · check-in (QR +
  trainer mobile) · payments & fiscal documents.
- Advanced modules (built for the founding tenant, reusable for others): dynamic group
  pricing · level-based matching · frequency discount engine · lifecycle states &
  automations · funnel diagnostics · trainer compensation & performance.

When a client requests a capability that doesn't exist, it is built as a new module in the
shared codebase and switched on only for that tenant, without modifying unrelated modules.
All business parameters (credit prices, price bands, discount percentages, time windows,
thresholds) are tenant configuration.

### The permanent rules of modularity

**This modularity is the product's commercial edge. When a shortcut tempts you to violate
these rules because it is faster, stop and propose the compliant design instead.**

**M1 · One concept = one table, for all tenants.** A booking is a booking: any module that
creates bookings writes `fact_booking`. Shared concepts are never duplicated per module —
no `fact_booking_pt`, no `module_x_bookings`. This is what makes screens and reports work
across all gyms regardless of which modules produced the data.

**M2 · Module-private concepts live in the module's own side tables**, joined to the spine.
The **spine** is: person · gym/company · membership · payment · booking. Credit batches,
subscription periods and future things like drink orders are module-private and belong in
side tables hanging off the spine.

**M3 · Where new data lives — a test, applied case by case.**

- **(a) A COLUMN on the shared table** when it is a natural attribute of that concept,
  single-valued, and would make sense for any tenant even if only one uses it today —
  *"a booking has an internal note"*.
- **(b) A SIDE TABLE** when it is a cluster of fields with its own lifecycle, or
  one-to-many (several rows per spine row), or special-category data —
  *"a booking has drink orders"*.
- **(c) TENANT CUSTOM FIELDS** (the existing configuration mechanism) for one-tenant quirks
  that are pure attributes. This is the pressure valve that prevents both 300 tables and
  300 columns.

Structural changes to spine tables are proposed to the owner with the reasoning — one line
(*"column, because natural attribute"* / *"side table, because own lifecycle"*) — then
proceed on approval.

**M4 · Modules interact only through the spine.** No module reads or writes another
module's private tables.

**M5 · Replacing a core section for one tenant means building an alternative module** (for
example `booking-v2`) and switching that tenant to it. The default module and all other
tenants are untouched. Never fork or special-case the existing module.

**M6 · Activation is per-gym (or per-company) configuration.** A deactivated module is
invisible: no screens, no menu entries, no data.

## Business models — both native

Some tenants sell recurring memberships; others sell credits consumed via bookable
sessions; others combine both. Both are core from day one. Credits are a full ledger: hold
at booking, charge at check-in, expiry per policy, refunds — the displayed balance is
always real.

## Member-facing side

Responsive web app, installable as PWA. No native apps. Booking, wallet with full movement
history, QR/check-in. Hard UI principle (from the founding tenant, applied platform-wide):
the member must never discover a cost — they must understand it before. Every booking
screen states, in simple words, the maximum a session can cost and why; the real price
appears at check-in. Transparent language, never penalty-framed.

## Integrations

The platform is the single source of truth; external tools attach to it and never
duplicate data by hand: Botpress (lead intake), ActiveCampaign (email automations and
tags) via events/webhooks; a payment provider; Italian e-invoicing (fattura elettronica /
corrispettivi) for the fiscal module.

## Non-functional requirements

- Hosting and all data storage strictly in EU/EEA. HTTPS everywhere.
- GDPR: the platform operators act as data processors for each tenant (art. 28 DPA per
  client). The platform does store special-category health data where a tenant enables it
  (structured anamnesis: goal, strength level, mobility level, history, clinical flags;
  health questionnaires): explicit art. 9 consent flow, encryption, access limited to
  authorized roles, right to erasure. Legal review of this handling is mandatory before
  first go-live.
- Contracts and consents archived per client: signature with double subscription
  (artt. 1341–1342 c.c.), privacy, health questionnaire.
- Automated encrypted backups to a second EU provider, restore documented and tested —
  with credits, data loss is financial loss.
- Scale is modest (~10,000 end users); still write efficient queries and paginate
  everything.

## Out of scope

Native mobile apps; physical access hardware; non-EU hosting; any per-client code
versioning.

## Working style

Present a plan in plain language before significant changes. Record decisions in
/docs/decisions.md; keep this file updated. Detailed requirements:
/docs/features-credit-model.md (founding tenant), /docs/wireframes/ (UX, to come). Open
business decisions are listed at the end of the features doc — when a task depends on one,
ask, don't assume.

### Every step closes with an owner acceptance script

**A step is not done when the tests pass. It is done when the owner has been handed a
written acceptance script and can work through it himself.** The script is delivered
*before* the step is declared finished, and it contains four things.

**1 · A numbered click-through**, written for somebody who does not read code. Exact
actions — *"open `/desk`, sign in as `reception@example.com` / `Palestra2026!`, press
'Nuovo membro', type a name and an email, press Save"* — each with **the expected result
in plain words and what failure would look like**, so the owner can tell a working system
from a broken one without asking. Name the demo accounts to use.

**2 · The step's full "done when" table**, three columns: criterion · proven by (the name
of an automated test, or "owner script item *n*") · status, Yes or No. **No row may rest
on "trust me."** A criterion with an empty middle column is a criterion that is not met,
and the step stays open.

**3 · An invisible list** — what exists but has no screen yet, and is therefore proven
only by automated tests. That is what the owner is *trusting* rather than *verifying*, and
he is entitled to know exactly what is on it.

**4 · Business behaviour, not mechanics.** Exercise the awkward cases: the person who is a
trainer at one company and a member at another, a deactivated trainer whose history must
survive, a late cancellation, deliberately wrong input. A script that only walks the happy
path proves almost nothing.

**Most checks are performed from the LIMITED accounts** — owner, front desk, trainer,
member. The platform-admin account is for setup only. Walls and role-specific views are
verified **from below**: the proof that a trainer cannot see another gym is a trainer
trying and failing, not an administrator observing that they should not be able to.

Scripts live in `docs/acceptance/`, one per step, and are kept working as later steps
change the screens. A script that no longer matches the system is a defect.

### The test sandbox

The owner inspects the system **through the application, never through the database master
key**. If a fact cannot be reached through a screen or an automated test, it is not
verified — it is assumed. The demo world (`npm run db:seed`) carries a platform-admin
account for the owner, two companies of deliberately different shape, and every role
including a deactivated trainer; `npm run db:reset-demo` puts it all back to its starting
state so the owner can break things freely. Keep both working as the system grows.
