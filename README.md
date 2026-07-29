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
| [docs/claude.md](docs/claude.md) | Architecture and hard rules — the project constitution |
| [docs/features-credit-model.md](docs/features-credit-model.md) | Full business specification of the founding tenant |
| [docs/decisions.md](docs/decisions.md) | Log of every decision taken, with reasoning |

## Status

Foundation stage. No application code yet — technology stack and build order are
being agreed before anything is written.
