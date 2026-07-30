# Gestionale Palestre

A multi-tenant web platform for managing training businesses — gyms and personal
training studios. One shared application, one shared database, one deployment.
Every client business ("tenant") runs on the same code; their differences are
configuration, never separate copies of the software.

Scale target: ~20 tenants, up to ~500 members each (~10,000 people total).

## What makes it different

The founding tenant is a premium personal-training studio that sells **credits**
instead of fixed packages. A member buys credits and spends them freely across
services. The wallet is a full ledger: every movement is dated and explained,
credits are *held* when a session is booked and actually *charged* at check-in,
so the balance a member sees is always real.

The platform also supports classic recurring memberships. Both models are core.

## Non-negotiable rules

- **Tenant isolation is absolute.** Every domain table carries a tenant id, every
  query is filtered by tenant, and automated tests verify it.
- **A credit sold is a liability, not revenue.** Revenue is recognised only when a
  credit is consumed, attributed to the service delivered. Cash-in and revenue are
  always shown on separate lines.
- **Everything that moves credits or money is audit-logged.** An internal currency
  is real money.
- **The member never discovers a cost.** Every booking screen states, in plain
  words, the maximum a session can cost and why, before the member commits.
- **EU/EEA hosting and storage only**, HTTPS everywhere, GDPR by design — the
  platform stores health data (structured anamnesis) where a tenant enables it.

## Documentation

| File | What's in it |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Architecture and hard rules — the project constitution |
| [docs/build-plan.md](docs/build-plan.md) | The ten build steps and the progress checklist |
| [docs/decisions.md](docs/decisions.md) | Log of every decision taken, with reasoning |
| [docs/data-model.md](docs/data-model.md) | The agreed database shape |
| [docs/features-credit-model.md](docs/features-credit-model.md) | Full business specification of the founding tenant |

## Running it

You need [Node.js](https://nodejs.org) 20 or newer and PostgreSQL 16 or newer.
On this machine both are already installed — PostgreSQL 18 runs automatically as a
Windows background service, so there is nothing to start by hand.

**First time only**, after downloading the code onto a new computer:

```bash
npm install
```

Then copy `.env.example` to a file called `.env` and fill it in. `.env` is never committed
— it is the one file that holds secrets. Then create the restricted database account the
application runs as:

```bash
npm run db:setup-roles
```

This matters more than it looks. The application deliberately connects with an account
that is **not** a database superuser and **cannot** bypass the walls between companies —
because PostgreSQL ignores those walls entirely for superusers. Migrations use a second,
privileged account. Both are set in `.env`.

### The three commands you need

**Start the application:**

```bash
npm run dev
```

Then open <http://localhost:3000> in a browser. Press `Ctrl+C` in the terminal to stop it.

**Check everything is healthy** — open <http://localhost:3000/health> while the app is
running. It should say *"Application running"* and *"Database connected"* with the
PostgreSQL version. If the database is unreachable it says so plainly and shows the
reason, instead of showing a broken page.

**Run the tests:**

```bash
npm test
```

### Logging in

Run this once to create the demo accounts:

```bash
npm run db:seed
```

All of them use the password `Palestra2026!`. They exist only on your computer.

There are **two demo companies**: *Studio Seregno* with one gym, and *Circuito Nord* with
two (Monza and Como).

| Email | Who they are | What they can see |
| --- | --- | --- |
| `admin@example.com` | Platform admin | Everything, across both companies |
| `titolare@example.com` | Owner **and** trainer at Studio Seregno | The whole company |
| `reception@example.com` | Front desk at Seregno | That gym |
| `trainer@example.com` | Trainer at Seregno *(in English)* | That gym |
| `cliente@example.com` | Member at Seregno | Only their own things |
| `cliente2@example.com` | A second member at the same gym | Only their own things |
| `nord@example.com` | Owner of the whole Circuito Nord | Both Monza and Como |
| `monza@example.com` | Owner of **Monza only** | Monza — never Como |

Two things worth trying by hand:

- Sign in as `cliente@example.com` and type <http://localhost:3000/admin> into the address
  bar. You will be refused, not merely shown an empty menu.
- Sign in as `monza@example.com` and note that Como does not exist as far as they are
  concerned — not hidden, genuinely unreachable, enforced by the database itself.

**Password reset does not send email yet.** No email service has been chosen (see OQ-7 in
[docs/decisions.md](docs/decisions.md)). Until one is, the reset link is printed in the
terminal window where `npm run dev` is running.

### Occasionally useful

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Applies any pending database changes |
| `npm run db:seed` | Recreates the demo accounts above |
| `npm run db:studio` | Opens a visual browser for the database contents |
| `npm run typecheck` | Checks the code for type mistakes without running it |
| `npm run build` | Builds the production version |

## Status

**Steps 1 to 4 of ten are complete. 220 automated tests pass.**

- **Step 1 — skeleton.** The application runs, connects to PostgreSQL, has a working
  migration command and a passing test suite.
- **Step 2 — login and roles.** Real accounts with email and password, sign out, password
  reset, the five roles, Italian and English throughout, and page protection enforced by
  the server rather than hidden in a menu.
- **Step 3 — tenant separation.** Companies own gyms; the company is the tenant. Two
  independent locks: the application filters its own queries, and **the database itself
  refuses to hand over another company's rows** even if the application asks wrongly.

  The second lock is real, not aspirational. The application connects with a restricted
  account that cannot bypass it, and **29 wall tests** bypass the application entirely to
  query the database directly and confirm the refusal. Point those same tests at a
  privileged connection and 22 of them fail immediately — which is how we know they are
  testing something.

- **Step 4 — people, roles and lifecycle.** Members can be created, listed and opened;
  their state moves Lead → Starter → Client → Dormant/Churn with every change dated and
  attributed. Trainers are deactivated, never deleted, and their assigned members are
  released rather than reassigned automatically.

  The **audit log** is switched on from here. It is written by database triggers rather
  than application code, so no future feature can forget to record itself — and the
  application is allowed to read it but never to write or erase an entry.

There is deliberately **no business functionality yet**: no credits, no bookings, no
prices. Those arrive one step at a time, in the order set out in
[docs/build-plan.md](docs/build-plan.md). Step 5 is the catalogue — services, prices,
packs and levels.
