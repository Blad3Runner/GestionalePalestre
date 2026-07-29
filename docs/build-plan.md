# Build plan

Agreed 2026-07-29. Build in this order. One step at a time: build it, explain it in
plain language, the owner reviews, then move on. Decisions live in
[decisions.md](decisions.md); the schema in [data-model.md](data-model.md).

---

## Step 1 — Project skeleton

**What it is:** the empty building with the plumbing connected. Project files,
PostgreSQL running locally, the migration mechanism that applies structural changes to
the database, the automated test runner, and one page that proves the app can reach the
database.

**Done when:** one command starts the app, a browser page reports "application running,
database connected", and the test suite runs and passes. No gym features yet.

## Step 2 — Login and roles

**What it is:** real accounts. Email-and-password sign in, sign out, password reset.
Five roles — platform admin, tenant owner, front desk/staff, trainer, member — with one
person able to hold several at once (Matteo is owner *and* trainer). Pages locked to
roles. Italian and English from the start.

**Done when:** you can log in as each role and watch the menu change; the financial page
is absent for a trainer, and pasting its address directly is refused. An automated test
covers that refusal.

## Step 3 — Tenant separation

**What it is:** the walls between gyms. A gyms table, a gym stamp on every piece of
business data, automatic filtering on every query, plus PostgreSQL Row-Level Security as
a second lock inside the database itself. Each gym gets a settings area — this is where
credit values, price bands, discount percentages and time windows live, so client
differences are always configuration.

**Done when:** two demo gyms exist side by side; logging in as one owner shows only that
gym; a deliberate attempt to reach the other gym's data — by direct address, and by a
test that bypasses the app and queries the database directly — returns nothing.

## Step 4 — Core data model

The biggest step, in four visible pieces.

**4a · Services and prices.** What a gym sells, each with its credit price and VAT
treatment, all as gym settings. Prices are versioned — changing a price must not rewrite
last year. *Done when:* an editable price list per gym, with history preserved after a
change.

**4b · The wallet as a ledger.** Purchases recorded as dated batches, each with its own
cash-per-credit ratio and its own expiry date (12 months, no extension on recharge).
Every movement — purchase, consumption, expiry, refund, burned late cancellation — is a
permanent line with a date, a reason, a linked service and a running balance. Never
edited; corrections are new offsetting lines. The balance is always the sum of the
ledger, never a stored number. Credits are spent oldest batch first. *Done when:* a
member's wallet page reads like a bank statement and reproduces the blueprint example
line by line (600 → 570 → 555 → 515 → 485), and an owner page shows the three numbers
that must never be confused: credits sold, credits consumed, credits outstanding.

**4c · Hold at booking, charge at check-in.** Booking places a hold at the maximum price
(always the solo price — 50 cr for PT). Check-in releases the hold and charges the real
price. Cancelling in time releases it; cancelling inside 24 hours burns it, recognised as
PT revenue tagged `late_cancellation`. Balances may go below zero. Built so that
simultaneous actions — a member booking while a trainer checks someone in — can never
produce a wrong balance or a double charge. Fixed prices at this stage; dynamic group
pricing and the frequency discount plug in afterwards. *Done when:* you book a session
and see "available" and "on hold" as separate figures, mark check-in and watch the hold
become a real charge with a new ledger line, then cancel another and watch the credits
return.

**4d · Starter Pack entitlements.** The €140 pack grants 4 PT sessions + 30′ osteopath +
nutritionist evaluation as named entitlements, not credits — the wallet stays closed
until the first recharge, which is what promotes a Starter to a Client. *Done when:* a
Starter's bookings tick down their entitlement without touching any wallet, and the first
recharge flips their state to Client and opens it.

---

## After the foundation

In rough order, not yet detailed: dynamic group pricing and the real-head calculation ·
the weekly frequency discount · levels and automatic group matching · trainer calendar
and mobile check-in · the member PWA · lifecycle states and automations · funnel
diagnostics · trainer compensation and performance.

Deferred by decision: subscriptions (rules to be defined), online payments, Italian
e-invoicing and the voucher VAT question.
