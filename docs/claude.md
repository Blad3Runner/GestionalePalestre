What this is

A multi-tenant web platform for managing training businesses (gyms, personal training studios). Around 20 client businesses ("tenants") initially, up to ~500 end customers each; all roles use it through the browser. The founding tenant is a premium PT studio with an advanced credit-based business model, fully specified in /docs/features-credit-model.md — read that file before working on anything touching credits, pricing, booking, check-in, or accounting. The project owner is not a developer: explain technical choices and problems in simple, non-technical language.

Core architecture — hard rules
One shared application, one shared PostgreSQL database, one deployment. Never create per-client code copies, branches, builds, or deployments. Client differences are configuration, never code duplication.
Every domain table carries a tenant_id. Every query is filtered by tenant. Tenant isolation is absolute; write automated tests that verify it.
Roles: platform admin (the founders); within a tenant: owner, front desk/staff, trainer, member. Each trainer sees only their own agenda and clients. Financial data is visible to the tenant owner only.
Full audit log on everything that moves credits or money: an internal currency is real money — every movement, refund, and correction must be traceable.
Accounting rule, non-negotiable: a credit sold is a liability (deferred revenue), never revenue. Revenue is recognized only at consumption and attributed to the service delivered. Cash-in and revenue live on separate lines everywhere in the system.
Modularity — first-class principle

Small core (tenants, users, roles, configuration, audit) plus self-contained modules, each enabled per tenant through configuration with zero code changes:

Business modules: subscriptions · credit wallet & ledger · bookings · check-in (QR + trainer mobile) · payments & fiscal documents.
Advanced modules (built for the founding tenant, reusable for others): dynamic group pricing · level-based matching · frequency discount engine · lifecycle states & automations · funnel diagnostics · trainer compensation & performance.

When a client requests a capability that doesn't exist, it is built as a new module in the shared codebase and switched on only for that tenant, without modifying unrelated modules. All business parameters (credit prices, price bands, discount percentages, time windows, thresholds) are tenant configuration.

Business models — both native

Some tenants sell recurring memberships; others sell credits consumed via bookable sessions; others combine both. Both are core from day one. Credits are a full ledger: hold at booking, charge at check-in, expiry per policy, refunds — the displayed balance is always real.

Member-facing side

Responsive web app, installable as PWA. No native apps. Booking, wallet with full movement history, QR/check-in. Hard UI principle (from the founding tenant, applied platform-wide): the member must never discover a cost — they must understand it before. Every booking screen states, in simple words, the maximum a session can cost and why; the real price appears at check-in. Transparent language, never penalty-framed.

Integrations

The platform is the single source of truth; external tools attach to it and never duplicate data by hand: Botpress (lead intake), ActiveCampaign (email automations and tags) via events/webhooks; a payment provider; Italian e-invoicing (fattura elettronica / corrispettivi) for the fiscal module.

Non-functional requirements
Hosting and all data storage strictly in EU/EEA. HTTPS everywhere.
GDPR: the platform operators act as data processors for each tenant (art. 28 DPA per client). The platform does store special-category health data where a tenant enables it (structured anamnesis: goal, strength level, mobility level, history, clinical flags; health questionnaires): explicit art. 9 consent flow, encryption, access limited to authorized roles, right to erasure. Legal review of this handling is mandatory before first go-live.
Contracts and consents archived per client: signature with double subscription (artt. 1341–1342 c.c.), privacy, health questionnaire.
Automated encrypted backups to a second EU provider, restore documented and tested — with credits, data loss is financial loss.
Scale is modest (~10,000 end users); still write efficient queries and paginate everything.
Out of scope

Native mobile apps; physical access hardware; non-EU hosting; any per-client code versioning.

Working style

Present a plan in plain language before significant changes. Record decisions in /docs/decisions.md; keep this file updated. Detailed requirements: /docs/features-credit-model.md (founding tenant), /docs/wireframes/ (UX, to come). Open business decisions are listed at the end of the features doc — when a task depends on one, ask, don't assume.