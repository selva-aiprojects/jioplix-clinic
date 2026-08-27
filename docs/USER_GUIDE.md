# Jioplix Clinic OS — Complete User Guide & Workflow Documentation

> **Version:** 1.0 | **Platform:** jioplix-clinic.vercel.app (Frontend) + jioplix-clinic-svc.onrender.com (API)
> **Date:** August 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Roles & Permissions](#2-roles--permissions)
3. [Authentication](#3-authentication)
4. [Platform Admin (Super Admin)](#4-platform-admin-super-admin)
5. [Tenant Admin / Clinic Admin](#5-tenant-admin--clinic-admin)
6. [Doctor](#6-doctor)
7. [Receptionist](#7-receptionist)
8. [Pharmacist](#8-pharmacist)
9. [Lab Technician / Lab Incharge](#9-lab-technician--lab-incharge)
10. [Nurse / Assistant](#10-nurse--assistant)
11. [Add-On Modules](#11-add-on-modules)
12. [Subscription & Billing](#12-subscription--billing)
13. [Support System](#13-support-system)
14. [Email Notifications](#14-email-notifications)
15. [Technical Reference](#15-technical-reference)

---

## 1. Platform Overview

Jioplix is a multi-tenant, AI-powered Clinic Operating System. Each clinic (tenant) operates in an isolated PostgreSQL schema with its own users, patients, appointments, and data.

### Architecture

| Layer | Technology | URL |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind | `jioplix-clinic.vercel.app` |
| API | NestJS 11 + PostgreSQL | `jioplix-clinic-svc.onrender.com/api/v1` |
| Database | PostgreSQL (Aiven Cloud) | Schema-per-tenant isolation |
| Email | Resend | `onboarding@cognivectra.com` |
| Payments | Razorpay | Payment links + order creation |

### Module Map

| Module | Description | Add-On? |
|---|---|---|
| Dashboard | Clinic overview stats, charts, queue | No |
| Patients | Patient registry, profiles, history | No |
| Appointments | Scheduling, calendar, queue management | No |
| Consultation | Clinical encounters, vitals, diagnosis, prescriptions | No |
| Billing | Invoices, payments, GST, PDF export | No |
| Analytics | Revenue trends, patient volume, period reports | No |
| Engagement | Patient messaging (WhatsApp/SMS/Email) | No |
| Campaigns | Bulk messaging with audience targeting | No |
| Online Booking | Public booking links, QR codes, time slots | No |
| Teleconsultation | Video sessions, scheduling, recording | No |
| ABDM / ABHA | Health record integration (India-specific) | No |
| Pharmacy | Prescription dispensing, stock | **Yes** |
| Laboratory | Lab orders, results pipeline | **Yes** |
| Inventory | Stock management, categories, CSV import | **Yes** |
| Procedures | Clinical procedure orders, auto-invoicing | **Yes** |
| User Management | Team members, roles, invitations | No |
| Support | Ticket-based support | No |
| Plans & Billing | Subscription, upgrades, discounts | No |

---

## 2. Roles & Permissions

### 2.1 Tenant-Level Roles

| Role | Key | Description |
|---|---|---|
| **Tenant Admin** | `tenant_admin` | Full access to everything (`*` wildcard) |
| **Clinic Admin** | `clinic_admin` | Manager/owner: patients, appointments, billing, reports, users, inventory (read) |
| **Doctor** | `doctor` | Clinical work: encounters, vitals, diagnoses, prescriptions, lab orders, procedures |
| **Receptionist** | `receptionist` | Front desk: patients, appointments, queue, billing, payments |
| **Nurse** | `nurse` | Support: vitals, queue, procedure execution, patient read |
| **Pharmacist** | `pharmacist` | Pharmacy: prescription dispensing, inventory CRUD |
| **Lab Technician** | `lab_technician` | Lab: lab order pipeline, results entry |
| **Accountant** | `accountant` | Finance: invoices, payments, reports |

### 2.2 Permission Matrix

| Capability | Tenant Admin | Clinic Admin | Doctor | Receptionist | Nurse | Pharmacist | Lab Tech | Accountant |
|---|---|---|---|---|---|---|---|---|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Patients** |||||||||
| View patients | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Create/edit patients | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| View patient profile | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| **Appointments** |||||||||
| View calendar | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Create/edit appointments | ✅ | ✅ | — | ✅ | — | — | — | — |
| Manage queue | ✅ | — | ✅ | ✅ | ✅ | — | — | — |
| **Consultation** |||||||||
| Start consultation | ✅ | — | ✅ | — | — | — | — | — |
| Enter vitals | ✅ | — | ✅ | ✅ | ✅ | — | — | — |
| Add diagnosis (ICD-10) | ✅ | — | ✅ | — | — | — | — | — |
| Write prescriptions | ✅ | — | ✅ | — | — | — | — | — |
| Lock encounter | ✅ | — | ✅ | — | — | — | — | — |
| **Billing** |||||||||
| View invoices | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| Create invoices | ✅ | ✅ | — | ✅ | — | — | — | ✅ |
| Record payments | ✅ | ✅ | — | ✅ | — | — | — | ✅ |
| **Pharmacy** |||||||||
| Dispense prescriptions | ✅ | — | — | — | — | ✅ | — | — |
| Manage inventory | ✅ | — (read) | — | — | — | ✅ | — | — |
| **Laboratory** |||||||||
| Create lab orders | ✅ | — | ✅ | — | — | — | ✅ | — |
| Enter/update results | ✅ | — | — | — | — | — | ✅ | — |
| **Procedures** |||||||||
| Order procedures | ✅ | — | ✅ | ✅ | — | — | — | — |
| Execute procedures | ✅ | — | — | — | ✅ | — | — | — |
| **Admin** |||||||||
| Manage users | ✅ | ✅ | — | — | — | — | — | — |
| View analytics/reports | ✅ | ✅ | — | — | — | — | — | ✅ |
| Manage campaigns | ✅ | ✅ | — | ✅ | — | — | — | — |
| Manage subscriptions | ✅ | ✅ | — | — | — | — | — | — |
| Create support tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 2.3 Platform-Level Role

| Role | Access |
|---|---|
| **Platform Super Admin** | Separate login at `/admin`. Manages ALL tenants, platform settings, platform-level tickets. Not part of any tenant. |

---

## 3. Authentication

### 3.1 Tenant Staff Login (`/login`)

**Two methods:**

**A. OTP Login (default)**
1. Enter Clinic ID (slug, e.g., `nova`)
2. Enter phone number
3. Click "Send verification code" → 6-digit OTP sent
4. Enter OTP within 5 minutes → Signed in

**B. Password Login**
1. Click "Use password instead"
2. Enter Clinic ID, phone number, and password
3. Click "Sign in"

**Forgot Password:**
1. Click "Forgot password?" on login screen
2. Enter email address
3. Check email for reset link (1-hour expiry)
4. Set new password (minimum 8 characters)

### 3.2 Platform Admin Login (`/admin`)

- Email: `admin@jioplix.com`
- Password: `admin1234`
- Completely separate from tenant authentication

### 3.3 New Clinic Registration (`/register`)

**3-Step Wizard:**
1. **Clinic Details:** Name, type (General/Dental/Pediatric/etc.), phone, email
2. **Admin Setup:** Admin name, email, password
3. **Plan Selection:** Starter / Professional / Clinic / Enterprise → Success screen

**Result:** Tenant created, admin user provisioned, 14-day free trial started, welcome email with credentials sent.

### 3.4 Post-Registration Onboarding (`/onboarding`)

After first login, a setup wizard guides through:
1. Clinic profile (address, timings, logo)
2. First doctor setup
3. First receptionist setup
4. Add-on activation

---

## 4. Platform Admin (Super Admin)

**Login:** `jioplix-clinic.vercel.app/admin` → Email + Password

### 4.1 Dashboard Overview

The platform admin sees:
- **Total Tenants:** All registered clinics
- **Active / Trialing / Suspended:** Status breakdown
- **Revenue:** Total pending and total collected
- **Recent activity** across all tenants

### 4.2 Tenant Management

| Action | How |
|---|---|
| **View all tenants** | Table with name, slug, status, plan, created date |
| **Suspend a tenant** | Click "Suspend" → confirmation → tenant locked, staff see suspended page |
| **Reactivate** | Click "Reactivate" → tenant restored |
| **Offboard** | Click "Offboard" → permanent removal |
| **View tenant users** | API: `GET /platform/tenants/:id/users` → lists all staff with roles |
| **Reset tenant user password** | API: `POST /platform/tenants/:id/users/reset-password` |
| **Extend trial** | API: `POST /billing/platform/extend-trial/:tenantId` with `{ days: N }` |

### 4.3 Support Tickets (`/admin/tickets`)

| Action | How |
|---|---|
| View all tickets | Filterable by status: Open, In Progress, Resolved, Closed |
| View ticket details | Click ticket → shows thread with all messages |
| Reply to ticket | Type response → "Support Team" attributed |
| Change status | Dropdown: Open → In Progress → Resolved → Closed |
| Stats dashboard | Cards showing counts per status |

### 4.4 Platform Settings (`/admin/settings`)

| Setting | Description |
|---|---|
| **Payment Enabled** | Toggle Razorpay integration on/off |
| **Registration Enabled** | Toggle new clinic registration |
| **Trial Days** | Default trial period (default: 14) |
| **Grace Period Days** | Days after expiry before suspension (default: 7) |
| **Platform Name** | Display name |
| **Support Email** | Contact email |
| **Support Phone** | Contact phone |

---

## 5. Tenant Admin / Clinic Admin

**Login:** `/login` with admin credentials

### 5.1 Dashboard

| Widget | Shows |
|---|---|
| **Total Patients** | Count of registered patients |
| **Today's Appointments** | Booked, completed, cancelled |
| **Queue** | Current waiting count |
| **Revenue** | Today / This month |
| **Revenue Chart** | Daily revenue trend (line chart) |
| **Today's Queue** | Patient names, wait times, status |
| **Recent Patients** | Latest registrations |

### 5.2 Patient Management (`/patients`)

| Feature | How |
|---|---|
| **View all patients** | Tabs: All, Recent, Follow-up Due, Chronic |
| **Search** | By name, phone, ID |
| **Add patient** | Click "Add Patient" → fill demographics (name, age, gender, phone, email, address, ABHA ID) |
| **View profile** | Click patient → full profile with encounter timeline, vitals charts, prescriptions, invoices |
| **Export PDF** | Button on patient profile → printable summary |

### 5.3 Appointment Management (`/appointments`)

| Feature | How |
|---|---|
| **Calendar view** | Date navigation, color-coded by status |
| **Create appointment** | Select date/time, patient, doctor, type (walk-in/online/follow-up) |
| **Check-in** | Mark patient as arrived → adds to queue |
| **Start consultation** | Begin clinical encounter |
| **Complete** | Mark as done |
| **Cancel** | Cancel with reason |
| **Queue integration** | Real-time queue position display |

### 5.4 Billing (`/billing`)

| Feature | How |
|---|---|
| **Create invoice** | Line items: consultation, procedure, pharmacy, lab, other |
| **GST calculation** | Auto CGST/SGST/IGST based on state |
| **Record payment** | Methods: UPI, Cash, Card, Online, Credit |
| **Invoice statuses** | Draft → Issued → Partial → Paid / Void / Refunded |
| **PDF export** | Download/print invoice |
| **View history** | Filter by date, status, patient |

### 5.5 Analytics (`/analytics`)

| Feature | How |
|---|---|
| **Revenue trends** | Line chart with period filters (7d/30d/90d) |
| **Patient volume** | Daily patient count chart |
| **Top drugs** | Most prescribed medications |
| **Appointment stats** | Completed, cancelled, no-show rates |

### 5.6 User Management (`/users`)

| Feature | How |
|---|---|
| **View team** | List with name, role, department, status |
| **Filter by role** | Dropdown: All, Doctor, Receptionist, Nurse, etc. |
| **Invite user** | Form: name, email, phone, role, department |
| **Deactivate** | Remove access without deleting data |

### 5.7 Engagement & Campaigns

**Engagement (`/engagement`):**
- Appointment reminders (WhatsApp/SMS)
- Prescription notifications
- Follow-up reminders
- Payment reminders

**Campaigns (`/campaigns`):**
- Create bulk campaigns
- Audience targeting: All patients, Appointment-based, Follow-up due, Inactive
- Channels: WhatsApp, SMS, Email
- Delivery tracking: Sent, Delivered, Read, Failed

### 5.8 Online Booking (`/online-booking`)

| Feature | How |
|---|---|
| **Generate booking link** | Public URL for patients to self-book |
| **QR code** | Printable QR for clinic front desk |
| **Time slots** | 30-min intervals, 8:00 AM – 7:30 PM |
| **View bookings** | Status: Confirmed, Pending, Cancelled |

---

## 6. Doctor

**Primary pages:** Dashboard, Patients, Appointments, Consultation, Laboratory, Procedures

### 6.1 Daily Workflow

```
Morning Login
    │
    ├── View Dashboard → See today's appointments and queue
    │
    ├── /appointments → Review calendar
    │     └── Check-in patient → "Start Consultation"
    │
    ├── /consultation → Clinical encounter
    │     ├── Record vitals (height, weight, BP, temp, SpO2, pulse)
    │     ├── Search & add ICD-10 diagnosis
    │     ├── AI-assisted clinical notes (OCR from paper prescriptions)
    │     ├── Write prescription (drug search, dosage, frequency, duration)
    │     ├── Use Rx templates for common prescriptions
    │     ├── Select language for print (English/Hindi/Kannada/Tamil/Telugu/Marathi)
    │     ├── Print/PDF prescription
    │     └── Lock encounter (finalizes clinical record)
    │
    ├── /laboratory → Order lab tests
    │     └── Create lab order → assigned to lab technician
    │
    ├── /procedures → Order clinical procedures
    │     └── Select procedure → auto-creates invoice
    │
    └── /patients → Review patient history between consultations
```

### 6.2 Consultation Page — Detailed Workflow

**Step 1: Start Encounter**
- Select patient (from appointment or search)
- System creates encounter record

**Step 2: Vitals Entry**
- Height (cm), Weight (kg)
- Blood Pressure (systolic/diastolic)
- Temperature (°F), Pulse (bpm), SpO2 (%)
- Previous vitals shown for comparison

**Step 3: Diagnosis**
- Search ICD-10 codes (autocomplete)
- Add primary + secondary diagnoses
- Notes per diagnosis

**Step 4: Clinical Notes**
- AI-powered note generation from prescription image (OCR)
- Manual editing supported
- Language selection for output

**Step 5: Prescription**
- Drug search (linked to drug master database)
- Dosage, frequency (BD/TD/QID/HS/PRN), duration
- Instructions (before/after food, with water, etc.)
- Multi-drug prescriptions supported
- Rx templates for common conditions (e.g., "Upper Respiratory Infection")

**Step 6: Finalize**
- Print prescription (patient copy)
- Export PDF
- Lock encounter (immutable after locking)

### 6.3 Lab Orders

| Status | Meaning |
|---|---|
| Ordered | Doctor created, awaiting collection |
| Collected | Sample collected by lab |
| Processing | Lab running tests |
| Completed | Results ready |
| Reviewed | Doctor has reviewed results |

### 6.4 Procedures

| Status | Meaning |
|---|---|
| Ordered | Doctor requested |
| Prepared | Room/equipment ready |
| In Progress | Being performed |
| Completed | Done → auto-invoice created |

---

## 7. Receptionist

**Primary pages:** Dashboard, Patients, Appointments, Billing, Engagement

### 7.1 Daily Workflow

```
Morning Login
    │
    ├── View Dashboard → Check queue, today's appointments
    │
    ├── /appointments → Manage schedule
    │     ├── New appointment → select patient, doctor, time
    │     ├── Check-in arriving patients → update queue
    │     └── Handle walk-ins
    │
    ├── /patients → Register new patients
    │     ├── Walk-in registration
    │     ├── Phone appointment booking
    │     └── Update patient demographics
    │
    ├── /billing → Handle payments
    │     ├── Create invoice (after consultation)
    │     ├── Record payment (cash/UPI/card/online)
    │     ├── Print invoice
    │     └── Handle insurance/credit billing
    │
    └── /engagement → Send reminders
          ├── Appointment reminders
          ├── Follow-up messages
          └── Payment reminders
```

### 7.2 Key Receptionist Tasks

| Task | Page | Steps |
|---|---|---|
| Register walk-in | `/patients` | Add Patient → fill form → save |
| Book appointment | `/appointments` | Create → select patient → select doctor → select time → save |
| Check-in patient | `/appointments` | Find appointment → "Check-in" → patient added to queue |
| Create invoice | `/billing` | New Invoice → add line items → apply GST → issue |
| Record payment | `/billing` | Open invoice → "Record Payment" → select method → confirm |
| Print prescription | `/consultation` | (View only — doctor handles consultation) |
| Send follow-up | `/engagement` | Select patient → compose message → send |

### 7.3 Queue Management

- Real-time queue displayed on Dashboard
- Patient status: Waiting → With Doctor → Completed
- Wait time tracking
- Priority override for emergency cases

---

## 8. Pharmacist

**Primary pages:** Dashboard, Pharmacy, Inventory

### 8.1 Daily Workflow

```
Login
    │
    ├── /pharmacy → Prescription dispense queue
    │     ├── View pending prescriptions
    │     ├── Check stock availability
    │     ├── Dispense prescription
    │     │   ├── Verify drugs against prescription
    │     │   ├── Check expiry dates
    │     │   ├── Record dispensed quantities
    │     │   └── Mark as dispensed → linked to invoice
    │     └── Handle partial dispense (partial stock)
    │
    ├── /inventory → Stock management
    │     ├── View stock levels by category
    │     ├── Record new stock (purchase entry)
    │     ├── Adjust stock (damages, returns, transfers)
    │     ├── Set reorder alerts (min quantity)
    │     ├── Check expiry warnings
    │     └── CSV import for bulk stock entry
    │
    └── /billing → View linked invoices (read-only)
```

### 8.2 Pharmacy Dispense Workflow

```
Prescription Queue
    │
    ├── Pending prescriptions listed
    │     ├── Patient name, doctor, drugs, quantities
    │     └── Stock status (green/yellow/red)
    │
    ├── Click "Dispense"
    │     ├── Each drug line:
    │     │   ├── Prescribed quantity vs available stock
    │     │   ├── Batch number selection
    │     │   ├── Expiry date check
    │     │   └── Dispensed quantity (can be less if partial)
    │     ├── Confirm dispense
    │     └── Prescription marked as "Dispensed"
    │
    └── Stock auto-deducted from inventory
```

### 8.3 Inventory Categories

| Category | Examples |
|---|---|
| Medicines | Tablets, syrups, injections, ointments |
| Consumables | Syringes, gloves, bandages, cotton |
| Lab Reagents | Blood test reagents, staining chemicals |
| Dental Materials | Fillings, cements, impression material |
| Clinic Supplies | Paper, forms, printer supplies |
| Equipment | Stethoscopes, BP monitors, pulse oximeters |

### 8.4 Stock Adjustment Types

| Type | Use Case |
|---|---|
| Purchase | New stock received from supplier |
| Dispense | Given to patient (auto from pharmacy) |
| Transfer | Moved between branches |
| Adjustment | Manual correction (damage, expiry, count mismatch) |

---

## 9. Lab Technician / Lab Incharge

**Primary pages:** Dashboard, Laboratory, Inventory (read-only)

### 9.1 Daily Workflow

```
Login
    │
    ├── /laboratory → Lab order pipeline
    │     ├── View new orders (status: "Ordered")
    │     ├── Collect samples → update to "Collected"
    │     ├── Process tests → update to "Processing"
    │     ├── Enter results → update to "Completed"
    │     │   ├── Free-text results
    │     │   ├── Reference ranges
    │     │   ├── Abnormal flags
    │     │   └── Attach files/images
    │     └── Doctor reviews → status "Reviewed"
    │
    ├── /inventory → View lab reagents (read-only for lab tech)
    │     └── Check stock levels for test kits/reagents
    │
    └── Dashboard → View today's lab orders and turnaround times
```

### 9.2 Lab Order Pipeline

```
Doctor creates order
        │
        ▼
    ┌─────────┐
    │ Ordered │  ← Doctor created, sample not yet collected
    └────┬────┘
         │ Collect sample
         ▼
    ┌──────────┐
    │ Collected│  ← Sample in hand, ready for processing
    └────┬─────┘
         │ Begin testing
         ▼
    ┌────────────┐
    │ Processing │  ← Tests in progress
    └────┬───────┘
         │ Tests complete
         ▼
    ┌───────────┐
    │ Completed │  ← Results entered, awaiting doctor review
    └────┬──────┘
         │ Doctor reviews
         ▼
    ┌──────────┐
    │ Reviewed │  ← Final, doctor has signed off
    └──────────┘
```

### 9.3 Lab Results Entry

| Field | Description |
|---|---|
| Test name | Auto-populated from order |
| Result value | Numeric or text |
| Unit | mg/dL, g/L, etc. |
| Reference range | Normal range for the test |
| Flag | Normal / Low / High / Critical |
| Notes | Additional observations |

---

## 10. Nurse / Assistant

**Primary pages:** Dashboard, Appointments (queue), Consultation (vitals), Procedures

### 10.1 Daily Workflow

```
Login
    │
    ├── Dashboard → View queue status
    │
    ├── /appointments → Queue management
    │     ├── Check in patients
    │     ├── Update queue status
    │     └── Redirect patients to correct rooms
    │
    ├── /consultation → Vitals entry (before doctor sees patient)
    │     ├── Record height, weight, BP, temp, SpO2, pulse
    │     ├── Previous vitals for comparison
    │     └── Save → Doctor sees values in consultation
    │
    ├── /procedures → Execute procedures
    │     ├── View ordered procedures
    │     ├── Prepare room/equipment
    │     ├── Execute procedure → update status
    │     └── Mark completed
    │
    └── /patients → View patient info (read-only)
```

### 10.2 Vitals Entry

The nurse typically enters vitals **before** the doctor consultation:

1. Patient arrives → check in via queue
2. Nurse opens consultation → Vitals tab
3. Enter measurements:
   - Height: `___` cm
   - Weight: `___` kg
   - Blood Pressure: `___/___` mmHg
   - Temperature: `___` °F
   - Pulse: `___` bpm
   - SpO2: `___` %
4. Save → Doctor sees all values when starting consultation

---

## 11. Add-On Modules

### 11.1 Pharmacy (`/pharmacy`)

**Requires:** Pharmacy add-on entitlement
**Primary role:** Pharmacist

- Prescription dispense queue
- Stock verification before dispense
- Batch tracking and expiry management
- Auto-deduction from inventory
- Partial dispense support (when stock is low)
- Invoice linking for billing

### 11.2 Laboratory (`/laboratory`)

**Requires:** Laboratory add-on entitlement
**Primary role:** Lab Technician

- 5-stage order pipeline
- Sample collection tracking
- Results entry with reference ranges
- Doctor review workflow
- Turnaround time tracking

### 11.3 Inventory (`/inventory`)

**Requires:** Inventory add-on entitlement
**Primary role:** Pharmacist, Clinic Admin

- 6 categories (Medicines, Consumables, Lab Reagents, Dental Materials, Clinic Supplies, Equipment)
- Stock movements with audit trail
- Reorder alerts (minimum quantity threshold)
- Expiry warnings (30-day advance alert)
- CSV import/export for bulk operations
- Multi-branch transfer support

### 11.4 Procedures (`/procedures`)

**Requires:** Procedures add-on entitlement
**Primary role:** Doctor (order), Nurse (execute)

- Pre-defined procedure catalog
- 4-stage pipeline: Ordered → Prepared → In Progress → Completed
- Auto-invoice creation on completion
- Room and equipment assignment

---

## 12. Subscription & Billing

### 12.1 Plans

| Plan | Price/mo | Doctors | Key Features |
|---|---|---|---|
| **Starter** | ₹699 | 1 | Basic: patients, appointments, billing |
| **Professional** | ₹1,999 | 2 | +Pharmacy, +Lab, +Inventory |
| **Clinic** | ₹3,999 | 3 | +All add-ons, +Accountant role |
| **Enterprise** | Custom | 4+ | Custom features, dedicated support |

### 12.2 Trial Lifecycle

```
Registration
    │
    ▼
14-Day Free Trial ──→ Day 12: Gentle reminder email
    │                     │
    │                  Day 2: Urgent reminder email
    │                     │
    ▼                     ▼
Trial Expires ──→ Payment followup to platform admin
    │
    ▼
7-Day Grace Period ──→ Still accessible
    │
    ▼
Suspension ──→ /suspended page shown ──→ "Pay Now" CTA (Razorpay)
    │
    ▼
Payment ──→ Reactivation ──→ Access restored
    │
    ▼
30 Days No Payment ──→ Data may be deleted
```

### 12.3 Upgrades & Discounts

| Action | How |
|---|---|
| View plans | `/plans` → plan comparison cards |
| Apply discount | Enter code (e.g., `WELCOME20` = 20% off) → validate |
| Upgrade | Click "Upgrade" on higher plan → prorated amount calculated |
| Downgrade | Click "Switch" on lower plan → takes effect next billing cycle |
| Payment | Razorpay payment link or in-app checkout |

### 12.4 Platform Admin Subscription Actions

| Action | API |
|---|---|
| Extend trial | `POST /billing/platform/extend-trial/:tenantId` `{ days: 30 }` |
| Suspend tenant | Via admin panel → Tenant actions → Suspend |
| Reactivate | Via admin panel → Tenant actions → Reactivate |

---

## 13. Support System

### 13.1 Clinic-Level Support (`/support`)

**Any staff member** can create support tickets.

| Feature | How |
|---|---|
| Create ticket | "New ticket" → Subject, Category, Priority, Message |
| Categories | Technical Issue, Billing, Feature Request, Onboarding Help, General |
| Priorities | Low, Normal, High |
| View tickets | List with status badges: Open, In Progress, Resolved, Closed |
| Reply | Type in reply box → sends to platform support team |
| Email notification | When platform replies → email sent to tenant admin |

### 13.2 Platform-Level Support (`/admin/tickets`)

**Platform Admin only.**

| Feature | How |
|---|---|
| View all tickets | Across all tenants, filterable by status |
| Stats dashboard | Open, In Progress, Resolved, Closed counts |
| Reply to ticket | "Support Team" attributed, email sent to tenant |
| Change status | Dropdown to update ticket status |
| Tenant context | Each ticket shows which clinic it belongs to |

---

## 14. Email Notifications

### 14.1 Automated Emails

| Trigger | Recipient | Template |
|---|---|---|
| Clinic registration | Tenant admin | Welcome email with credentials |
| Password reset request | Requester | Reset link (1-hour expiry) |
| Account suspended | Tenant admin | Suspension notice + renewal CTA |
| Trial reminder (12 days) | Tenant admin | Gentle nudge |
| Trial reminder (2 days) | Tenant admin | Urgent warning |
| Payment followup | Platform admin | Clinic details, amount, overdue days |
| Monthly receivable report | Platform admin | Collected vs pending summary |
| Support ticket reply | Tenant admin | Reply notification with link |

### 14.2 Email Provider

- **Provider:** Resend
- **From:** `HIMS Onboarding <onboarding@cognivectra.com>`
- **Dedup:** `email_logs` table prevents duplicate sends per tenant per day

---

## 15. Technical Reference

### 15.1 API Endpoints Summary

| Category | Endpoint | Method | Auth |
|---|---|---|---|
| **Auth** | `/auth/login` | POST | Public |
| | `/auth/send-otp` | POST | Public |
| | `/auth/verify-otp` | POST | Public |
| | `/auth/refresh` | POST | Refresh token |
| | `/auth/forgot-password` | POST | Public |
| | `/auth/reset-password` | POST | Public |
| **Registration** | `/register` | POST | Public |
| | `/plans` | GET | Public |
| **Patients** | `/patients` | GET/POST | Tenant |
| | `/patients/:id` | GET/PUT | Tenant |
| **Appointments** | `/appointments` | GET/POST | Tenant |
| | `/appointments/:id` | PATCH | Tenant |
| **Consultation** | `/encounters` | POST | Tenant |
| | `/encounters/:id` | GET/PUT | Tenant |
| **Billing** | `/invoices` | GET/POST | Tenant |
| | `/invoices/:id/payments` | POST | Tenant |
| **Pharmacy** | `/pharmacy/prescriptions` | GET | Tenant |
| | `/pharmacy/dispense` | POST | Tenant |
| **Laboratory** | `/lab/orders` | GET/POST | Tenant |
| | `/lab/orders/:id` | PATCH | Tenant |
| **Inventory** | `/inventory/items` | GET/POST | Tenant |
| | `/inventory/movements` | POST | Tenant |
| **Procedures** | `/procedures` | GET/POST | Tenant |
| | `/procedures/:id` | PATCH | Tenant |
| **Users** | `/users` | GET/POST | Tenant |
| **Analytics** | `/analytics/summary` | GET | Tenant |
| **Support** | `/support/tickets` | GET/POST | Tenant |
| | `/support/platform/tickets` | GET | Platform |
| **Subscription** | `/billing/plans` | GET | Public |
| | `/billing/upgrade` | POST | Tenant |
| **Platform** | `/platform/login` | POST | Public |
| | `/platform/tenants` | GET | Platform |
| | `/platform/dashboard` | GET | Platform |
| | `/platform/settings` | GET/PUT | Platform |

### 15.2 Database Architecture

```
public (shared schema)
├── tenants              # Clinic registry
├── plans                # Subscription plans
├── subscriptions        # Active subscriptions per tenant
├── tenant_invoices      # Billing records
├── platform_users       # Platform admin accounts
├── platform_settings    # Global settings (key-value)
├── discount_codes       # Promotional codes
├── password_reset_tokens # Password reset tokens
├── support_tickets      # Support ticket headers
├── support_ticket_responses # Ticket messages
├── email_logs           # Sent email tracking
└── audit_logs           # Immutable audit trail

t_<hash8> (per-tenant schema)
├── users                # Staff accounts
├── roles                # Role definitions
├── user_branch_roles    # User-role-branch assignments
├── branches             # Clinic branches
├── patients             # Patient registry
├── appointments         # Scheduling
├── encounters           # Clinical encounters
├── vitals               # Patient measurements
├── diagnoses            # ICD-10 codes
├── prescriptions        # Drug prescriptions
├── prescription_items   # Individual drug lines
├── invoices             # Billing
├── invoice_items        # Line items
├── payments             # Payment records
├── inventory_items      # Stock items
├── inventory_movements  # Stock transactions
├── lab_orders           # Lab test orders
├── lab_results          # Test results
├── procedures           # Clinical procedures
├── notifications        # In-app notifications
├── audit_logs           # Per-tenant audit trail
├── drug_master          # Drug database
└── icd10_master         # ICD-10 diagnosis codes
```

### 15.3 Key Behaviors

| Behavior | Description |
|---|---|
| **Schema isolation** | Each tenant's data is in a separate PostgreSQL schema |
| **JWT authentication** | 15-minute access tokens, 7-day refresh tokens |
| **Permission matching** | Supports exact, module wildcard (`module:*`), and global wildcard (`*`) |
| **Grace period** | 7 days after trial expiry before suspension |
| **Trial reminders** | Automated at day 12 and day 2 before expiry |
| **Email dedup** | `email_logs` prevents duplicate sends per tenant per day |
| **Audit trail** | All entity changes logged with actor, old/new values, IP, user agent |
| **Offline support** | PWA with service worker for offline capability |
| **AI features** | OCR-based clinical notes, AI copilot suggestions |

---

*Document generated from codebase analysis. For updates, refer to the source code at `github.com/selva-aiprojects/jioplix-clinic`.*
