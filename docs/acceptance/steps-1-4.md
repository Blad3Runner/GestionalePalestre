# Owner acceptance script — Steps 1 to 4

Written 2026-08-22. Revised the same day after the owner's first run.
Covers everything built so far, in one sitting: roughly 45 minutes.

**This is a checklist you run, not a report you read.** Every item tells you exactly what
to do, what you should see, and **what it would look like if it were broken**. If any item
does not behave as written, the step it belongs to is not done — say so and it gets fixed.

You do not need to understand any code. You need a browser and a terminal.

---

## First: how the system is organised

Two words are used constantly and mean different things. Everything else follows from them.

**A COMPANY is the tenant.** It is the *business* — the thing that has an owner, sells
something, and has walls around it. One company can never see another company's anything.
This is the unit that gets billed, and the unit the law cares about.

**A GYM is one physical location**, belonging to **exactly one** company. A gym is a room
with a door, not a business.

A company may own **one** gym or **several**. When it owns several, people sometimes call
it a *circuito* — a circuit or chain — but there is no separate thing called a circuit in
the system. It is just a company with more than one gym.

```
COMPANY  ──owns──▶  GYM
   │                 │
   │                 └─ people work or train HERE
   └─ the wall is HERE
```

**Roles hang off the pair, not off the person.** Somebody is "a trainer at Milano" or "the
owner of the whole of Circuito Nord" — never just "a trainer". The same human being can be
a trainer at one company and a member at another, with one login. That is the case you will
check in Part D.

Two levels a role can sit at:

- **Whole company** — covers every gym the company owns, including ones opened later.
- **One gym** — covers that location only, and its sibling locations are invisible.

### The two demo companies

Deliberately different shapes, so both cases can be checked. **A company name never contains
a city; a gym name is only ever a city.** That way you can always tell which is which.

| | Studio Corpo Libero | Circuito Nord |
| --- | --- | --- |
| **Gyms** | **1** — Milano | **2** — Bologna, Torino |
| **Sells** | Credits | Subscriptions |
| **Notes** | The founding tenant, the studio this platform was designed around | A chain, so sibling-gym walls can be tested |

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

### Every account

All eighteen, with the same password: **`Palestra2026!`**

| Sign in as | Who they are | Where |
| --- | --- | --- |
| `admin@example.com` | **Platform admin — your account** | Everywhere |
| **— Studio Corpo Libero —** | | |
| `titolare@example.com` | Owner **and** trainer | Whole company |
| `reception@example.com` | Front desk | Milano |
| `trainer@example.com` | Trainer, active *(app in English)* | Milano |
| `senior@example.com` | Trainer, **deactivated** | Milano |
| `cliente@example.com` | Member — **Cliente** (Client) | Milano |
| `cliente2@example.com` | Member — **Contatto** (Lead) | Milano |
| `starter@example.com` | Member — **Starter** | Milano |
| `dormiente@example.com` | Member — **Inattivo** (Dormant) | Milano |
| `perso@example.com` | Member — **Perso** (Churned) | Milano |
| **— Circuito Nord —** | | |
| `nord@example.com` | Owner of the **whole** company | Bologna **and** Torino |
| `bologna@example.com` | Owner of **Bologna only** | Bologna |
| `reception.bologna@example.com` | Front desk | Bologna |
| `trainer.bologna@example.com` | Trainer, active | Bologna |
| `trainer.torino@example.com` | Trainer, **deactivated** | Torino |
| `bologna.lead@example.com` | Member — **Contatto** (Lead) | Bologna |
| `torino.cliente@example.com` | Member — **Cliente** (Client) | Torino |
| **— The awkward one —** | | |
| `duecappelli@example.com` | **Trainer at Corpo Libero *and* member at Nord** | Both |

### A note on the five member states

The system shows Italian words; this script and the plan use English ones. They are the
same five things:

| Italian on screen | English in the plan | Means |
| --- | --- | --- |
| **Contatto** | Lead | Enquired, not bought anything |
| **Starter** | Starter | Bought the entry pack |
| **Cliente** | Client | Buys credits regularly |
| **Inattivo** | Dormant | Has stopped coming |
| **Perso** | Churned | Gone |

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
**Expect:** the last two lines read `Test Files 13 passed (13)` and
`Tests 279 passed (279)`. It takes a few seconds.
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
**Expect:** "Email o password non corretti." — a refusal that does **not** say whether the
email exists. It must not say "no such user"; that would tell a stranger which addresses
are real.
**Broken would look like:** being let in, or a message naming the account.

**B4 · Confirm the language switch works.**
Sign in as `trainer@example.com` (this one is set to English).
**Expect:** the interface appears in English.
**Broken would look like:** Italian text, or a mixture, or the word `undefined` anywhere.

---

## Part C — The walls between companies *(Step 3)*

**C1 · An owner who owns only one location.**
Sign out, sign in as `bologna@example.com` — the owner of **Bologna only**, in a company
that also owns Torino.
Open <http://localhost:3000/desk/members>.
**Expect:** the line under the heading reads exactly **"Le persone iscritte a Bologna."**
Below it, exactly **two** people: Elena Due Cappelli and Nadir Lead, both showing "Bologna"
in the Sede column. **The word "Torino" must not appear anywhere on the page**, and Carlo
Torino must not be listed. There is no location switcher in the top bar, because this
person belongs to one place only.
**Broken would look like:** anybody from Torino appearing, the word Torino showing up at
all, or a switcher offering it.

**C2 · The owner of the whole company sees every location at once.**
Sign out, sign in as `nord@example.com`.
Open <http://localhost:3000/desk/members>.
**Expect:** the line under the heading reads **"Le persone iscritte in tutte le sedi di
Circuito Nord."** Below it, **three** people — Elena Due Cappelli (Bologna), Carlo Torino
(**Torino**), Nadir Lead (Bologna) — with the **Sede** column telling you which gym each
belongs to.
**Expect also:** there is **no "Cambia sede" switcher** for this person. That is correct and
not a fault. They hold one role covering the whole company, so there is only one thing to
look at: everything they own. Only somebody who belongs to *more than one* place gets a
switcher.
**Broken would look like:** seeing only one gym's members, or the Sede column being empty
so you cannot tell the locations apart.

**C2b · Narrow the view to one location.**
Above the list there is a **"Sede"** dropdown offering "Tutte le sedi", "Bologna" and
"Torino". Choose **Bologna** and press "Filtra".
**Expect:** the list drops to **two** people, both at Bologna. Carlo Torino disappears. The
line under the heading changes to "Le persone iscritte a Bologna." The address bar now ends
in `?sede=…`, so a refresh keeps your choice and you can bookmark it.
**Expect also:** you are **still the owner of the whole company**. Choosing "Tutte le sedi"
and pressing "Filtra" brings everything back. This is a filter on what you see, not a
change to who you are — narrowing the screen must never cost you access to your own
business.
**Broken would look like:** the filter emptying the list entirely, the choice being lost on
refresh, or anything becoming *unavailable* to you while filtered.

**C3 · A member cannot see other members.**
Sign out, sign in as `cliente@example.com` (a member at Milano).
Type `http://localhost:3000/desk/members` directly into the browser bar.
**Expect:** "Accesso non consentito" — allowed roles "Titolare, Reception", your roles
"Cliente".
**Broken would look like:** a list of the gym's other members appearing.

---

## Part D — The awkward one: a person with two hats *(Step 4)*

This is the case most systems get wrong, so check it carefully. Elena is a **trainer** at
Studio Corpo Libero and a **member** at Circuito Nord. **One human being, one login.**

**D1 · Sign in as Elena.**
Sign out, sign in as `duecappelli@example.com`.
**Expect:** the top bar shows a small label reading **"Cambia sede"** followed by a dropdown
offering **two different companies**: "Studio Corpo Libero — Milano" and "Circuito Nord —
Bologna", with a "Vai" button beside it. The menu shows **"Area trainer"**.
**Broken would look like:** only one company offered, no label beside the dropdown, or two
separate accounts being needed.

**D2 · As a trainer, she is not a member.**
While looking at **Studio Corpo Libero — Milano**, type `http://localhost:3000/me` into the
browser bar — that is the members' own area.
**Expect:** "Accesso non consentito" — allowed roles "Cliente", your roles "**Trainer**".
**Broken would look like:** the member area opening. Elena is staff there, not a customer.

**D3 · Switch company, and she becomes a member.**
Use the switcher to choose "Circuito Nord — Bologna", press "Vai", then open
`http://localhost:3000/me` again.
**Expect:** the page now **opens**, headed "Area personale", and states "I tuoi ruoli:
**Cliente**", "Stai vedendo: Circuito Nord — Bologna". The menu entry has changed from "Area
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
**Expect:** the line under the heading reads **"Le persone iscritte a Milano."** and five
members are listed, each showing a state: Perso, Inattivo, Starter, Contatto, Cliente. No
member of Circuito Nord appears.
**Broken would look like:** members from another company, or every state showing "—".

**E2 · Add a new member.**
Scroll to "Nuovo cliente". Type a name (`Mario Prova`) and an email
(`mario.prova@example.com`). Press "Aggiungi cliente".
**Expect:** the list refreshes and Mario appears with the state **"Contatto"** — that is
Lead, the first of the five states. A note below the form explains he has no password yet
and will set his own.
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
Press "Apri scheda" next to **Paolo Cliente** (`cliente2@example.com`). His state is
**Contatto** — Lead.
**Expect:** his file, showing email, state "Contatto", his usual trainer ("Luca Trainer"),
the date he joined, and a section "Storico degli stati" with one line: "Contatto", dated,
noted "Seeded".
**Broken would look like:** a "not found" page, or an empty history.

**E6 · Move him from Contatto to Starter.**
In "Cambia stato", open the "Nuovo stato" dropdown.

**Expect first:** the dropdown offers only **"Starter"** and **"Perso"** — and **not**
"Contatto", the state he is already in, nor "Cliente".

> **This trips people up, so read it once.** The dropdown lists **where he can go**, never
> **where he is**. His current state is shown separately, higher up the page, next to
> "Stato". Two things are therefore missing from the list on purpose: *Contatto*, because
> he is already there and moving somewhere you already are means nothing; and *Cliente*,
> because going straight from a first contact to a paying client would skip the Starter
> Pack, and the system refuses to record a step that never happened. Making this clearer on
> screen is a design job for later — the behaviour is right, the presentation is thin.

Choose "Starter", type the note `Ha comprato lo Starter Pack`, press "Salva".
**Expect:** the state at the top becomes "Starter", and the history gains a line reading
**"Contatto → Starter"**, with today's date and time, and **"Registrato da Sara
Reception"**, with your note beneath it. The old "Contatto" line is still there below it.
**Expect also:** the dropdown now offers **Cliente, Contatto, Perso** — the three places a
Starter can go — and no longer offers Starter. Same rule as before.
**Broken would look like:** the history being overwritten instead of added to, the wrong
person's name recorded, a time that is not the current time, or "Cliente" having been
offered before the move.

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
> Corpo Libero (tutta la struttura)"** — the whole company — and press "Vai". You are then
> acting as the owner. This is recorded as open question **OQ-9**: which hat should he land
> on by default?

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
"Studio Corpo Libero · CREDITS · 1 sedi · 11 persone" — plus three links: new company, new
location, new person. **This is the only screen in the product that sees across companies.**
**Expect also:** the "Cambia sede" dropdown in the top bar offers **four** entries:

| Entry | Why it is there |
| --- | --- |
| Circuito Nord (tutta la struttura) | The whole company — both its gyms at once |
| Circuito Nord — Bologna | Just that location |
| Circuito Nord — Torino | Just that location |
| Studio Corpo Libero — Milano | Its only location |

Studio Corpo Libero gets **one** entry, not two, because a company with a single gym would
otherwise appear twice saying the same thing. A company only offers a "tutta la struttura"
entry when it has more than one gym to stand above.
**Broken would look like:** only one company appearing, the counts being obviously wrong, or
the same company listed twice with one gym.

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
Follow "Nuova sede". Choose "Palestra Prova", name it `Firenze`, city `Firenze`, press
"Crea".
**Expect:** the table lists "Firenze — Firenze — Palestra Prova".
**Broken would look like:** the location appearing under the wrong company.

**G5 · Create a person in a role you choose.**
Follow "Nuova persona". Name `Prova Titolare`, email `prova.titolare@example.com`, role
"Titolare", place "Palestra Prova · Tutta l'azienda".
**Expect:** the person appears in the list showing "Titolare — Palestra Prova".
**Also expect:** the role dropdown offers exactly four roles — Titolare, Reception, Trainer,
Cliente. **"Amministratore piattaforma" is deliberately not on the list**, and a note below
the form says so. The application has no permission to create founders, by design.
**Broken would look like:** platform admin being offered.

**G5b · Give the new person their first password.**
Immediately after creating them, a green panel appears headed **"Link per la prima
password"**, containing a long web address.
**Expect:** the panel names the person ("Prova Titolare è stato creato.") and explains that
the link works **once** and expires in an hour.
**Why it works this way:** nobody — not even you — ever sets somebody else's password. You
hand them the link; they choose their own. If you lose it, they can always use "Password
dimenticata" instead.
**Broken would look like:** no panel appearing, or the panel appearing but the link not
working at step G5c.

**G5c · Walk the link yourself, to prove it works.**
Copy the link. Sign out. Paste it into the browser bar. Type a new password twice — try
`PrimaPassword2026!` — and save.
**Expect:** "Password aggiornata. Ora puoi accedere." Then sign in as
`prova.titolare@example.com` with the password you just chose.
**Expect:** you land as that person, and the top bar shows their name and their role at the
place you assigned them.
**Broken would look like:** the link saying it is invalid or expired the first time you use
it — that was a real bug until 22 August 2026, when every reset link was being created
already expired.

**G5d · Confirm the link dies after one use.**
Paste the same link in again.
**Expect:** refused as invalid. A link that could be used twice would be a permanent way in
for anybody who ever saw it.
**Broken would look like:** being asked to choose a password a second time.

**G6 · Find Elena in the list, and see the two hats in one row.**
Scroll the people list to "Elena Due Cappelli".
**Expect:** her single row shows **both** places: "Trainer — Studio Corpo Libero / Milano"
and "Cliente — Circuito Nord / Bologna · Cliente".
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
| The company is the tenant; a company may own several gyms | Owner script **C1, C2, G1** · `demo-world.test.ts › the two companies have deliberately different shapes` | Yes |

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
| Company and gym names can never be confused for each other | `demo-world.test.ts › the names cannot be confused with each other` (2 cases) · Owner script **C1, C2, G1** | Yes |
| A whole-company owner can narrow to one gym — **a filter, never a demotion** | `actions.test.ts › narrowing the list to one location` (5 cases) · Owner script **C2b** | Yes |
| A person created by the admin gets a **single-use** first-password link | `actions.test.ts › the first-password link for somebody just created` (4 cases) · Owner script **G5b, G5c, G5d** | Yes |
| "Password dimenticata" actually works, end to end | `password-reset.db.test.ts` (7 cases) · Owner script **G5c** | Yes |
| A reset link is dated and judged by the database's clock | `db.clock.test.ts › timestamps the application asks for, rather than writes` (2 cases) | Yes |

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
