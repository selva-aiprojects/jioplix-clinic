# Pharmacist's Guide — Jioplix Clinic OS

You turn prescriptions into dispensed medicines. The system keeps a queue of prescriptions awaiting your action and updates stock for every item you dispense.

Quick facts:

- **Login**: https://jioplix-clinic.vercel.app — pick your clinic, enter your mobile number and password.
- **Permissions**: view prescriptions and the dispense queue, dispense, and manage the medicine master / stock.
- **Critical rule**: you can dispense as soon as the doctor **issues** the prescription — even after the consultation is signed. Dispensing deducts stock automatically.

---

## 1. Opening the pharmacy

From the sidebar open **Pharmacy** (`/pharmacy`). Your main work is on three tabs:

- **Dispense Queue** — prescriptions waiting for you.
- **Drug Master** — the clinic's medicine list and stock levels.
- **Today's Sales** — medicines dispensed and revenue collected today.

The top of the screen has live counters: **Pending Rx**, **Ready to Dispense**, **Dispensed Today**, **Collected Today (₹)**, **Low Stock**, **Expiring ≤ 90d**.

---

## 2. Dispensing a prescription

1. Open **Pharmacy → Dispense Queue**.
2. Each prescription shows the patient, doctor, date, and the line items (drug, strength, dosage, frequency, duration, instructions).
3. If every item has stock, press **Dispense All**.
4. Stock is deducted for each item and the prescription moves to **Dispensed**.

> If medicine is out of stock, the item is flagged (Out of Stock / Low Stock) and **Dispense All** is disabled — you dispense only what's available or contact the doctor.

---

## 3. Stock and the Drug Master

**Drug Master**: every medicine the clinic stocks, with quantity, reorder level, expiry, and unit cost. Anything you dispense must exist here, so maintain it as part of your routine.

- **In Stock / Low Stock / Out of Stock / Expiring Soon** badges tell you what needs attention.
- If a medicine is missing, add it to the Drug Master so future prescriptions can be dispensed against stock.

For bulk corrections or receiving new stock, open **Inventory** (`/inventory`) — adjust quantities there (with approval trail) and use the import/reconcile flow for spreadsheets.

---

## 4. Handling common situations

| Situation | What to do |
| --- | --- |
| Prescription shows `draft`, not `issued` | Ask the doctor to **Issue** it. You can only dispense issued prescriptions. |
| Patient returns &mdash; same prescription | When a prescription is dispensed it's closed. The doctor issues a fresh prescription for a repeat (or a refill plan). |
| Some items out of stock | Dispense what's in stock (the queue highlights availability), note the shortage, and order stock in **Inventory**. |
| Wrong medicine on the prescription | Do **not** dispense — send it back to the doctor to rewrite. |
| Need to look up a drug | Use **Drug Master** search by name/generic. |

---

## 5. Closing notes

- Every dispense is recorded against your user ID and timestamp (audit trail).
- The prescription status shown in the doctor's chart auto-updates to **Dispensed** once you act.
- Keep expiry dates updated in the Drug Master — the "Expiring soon" counter is your re-check ticker.

Still stuck? Use **Support** in the sidebar to file a ticket.