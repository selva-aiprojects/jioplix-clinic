# Clinic Admin Guide — Jioplix Clinic OS

As the clinic owner/admin you set up the clinic, manage the team and their permissions, watch money and operations, handle plans/add-ons, and support your staff.

Quick facts:

- **Login**: https://jioplix-clinic.vercel.app — pick your clinic, enter your mobile number and password. As admin you see everything and carry all permissions.
- **Your areas**: Team & Users, Billing/Plans, Analytics, Support, and clinic-level settings (Online Booking, ABDM, Campaigns, Teleconsultation).
- **Critical rule**: every staff member gets the least permissions their job needs. Assign roles at creation; adjust as the team changes.

---

## 1. Managing your team

Open **User Management** (`/users`):

- **Team members** — the people with sign-in access, their role badge, department, and status.
- **Add a team member** — create a user, assign a role and department, set their phone + password, and they're live immediately.
- **Roles** (in-built):
  - `tenant_admin` — everything (you).
  - `doctor` — clinical charts, diagnoses, prescriptions, sign-off.
  - `nurse` — vitals, patient read, queue.
  - `receptionist` — appointments, check-in, vitals.
  - `pharmacist` — dispense queue, drug master, stock.
  - `labtech` — lab orders and results.
  - `accountant` — billing/collections.
- **Deactivate** a departed staff member rather than deleting — it preserves the audit trail on their past work.

---

## 2. Money and operations

- **Billing** (`/billing`) — create and settle bills, track dues, collections summary.
- **Data entry full-name money view** — **Analytics** (`/analytics`): total revenue, billed vs collected over time, consultation volumes by day, no-shows, and drug mix. Treat these as your daily `P&L` snapshot.
- **Inventory** (`/inventory`) — stock counts, adjustments with approval trail, and spreadsheet import/reconciliation.

---

## 3. Plans, add-ons, and subscription

- **Plans & Add-ons** (`/addons`) — see your current plan (Starter/Professional/Clinic), toggle add-ons like **Pharmacy**, **Laboratory**, **Inventory**, **Procedures**.
- **Billing page** (`/plans`) — upgrade/downgrade, view invoices and payment history.
- Renewals are tracked by the platform (grace + auto-suspend on prolonged lapse). Keep payment on time; the whole clinic loses access once suspended.

---

## 4. Clinic services and patient outreach

- **Online Booking** (`/online-booking`) — switch on patient self-booking, set slot rules for each doctor, copy the booking link.
- **ABDM / ABHA** (`/abdm`) — enable ABHA-linked patient records for government interoperability.
- **Campaigns** (`/campaigns`) — send follow-up / recall messages (uses the patient phone numbers your team keeps updated).
- **Engagement** (`/engagement`) — feedback and satisfaction pulse.
- **Teleconsultation** (`/teleconsultation`) — schedule and run video consultations for remote patients.

---

## 5. Supporting your team

- **Support** (`/support`) — your staff file tickets for technical/billing/issues; you can raise them too. Tickets reach the platform team.
- Train staff with the role guides in this folder (`doctor.md`, `receptionist.md`, `pharmacist.md`, `labtech.md`) and the capture guide for creating your own training clips.
- Pocket the demo walkthrough: receptionist books/checks-in → vitals → doctor consults & prescribes → pharmacist dispenses → lab processes orders.

---

## 6. Security and good practice

- Audits: every clinical/sensitive action records the acting user and time. Encourage staff to use their own logins — never share accounts (it breaks the audit trail).
- **Only tenant admins** can manage users and plans. Delegated managers get specific roles.
- Review **Analytics** weekly, low/expiring stock in **Pharmacy ≥ Daily**, and no-shows monthly to tune reminder campaigns.

Still stuck? Raise a **Support** ticket or contact the Jioplix admin (`admin@jioplix.com`).