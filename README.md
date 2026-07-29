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

Then copy `.env.example` to a file called `.env` and put the real database password in
it. `.env` is never committed — it is the one file that holds secrets.

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

### Occasionally useful

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Applies any pending database changes |
| `npm run db:studio` | Opens a visual browser for the database contents |
| `npm run typecheck` | Checks the code for type mistakes without running it |
| `npm run build` | Builds the production version |

## Status

**Step 1 of ten is complete** — the skeleton. The application runs, connects to
PostgreSQL, has a working migration command and a passing test suite.

There is deliberately **no business functionality yet**: no gyms, no people, no credits,
no bookings. Those arrive one step at a time, in the order set out in
[docs/build-plan.md](docs/build-plan.md). Step 2 is login and roles.
