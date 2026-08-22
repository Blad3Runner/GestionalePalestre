# Owner acceptance script — Steps 1 to 4

Written 2026-08-22. Covers everything built so far, in one sitting: roughly 45 minutes.

**This is a checklist you run, not a report you read.** Every item tells you exactly what
to do, what you should see, and **what it would look like if it were broken**. If any item
does not behave as written, the step it belongs to is not done — say so and it gets fixed.

You do not need to understand any code. You need a browser and a terminal.

---

## Before you start

Two commands, in the project folder. Run them in order.

**Put the demo world back to its starting state:**

```bash
npm run db:reset-demo
```

**Start the application:**

```bash
npm run dev
```

Then open <http://localhost:3000> in a browser.

> **Important, and easily missed:** the reset deletes and recreates every person, so a
> browser that was already signed in is now holding a pass belonging to somebody who no
> longer exists. **After a reset, always press "Esci" (sign out) and sign in again.**

The application is in **Italian** by default. There is an **EN** button in the top bar if
you prefer English; the script below quotes the Italian labels.

### The accounts

Every account uses the same password: **`Palestra2026!`**

| Sign in as | Who they are | Where |
| --- | --- | --- |
| `admin@example.com` | **Platform admin — your account** | Everywhere |
| `titolare@example.com` | Owner **and** trainer | Studio Seregno |
| `reception@example.com` | Front desk | Seregno |
| `trainer@example.com` | Trainer, active (app in English) | Seregno |
| `senior@example.com` | Trainer, **deactivated** | Seregno |
| `cliente@example.com` | Member — Client | Seregno |
| `cliente2@example.com` | Member — Lead | Seregno |
| `nord@example.com` | Owner of the **whole** circuit | Circuito Nord |
| `monza@example.com` | Owner of **Monza only** | Circuito Nord |
| `duecappelli@example.com` | **Trainer at Seregno *and* member at Nord** | Both |

Two companies, on purpose shaped differently:

- **Studio Seregno** — one gym, sells credits. The founding tenant.
- **Circuito Nord** — two gyms (Monza, Como), sells subscriptions.

---

## Part A — Does it run at all? *(Step 1)*

**A1 · Start the application.**
Run `npm run dev` and open <http://localhost:3000>.
**Expect:** a page headed "Gestionale Palestre" with an "Accedi" (sign in) button.
**Broken would look like:** the terminal prints an error and the page does not load, or the
browser says the site cannot be reached.

**A2 · Check the database is connected.**
Open <http://localhost:3000/health>.
**Expect:** a page confirming the application is running and the database is connected,
naming the PostgreSQL version (something like "PostgreSQL 18").
**Broken would look like:** an error message about the database, or no version number.

**A3 · Run the automated tests.**
In a second terminal: `npm test`.
**Expect:** the last two lines read `Test Files 12 passed (12)` and
`Tests 259 passed (259)`. It takes a few seconds.
**Broken would look like:** any line containing `FAIL`, or a number under "failed" that is
not zero.

---

## Part B — Signing in, and being turned away *(Step 2)*

Everything in this part is done **from limited accounts**. That is the point: a wall you
check from the administrator's chair is not a wall.

**B1 · Sign in as the front desk.**
Press "Accedi", enter `reception@example.com` / `Palestra2026!`.
**Expect:** you land signed in, and the top bar shows "Sara Reception" and a menu entry
"Reception". You should **not** see entries for "Amministrazione piattaforma", "Gestione
palestra", "Area trainer" or "Area personale".
**Broken would look like:** menu entries for areas this person has no business in.

**B2 · Try to walk in through a door that is not yours.**
With reception still signed in, type this address directly into the browser bar:
`http://localhost:3000/admin`
**Expect:** a page headed **"Accesso non consentito"** which explains that the page exists
but is reserved for other roles, and states plainly: requested page `/admin`, allowed roles
"Amministratore piattaforma", your roles "Reception".
**Broken would look like:** the administration page actually opening, or a blank page, or a
technical error. **Seeing the page would be a serious failure — that is the whole wall.**

**B3 · Try a wrong password.**
Sign out ("Esci"), then try `reception@example.com` with the password `sbagliata`.
**Expect:** a refusal that does **not** say whether the email exists. It must not say "no
such user" — that would tell a stranger which addresses are real.
**Broken would look like:** being let in, or a message naming the account.

**B4 · Confirm the language switch works.**
Sign in as `trainer@example.com` (this one is set to English).
**Expect:** the interface appears in English.
**Broken would look like:** Italian text, or a mixture, or the word `undefined` anywhere.

---

## Part C — The walls between companies *(Step 3)*

**C1 · A gym owner who owns only one location.**
Sign out, sign in as `monza@example.com` — the owner of **Monza only**, in a circuit that
also owns Como.
Open <http://localhost:3000/desk/members>.
**Expect:** a list headed "— Monza" containing exactly **two** people: Elena Due Cappelli
and Nadir Lead. **Carlo Como must not appear anywhere.** There should be no location
switcher in the top bar, because this person belongs to only one place.
**Broken would look like:** any member from Como appearing, or a switcher offering Como.

**C2 · The owner of the whole circuit sees both.**
Sign out, sign in as `nord@example.com`.
**Expect:** a "Cambia sede" (change location) switcher in the top bar offering **both**
Monza and Como. Switch between them and the member list changes accordingly.
**Broken would look like:** only one location offered, or the list not changing when you
switch.

**C3 · A member cannot see other members.**
Sign out, sign in as `cliente@example.com` (a member at Seregno).
Type `http://localhost:3000/desk/members` directly into the browser bar.
**Expect:** "Accesso non consentito" — allowed roles "Titolare, Reception", your roles
"Cliente".
**Broken would look like:** a list of the gym's other members appearing.

---

## Part D — The awkward one: a person with two hats *(Step 4)*

This is the case most systems get wrong, so check it carefully. Elena is a **trainer** at
Studio Seregno and a **member** at Circuito Nord. **One human being, one login.**

**D1 · Sign in as Elena.**
Sign out, sign in as `duecappelli@example.com`.
**Expect:** the top bar shows a "Cambia sede" switcher offering **two different companies**:
"Studio Seregno — Seregno" and "Circuito Nord — Monza". The menu shows **"Area trainer"**.
**Broken would look like:** only one company offered, or two separate accounts being needed.

**D2 · As a trainer, she is not a member.**
While looking at **Studio Seregno**, type `http://localhost:3000/me` into the browser bar —
that is the members' own area.
**Expect:** "Accesso non consentito" — allowed roles "Cliente", your roles "**Trainer**".
**Broken would look like:** the member area opening. Elena is staff there, not a customer.

**D3 · Switch company, and she becomes a member.**
Use the switcher to choose "Circuito Nord — Monza", press "Vai", then open
`http://localhost:3000/me` again.
**Expect:** the page now **opens**, headed "Area personale", and states "I tuoi ruoli:
**Cliente**", "Stai vedendo: Circuito Nord — Monza". The menu entry has changed from "Area
trainer" to "Area personale".
**Broken would look like:** still refused, or still showing "Trainer" — that would mean the
system thinks a role is a property of the person rather than of where they are.

**D4 · And the reverse.**
Still looking at Circuito Nord, open `http://localhost:3000/trainer`.
**Expect:** refused. She is not a trainer at that company.
**Broken would look like:** the trainer area opening.

---

## Part E — Members and their history *(Step 4)*

**E1 · The front desk sees its own gym, and only that.**
Sign out, sign in as `reception@example.com`. Open <http://localhost:3000/desk/members>.
**Expect:** five members, all at Seregno, each showing a state: Perso, Inattivo, Starter,
Contatto, Cliente. No member of Circuito Nord appears.
**Broken would look like:** members from another company, or every state showing "—".

**E2 · Add a new member.**
Scroll to "Nuovo cliente". Type a name (`Mario Prova`) and an email
(`mario.prova@example.com`). Press "Aggiungi cliente".
**Expect:** the list refreshes and Mario appears with the state **"Contatto"** (Lead). A
note below the form explains he has no password yet and will set his own.
**Broken would look like:** an error, or Mario appearing with no state, or with a state
other than Contatto.

**E3 · Try to break it: the same email twice.**
Add another member with the **same** email `mario.prova@example.com`.
**Expect:** a clear message in plain Italian saying the email already belongs to a
registered person — **not** a technical error, and **no** second Mario in the list.
**Broken would look like:** a crash, a stack trace, or a duplicate appearing.

**E4 · Try to break it: leave the name blank.**
Add a member with an empty name and any email.
**Expect:** refused, with "Nome ed email sono obbligatori." Nothing is created.
**Broken would look like:** a half-made person appearing in the list with a blank name.

**E5 · Open a member's file.**
Press "Apri scheda" next to **Paolo Cliente** (`cliente2@example.com`, state Contatto).
**Expect:** his file, showing email, state "Contatto", his usual trainer ("Luca Trainer"),
the date he joined, and a section "Storico degli stati" with one line: "Contatto", dated,
noted "Seeded".
**Broken would look like:** a "not found" page, or an empty history.

**E6 · Move him from Lead to Starter.**
In "Cambia stato", open the "Nuovo stato" dropdown.
**Expect first:** the dropdown offers only **"Starter"** and **"Perso"**. It must **not**
offer "Cliente" — going straight from a first contact to a paying client would skip the
Starter Pack, and the system refuses to record a step that never happened.
Choose "Starter", type the note `Ha comprato lo Starter Pack`, press "Salva".
**Expect:** the state at the top becomes "Starter", and the history gains a line reading
**"Contatto → Starter"**, with today's date and time, and **"Registrato da Sara
Reception"**, with your note beneath it. The old "Contatto" line is still there below it.
**Broken would look like:** the history being overwritten instead of added to, the wrong
person's name recorded, a time that is not the current time, or "Cliente" being offered in
the dropdown.

**E7 · What the front desk is not allowed to see.**
Still on Paolo's file, look at the section "Registro delle modifiche" (the change log).
**Expect:** "Nessuna modifica registrata." — **empty**. This is correct. The change log is
the owner's business, and reception is not the owner. You will see it filled in at F5.
**Broken would look like:** the change log showing entries. Reception seeing the audit trail
would mean the financial wall leaks.

---

## Part F — Trainers, deactivation, and money *(Step 4)*

**F1 · Sign in as the owner — and mind the two hats.**
Sign out, sign in as `titolare@example.com`. He is **both** the owner and a trainer.

> **Known rough edge.** He may land on his *trainer* hat, in which case the menu shows only
> "Area trainer" and `/desk` is refused. Use the "Cambia sede" switcher to choose **"Studio
> Seregno (tutta la struttura)"** — the whole company — and press "Vai". You are then acting
> as the owner. This is recorded as an open question: which hat should he land on by default?

**F2 · See the trainers, including the one who left.**
Open <http://localhost:3000/owner/trainers>.
**Expect:** four trainers. **Luca Trainer** shows **5** assigned clients and the state
"Attivo". **Chiara Senior** shows the state "Disattivato" with the date she was switched
off, and a "Riattiva" button. A line at the bottom explains that history stays attributed.
**Broken would look like:** Chiara having disappeared from the list entirely — a deactivated
trainer must never vanish, or the sessions she ran would belong to nobody.

**F3 · Deactivate a trainer and watch what happens to their clients.**
Press "Disattiva" on **Luca Trainer**.
**Expect:** Luca is still in the list, now marked "Disattivato" with today's date, and his
assigned client count has dropped from **5 to 0**. Those five members have been **released**,
not handed to another trainer. That is deliberate: who trains whom is your decision, not the
software's.
**Broken would look like:** Luca disappearing, his clients being silently reassigned to
somebody else, or the count staying at 5.

**F4 · Bring him back.**
Press "Riattiva" on Luca.
**Expect:** state returns to "Attivo" and the deactivation date disappears. His five clients
are **not** automatically given back — you would reassign them yourself.
**Broken would look like:** the old deactivation date still showing.

**F5 · The change log, from the owner's chair.**
Open <http://localhost:3000/desk/members>, press "Apri scheda" on Paolo Cliente, and look
again at "Registro delle modifiche".
**Expect:** it is now **filled in**, and one of the lines reads `UPDATE bridge_membership`
with today's date and **"Sara Reception"** — the change *you made as reception* in item E6,
recorded automatically, attributed to the person who made it, and visible to the owner.
**Broken would look like:** still empty, or the change attributed to the wrong person, or no
record of E6 at all. **Nothing in the system asks for these entries to be written; the
database writes them itself, which is why they cannot be forgotten.**

---

## Part G — Your own account: setting up a new client *(the sandbox)*

This part uses the **platform admin** account. It is for **setup only** — everything that
matters was checked above from limited accounts.

**G1 · Sign in as yourself.**
Sign out, sign in as `admin@example.com`. Open <http://localhost:3000/admin>.
**Expect:** an overview listing **both** companies with their sales model, number of
locations and number of people — "Circuito Nord · SUBSCRIPTIONS · 2 sedi · 8 persone",
"Studio Seregno · CREDITS · 1 sedi · 11 persone" — plus three links: new company, new
location, new person. **This is the only screen in the product that sees across companies.**
**Broken would look like:** only one company appearing, or the counts being obviously wrong.

**G2 · Create a company.**
Follow "Nuova azienda". Type the name `Palestra Prova`, leave the VAT number blank, choose a
sales model, press "Crea".
**Expect:** the table above the form now includes "Palestra Prova" with 0 locations and 0
people.
**Broken would look like:** an error, or nothing appearing.

**G3 · Try to break it: the same name twice.**
Create `Palestra Prova` again.
**Expect:** "Esiste già un'azienda con questo nome." and no duplicate.

**G4 · Create a location for it.**
Follow "Nuova sede". Choose "Palestra Prova", name it `Sede Centro`, city `Milano`, press
"Crea".
**Expect:** the table lists "Sede Centro — Milano — Palestra Prova".

**G5 · Create a person in a role you choose.**
Follow "Nuova persona". Name `Prova Titolare`, email `prova.titolare@example.com`, role
"Titolare", place "Palestra Prova · Tutta l'azienda".
**Expect:** the person appears in the list showing "Titolare — Palestra Prova".
**Also expect:** the role dropdown offers exactly four roles — Titolare, Reception, Trainer,
Cliente. **"Amministratore piattaforma" is deliberately not on the list**, and a note below
the form says so. The application has no permission to create founders, by design.
**Broken would look like:** platform admin being offered.

**G6 · Find Elena in the list, and see the two hats in one row.**
Scroll the people list to "Elena Due Cappelli".
**Expect:** her single row shows **both** places: "Trainer — Studio Seregno / Seregno" and
"Cliente — Circuito Nord / Monza · Cliente".
**Broken would look like:** two separate rows for Elena — that would mean two accounts for
one human being.

**G7 · Throw it all away.**
In the terminal: `npm run db:reset-demo`. Then sign out in the browser and sign in again.
**Expect:** "Palestra Prova", Mario Prova and Prova Titolare are gone; Paolo is a "Contatto"
again; Luca is active again with his 5 clients. Everything is back to the start.
**Broken would look like:** anything you created surviving the reset.

---

## The "done when" tables

Each step's contract, and where each line is proven. **No row rests on "trust me."**

### Step 1 — Project skeleton

| Criterion | Proven by | Done |
| --- | --- | --- |
| One command starts the app | Owner script **A1** | Yes |
| `/health` shows app running, database connected, with the PostgreSQL version | Owner script **A2** · `health.test.ts › shortenPostgresVersion` | Yes |
| One command runs the test suite and it passes | Owner script **A3** | Yes |

### Step 2 — Login and roles

| Criterion | Proven by | Done |
| --- | --- | --- |
| Log in as each role and watch the menu change | Owner script **B1, B4, D1, D3, F1** | Yes |
| A forbidden address typed directly is **refused**, not merely hidden | Owner script **B2, C3, D2, D4** | Yes |
| That refusal is covered by an automated test | `guard.test.ts › a visitor signed in with the wrong role › is refused the platform administration area` · `route-policy.test.ts › every role against every protected area` (50 cases) | Yes |
| Password reset exists and is safe | `passwords.test.ts › hashing and verifying` (7 cases) · `wall.test.ts › is refused the password reset table outright, under every badge` | Yes |
| Italian and English from the start, Italian default | Owner script **B4** · `dictionaries.test.ts › both dictionaries carry exactly the same phrases` | Yes |

### Step 3 — Tenant separation

| Criterion | Proven by | Done |
| --- | --- | --- |
| (a) Company A asking for company B's rows gets **nothing** | `wall.test.ts › (a) a company badge reaching for another company` (5 cases) | Yes |
| (b) A gym-level badge cannot read sibling gyms of the **same** company | `wall.test.ts › (b) a gym-level badge and its sibling gyms` (3 cases) · Owner script **C1** | Yes |
| (c) A client cannot read another client's rows in the same gym | `wall.test.ts › (c) a client badge and other clients` (5 cases) · Owner script **C3** | Yes |
| (d) With **no badge at all**, tenant tables return nothing | `wall.test.ts › (d) no badge at all` (6 cases) | Yes |
| (e) The application's connection is provably **not** a superuser | `wall.test.ts › (e) the account the application actually uses` (3 cases) | Yes |
| The company is the tenant; a company may own several gyms | Owner script **C2, G1** · `demo-world.test.ts › the two companies have deliberately different shapes` | Yes |

### Step 4 — People, roles and lifecycle

| Criterion | Proven by | Done |
| --- | --- | --- |
| The owner can **create a member** | `actions.test.ts › adding a member at the desk › creates the person and the membership together` · Owner script **E2** | Yes |
| …**see them listed** | Owner script **E1, E2** | Yes |
| …and **open their profile** | Owner script **E5** | Yes |
| A member's state changes **Lead → Starter**, **recorded and dated** | `actions.test.ts › moving a member through the lifecycle › takes a Lead to Starter, and records who did it and when` · Owner script **E6** | Yes |
| History is added to, never overwritten | `actions.test.ts › keeps the earlier history rather than overwriting it` · Owner script **E6** | Yes |
| Impossible moves are refused | `lifecycle.test.ts › the moves it refuses` (4 cases) · `actions.test.ts › refuses a move the business does not make, and changes nothing` · Owner script **E6** | Yes |
| The **same person** exists at **two companies** with **different roles** | `demo-world.test.ts › the person with two hats` (4 cases) · `guard.test.ts › a person who is one thing here and another thing there` (6 cases) · Owner script **D1–D4, G6** | Yes |
| A **deactivated trainer** disappears from scheduling… | `actions.test.ts › deactivating a trainer › switches them off without deleting anything` · Owner script **F3** | Yes |
| …but **keeps their history** | `actions.test.ts › keeps every trace of the work they did` · `demo-world.test.ts › survives a trainer being switched off` · Owner script **F2, F3** | Yes |
| …and their members are **released**, not reassigned by software | `actions.test.ts › releases their members rather than handing them to somebody chosen by software` · Owner script **F3** | Yes |
| **Every one of those changes appears in the audit log** | `actions.test.ts › writes an audit entry nobody asked it to write` · `actions.test.ts › writes an audit entry for the change` · `audit.test.ts › the audit trail writes itself` (5 cases) · Owner script **F5** | Yes |
| The audit log cannot be forged or erased by the application | `audit.test.ts › the application cannot tamper with the trail` (3 cases) | Yes |
| No future table can silently lose its audit trail | `audit.test.ts › the audit trail cannot be lost by accident later` (3 cases) | Yes |
| `person_role` reduced to platform admin, permanently | `audit.test.ts › person_role really has shrunk to platform admin` (2 cases) | Yes |
| Trainer pay is **financial data** — invisible to workers and clients | `audit.test.ts › what a trainer is paid is financial data` (4 cases) · Owner script **E7 / F5** | Yes |
| All three pay models exist and are dated | `demo-world.test.ts › how trainers are paid` (4 cases) | Yes |
| Every timestamp comes from the database's clock | `db.clock.test.ts` (5 cases) · `actions.test.ts › dates the deactivation by the database's clock` | Yes |

---

## The invisible list

**What exists but has no screen.** These are proven by automated tests only — you are
*trusting* them, not *verifying* them. You are entitled to know exactly what is on this
list.

| What | Why there is no screen | How it is proven instead |
| --- | --- | --- |
| **What each trainer is paid** (per-session / revenue share / owner draw, with dates) | The data is built and walled off, but no owner screen was in Step 4's scope | `demo-world.test.ts › how trainers are paid` · `audit.test.ts › what a trainer is paid is financial data` |
| **The full audit log** across a company | Only the last 25 entries for one member appear on their file | `audit.test.ts` (16 cases) |
| **Creating another platform admin** | **Deliberate.** The application has no permission to create founders. Done by the seed only | `wall.test.ts › (c) cannot read anybody's platform roles but its own` |
| **Adding an existing person to a second company** | Elena's two hats exist through the seed. Doing it by hand has no screen yet | `demo-world.test.ts › the person with two hats` |
| **Editing a company or a gym** after creating it | Only creation was in scope | — |
| **Editing a member's level, package cap or usual trainer** after creation | Set at creation; changing them afterwards has no screen | — |
| **Company and gym settings** (price and opening-hours overrides) | The store exists; a settings screen was explicitly excluded from Step 3 | — |
| **The member's own area** and **the trainer's own area** | Both are placeholder pages that prove permissions work. Real content arrives with bookings and the wallet | `route-policy.test.ts`, `guard.test.ts` |
| **Deactivating a *member*** (as opposed to a trainer) | Trainers only, in Step 4 | — |
| **Lifecycle automation** — nobody becomes Dormant by themselves | Needs consumption, which arrives in Step 6. Step 4 **records** transitions, it does not trigger them | Open question **OQ-8** |

**Not built at all yet, and not pretending to be:** credits, wallets, bookings, check-in,
prices, packs, the Starter Pack, the frequency discount, payments, invoices, emails to
members, Botpress and ActiveCampaign. Those are Steps 5 to 10.

---

## If something goes wrong

**A page says "404 — This page could not be found"** and you have just pulled new code:
stop the app, delete the `.next` folder, start it again. That folder is a build cache and
occasionally goes stale.

```bash
rm -rf .next
```

**You are signed in as somebody who no longer exists**, or screens are oddly empty, just
after a reset: sign out and sign in again. The reset replaces every person.

**The tests complain "No demo data"**: run `npm run db:reset-demo`.

**Anything else**: write down the item number from this script, what you expected, and what
you actually saw. That is exactly enough to fix it.
