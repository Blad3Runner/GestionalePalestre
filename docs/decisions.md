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

---

*Resolved and moved into the decision log above: OQ-1 (credit cash ratio), OQ-2 (no expiry
reset on recharge), OQ-3 (no weekly recalculation).*
