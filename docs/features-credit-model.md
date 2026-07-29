Distilled from "Blueprint operativo v2 — Gestionale a Crediti" (Protocollo Fitness). Prices come from the studio's 2026 list. Everything marked TBD is an open business decision: ask before implementing anything that depends on it. All figures below are tenant configuration, not constants.

1. Tenant profile

Premium personal-training studio (Seregno, IT). Five trainers; the owner (Matteo) is also a trainer and sole owner. Services: PT (solo and groups up to 5/6), mobility, osteopathy, nutritionist evaluation, BIA, water/merch. Positioning: a personalized method beyond "just weight loss" — the credit system is that positioning made operational: the client moves freely across services.

2. Credit currency and price list

1 credit = 1 € at launch (maximum readability; revisable — TBD confirm). Per-person PT prices in credits by group size: solo 50 · in 2 → 35 · in 3 → 30 · in 4 → 25 · small group 5/6 → 20. Non-PT services (mobility, osteopathy, BIA, water/merch): TBD, to be priced. Each service carries its own VAT treatment.

Recharge packs (tiered prepaid discount): S 300 cr @ 1,00 €/cr · M 600 @ 0,93 · L 1200 @ 0,88 · XL 2400 @ 0,82. This lever is separate from the frequency discount and TBD keep-or-drop, to avoid discounting the same commitment twice.

Starter Pack (fixed promo bundle): 140 € = 4 PT sessions + 30′ osteopath + nutritionist evaluation; couple variant 84 €/person.

3. Wallet = ledger

Every movement is dated, with cause and running balance: +purchase / −consumption / −expiry / +refund / −burned late-cancel. The ledger is shown to the member — transparency perceived as premium method. Booking places a hold; the actual charge happens at check-in, so the displayed balance is always real. Expiry: declared validity (e.g. 6–12 months) written in the contract, optional reset on recharge — TBD exact policy.

Reference example: Ricarica Pack M +600 → 600 · PT gruppo da 3 −30 → 570 · Mini group mobilità −15 → 555 · Visita osteopatica −40 → 515 · PT da 3, disdetta tardiva −30 → 485.

4. Group PT — matching and dynamic per-head price (the differentiating mechanic)
Matching by level. The structured anamnesis (goal, strength level, mobility level, history, clinical flags) drives automatic matching into groups homogeneous by level, not just size. The member books either (a) one of the groups proposed at their level, or (b) any open slot compatible with their package cap, without knowing the final headcount.
The package is a cap, not a price. Choosing "da 2 / 3 / 4" fixes the maximum companions accepted — it determines eligible slots and the best price reachable. What's known upfront is the maximum: the solo price.
Real payable head at session time = present members + late cancellations (within 24h, whose credits are burned at their band). Every present member pays the band of the real head.
Scenarios (gruppo da 3, bands 30/35/50): all present → head 3 → 30 each · one cancels >24h → head 2 → 35 each (canceller refunded) · one cancels <24h → head 3, their credits burned → 30 each · two cancel >24h → you're alone → 50.
Why the rule is right: a trainer hour costs roughly the same regardless; revenue per hour depends on paying heads (solo 50 €/h → in 2 70 → in 3 90 → in 4 100 → small group 120). The 24h rule protects the hour's revenue when the group thins. Incentives are aligned by construction: a fuller group costs less per head, which is exactly what maximizes revenue per trainer hour. Consequence: for group PT, trainer compensation as revenue share beats flat per-session.
Transparency is mandatory or the model reads as a rip-off. The app always shows the maximum possible price at booking and the real price at check-in, with "il tuo gruppo, il tuo prezzo" language, never penalty-framed. Notify the member when a companion's cancellation changes their estimate.
5. Frequency discount — automatic, no pre-commitment

The member never declares intent. The system counts PT entries (individual + group; mobility/osteopathy excluded — TBD confirm) per calendar week Monday–Sunday, resetting Sunday night. Full price at the 1st entry; the week's total lands at −x% at 2 entries and −y% at 3 (proposed clean scale −7% / −14%; the current paper list is non-uniform and in places inconsistent — small group 5/6 discounts less than 4-person — so unifying will slightly shift some prices vs the flyer: conscious choice, TBD confirm). Beyond the 3rd entry: same rate as the 3rd unless a −z% is defined; a charge can never be negative. Rounding: cent of credit, or whole credit with carried remainder — TBD.

Charge algorithm at entry n (robust even if group size changes between sessions):

charge(n) = (sum of full prices of entries 1..n) × (1 − discount of band n) − (credits already charged this week)

Worked example (gruppo da 3, full 30 cr, −7%/−14%): Mon 30,00 · Wed 25,80 (total 55,80 = 60 × 0,93) · Fri 21,60 (total 77,40 = 90 × 0,86). Three sessions cost 77,40 instead of 90, and each session of the week costs a bit less than the previous — positive reinforcement to show up.

6. User lifecycle and automations

States, recorded with dates: Lead → Starter → Client → Dormant/Churn.

Lead — from Meta form / Botpress, no purchase yet → AC tag, qualification sequence, bot warming.
Starter — bought the Starter Pack → status set, onboarding, trainer alert, anamnesis collection.
Client — first credit recharge after the starter → status set, welcome, wallet active, group matching enabled.
Dormant — no consumption for N weeks / idle balance → dormancy flag, win-back sequence, operational alert.

The moment worth the whole model: Starter → Client conversion, structured at the 3rd of the 4 starter sessions (the client has felt the method, the pack isn't finished): trainer alert + "conversion conversation" trigger + AC email. Additional automations: balance below threshold → recharge nudge before the client runs dry; credits expiring → "use or recharge" reminder.

7. Credit accounting (non-negotiable)

Three numbers, never conflated: credits sold (cash in — a debt toward the client, deferred revenue), credits consumed (the true revenue, recognized at consumption and attributed to the service delivered), credits outstanding (sum of all wallets — live liability). Breakage (expired unconsumed credits) becomes revenue per policy but is a health-warning metric — someone paid and didn't train, i.e. weak onboarding: monitored, not celebrated.

Required financial views: cash vs revenue always on separate lines; revenue by service (where the method's value really is); revenue per trainer hour (measures fill, not just delivered hours); labor cost and true margin — the owner's time is a draw, not an external cost: segment owner-time vs staff-time or margins come out false; real-time credit liability; average first recharge and LTV; installments with dunning; fiscal documents (fattura elettronica / corrispettivi) consistent with all of the above.

VAT — blocking open item: credits spendable across services with different VAT (PT 22%, osteopathy/nutrition potentially exempt, merch at its own rate) most likely constitute a multi-purpose voucher (D.Lgs. 141/2018): VAT due at redemption, not at sale. Confirm with the commercialista before go-live — it changes how the system issues documents.

8. Funnel diagnostics — proactive

Not tables of numbers: alerts with a threshold, a probable cause, and a suggested move, in plain language (e.g. "Starter→Client at 22%, below your 35% average: check the conversion conversation at the 3rd session"). Metrics to track:

Metric	Tells you	Alarm if…	Probable cause → move
Lead → Starter	The promo converts contacts	below baseline	Ads/offer/bot qualification → revise angle, Botpress opening
Starter → Client	The 140 € creates real clients	the key number	Missing conversion moment → structure the 3rd session
Average group fill	Revenue per trainer hour	empty groups	Thin slots → nudge to busy hours, revise the grid
Starter completion	All 4 sessions used?	sessions left over	Booking friction → simplify initial booking
Average first recharge	Client value at debut	low	Perceived value/packaging → work the recharge offer
Consumption velocity	Credits burned/week	slow	Disengagement coming → nudge + trainer contact
Re-recharge rate	Do they buy credits again?	low/late	Churn window → pre-exhaustion sequence
Breakage %	Expired unused credits	high	Onboarding doesn't create habit → act on first 3 weeks
Multi-service adoption	Positioning health	PT-only clients	Method underused → introduce mobility/osteo in starter
Retention per trainer	Who retains best	gap between trainers	Different approach → replicate what works
9. Trainer module

Check-in is the event that lights revenue: the trainer marking presence closes three things in one gesture — presence → credit charge → revenue recognition — from their phone, error-proof. Compensation can hook to credits consumed under the trainer's name: payroll and revenue coherent by construction.

Per-trainer calendar and availability, with group capacity as a system constraint. Programming and client notes at hand for real continuity. Roles: each trainer sees their own agenda and clients; finance stays owner-only. Roster is flexible: trainers are activated/deactivated, never deleted — whoever joins is operational same-day; whoever leaves is deactivated with clients reassigned and agenda freed, while consumed credits and performance stay historically attributed. Compensation is configurable per trainer and changeable over time: per-session (junior), revenue share (senior — strategically right for group PT), owner draw (Matteo). Owner double role: as trainer he appears in comparisons; as owner he alone sees financial data, and his compensation is segmented as a draw.

Performance = retention and results, not volume: client retention, group fill generated, rebooking rate, Starter→Client conversion, multi-service adoption, no-show rate of their clients — normalized for client mix, read as trends rather than rankings, used to replicate what works, never as a race to fill hours.

10. Member booking app

At a glance: proposed groups at your level + open slots compatible with your package. Maximum price at booking, real price at check-in. Balance and movements always visible. Cancellation flow states the 24h rule and its consequences for you and for the price. Notifications: session reminder, "a companion cancelled — here's your new estimate", low balance, expiring credits. Trainer side: mobile check-in, attendance, notes. Guiding principle of every screen: the member never discovers a cost; they understand it before — each booking screen says, in simple words, the maximum that session can cost and why.

11. Data model — entities
Entity	Role
Cliente	Profile + lifecycle state + consents/contract
Anamnesi	Goal, strength level, mobility level, history, clinical flags (special-category data)
Livello	Classification driving automatic group matching
Wallet / Movimento credito	Balance + ledger: +purchase / −consumption / −expiry / +refund
Servizio	Billable item with credit price and VAT treatment
Fascia prezzo	Per-head price by group size (50/35/30/25/20)
Contatore frequenza	Weekly PT entries per client; Sunday reset; drives the progressive discount
Gruppo / Slot	Session with max size, level, time, trainer
Prenotazione / Presenza	Hold → check-in → real-head calculation → charge + revenue
Pack ricarica / Starter Pack	Credit purchase SKUs by tier / fixed promo bundle
Trainer / Turno	Agenda, capacity, delivery, compensation base, active state
Pagamento / Documento fiscale	Cash-in, installments, invoice/receipt consistent with §7
12. Open decisions — ask before implementing anything that depends on these
Credit value: confirm 1 cr = 1 € at launch. 2. Credit prices for non-PT services. 3. Exact 24h window, credit expiry and reset policy. 4. Keep or drop the recharge-tier discount (double-discount risk with the frequency discount). 5. What counts as a frequency "entry" (mobility/osteopathy out?). 6. Frequency discount scale (−7/−14 proposed) and rounding rule. 7. VAT/voucher treatment with the commercialista — blocking for the fiscal module. 8. v1 perimeter: what ships first.