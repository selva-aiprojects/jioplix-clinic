# Jioplix Clinic — Product Refactor Plan

Version: 1.0  
Date: 2026-08-22  
Status: Ready for Review

---

## 1. Current State Assessment

Jioplix is a monorepo (React 19 + NestJS + Postgres) with schema-per-tenant multi-tenancy, JWT auth, and 4 backend modules (patients, appointments, auth, health). The frontend has 13 polished pages, but most clinical, billing, and operational workflows are static mockups.

**What works:**
- Multi-tenant isolation with transaction-local search_path
- JWT + rotating refresh + RBAC guards
- Unified design system (PageHeader, StatCard, Button, Badge)
- Patient CRUD + trigram search
- Appointment + queue state machines with token auto-generation
- 29/29 smoke tests passing

**What doesn't:**
- No encounters/EMR API — Consultation page is demo-only
- No prescriptions API
- No billing/payments API
- No pharmacy, lab, inventory, procedures APIs
- No audit logging writes
- No AI job infrastructure
- No patient timeline/history
- No specialty templates
- No ABDM integration beyond ABHA number field
- No backup/DR automation
- No observability

---

## 2. Refactor Principles

1. **Backend-first.** Every UI page must have a live API before we call it "done."
2. **Workflow over module.** Organize by patient journey, not by HMS modules.
3. **Specialty as extension, not rebuild.** Core EMR + specialty packs.
4. **AI as copilot, not chatbot.** Async jobs, doctor review required, never silent persistence.
5. **Audit everything.** Every clinical/financial mutation writes an audit row in the same transaction.
6. **Role-centric UX.** Each role sees only what they need.
7. **India-first.** Paise integers, GST splits, UPI, WhatsApp, ABDM-ready.

---

## 3. Phase Overview

| Phase | Name | Duration | Exit Criteria |
|---|---|---|---|
| **M2 Core Clinical** | Encounters + Prescriptions + Billing | 6–8 weeks | Doctor can complete consultation → prescription → bill |
| **M2.1 Revenue Add-ons** | Pharmacy + Lab + Inventory + Procedures | 6–8 weeks | Add-on modules gated by entitlements |
| **M3 Intelligence** | AI + Analytics + Engagement | 4–6 weeks | Async AI jobs, patient timeline, analytics |
| **M4 Specialty + Compliance** | Templates + ABDM + Security Hardening | 4–6 weeks | Specialty packs, ABDM v0, audit complete |

---

## 4. M2 Core Clinical (Weeks 1–8)

Goal: Transform Jioplix from a scheduling app into a functioning clinic EMR.

### 4.1 Database Migrations

Add to `packages/db/migrations/tenant/`:

**0005_encounters.sql** — Core clinical record
```sql
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  history_present_illness TEXT,
  examination_findings TEXT,
  clinical_notes TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS encounters_patient_idx ON encounters (patient_id);
CREATE INDEX IF NOT EXISTS encounters_doctor_date_idx ON encounters (doctor_id, encounter_date);
CREATE INDEX IF NOT EXISTS encounters_appointment_idx ON encounters (appointment_id);
```

**0005_encounters_vitals.sql** — Vitals per encounter
```sql
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  bp_systolic INT,
  bp_diastolic INT,
  pulse INT,
  temperature_c DECIMAL(4,1),
  spo2 INT,
  weight_kg DECIMAL(5,1),
  height_cm DECIMAL(5,1),
  bmi DECIMAL(4,1),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL REFERENCES users(id)
);
```

**0005_encounters_diagnoses.sql** — ICD-10 diagnoses
```sql
CREATE TABLE IF NOT EXISTS encounter_diagnoses (
  id UUID PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  icd10_code TEXT NOT NULL,
  icd10_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('primary', 'secondary', 'differential')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**0006_prescriptions.sql** — Prescriptions + items
```sql
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'dispensed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prescriptions_encounter_idx ON prescriptions (encounter_id);
CREATE INDEX IF NOT EXISTS prescriptions_patient_idx ON prescriptions (patient_id);

CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  strength TEXT,
  form TEXT CHECK (form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other')),
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT CHECK (route IN ('oral', 'topical', 'injection', 'inhaled', 'other')),
  duration_days INT,
  quantity INT,
  instructions TEXT,
  sequence INT NOT NULL DEFAULT 0
);
```

**0007_billing.sql** — Invoices + payments
```sql
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  encounter_id UUID REFERENCES encounters(id),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sub_total_paise BIGINT NOT NULL,
  discount_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise BIGINT NOT NULL DEFAULT 0,
  sgst_paise BIGINT NOT NULL DEFAULT 0,
  igst_paise BIGINT NOT NULL DEFAULT 0,
  round_off_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL,
  paid_paise BIGINT NOT NULL DEFAULT 0,
  balance_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'void', 'refunded')),
  issued_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_patient_idx ON invoices (patient_id);
CREATE INDEX IF NOT EXISTS invoices_branch_date_idx ON invoices (branch_id, created_at);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('consultation', 'procedure', 'pharmacy', 'lab', 'other')),
  item_name TEXT NOT NULL,
  hsn_code TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price_paise BIGINT NOT NULL,
  line_total_paise BIGINT NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  sequence INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount_paise BIGINT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'card', 'online', 'credit')),
  reference TEXT,
  received_by UUID NOT NULL REFERENCES users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);
```

**0008_audit_trigger.sql** — Auto-audit via triggers (supplements application-level audit)
```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (entity, entity_id, action, old_value, new_value, created_at)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables (example pattern; apply per table)
-- CREATE TRIGGER patients_audit AFTER INSERT OR UPDATE OR DELETE ON patients
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### 4.2 Backend Modules

#### 4.2.1 Encounters Module
**Files:** `apps/api/src/encounters/encounters.controller.ts`, `encounters.service.ts`

Endpoints:
- `POST /encounters` — create encounter from appointment or ad-hoc
- `GET /encounters/:id` — read encounter with vitals + diagnoses
- `PATCH /encounters/:id` — update encounter (blocked if locked)
- `POST /encounters/:id/vitals` — record vitals
- `POST /encounters/:id/diagnoses` — add ICD-10 diagnosis
- `POST /encounters/:id/lock` — sign/close encounter (doctor only)
- `POST /encounters/:id/addendum` — add correction note (requires locked)

Business rules:
- Encounter becomes immutable after `lock`
- Corrections require `addendum` linked to original encounter
- `updated_at` tracked but `old_value` captured in audit_logs
- Doctor role required for lock; receptionist can create draft only

#### 4.2.2 Prescriptions Module
**Files:** `apps/api/src/prescriptions/prescriptions.controller.ts`, `prescriptions.service.ts`

Endpoints:
- `POST /prescriptions` — create from encounter
- `GET /prescriptions/:id` — read with items
- `PATCH /prescriptions/:id` — update (draft only)
- `POST /prescriptions/:id/items` — add medication line
- `PATCH /prescriptions/:id/status` — draft → issued → cancelled

Business rules:
- Prescription tied to one encounter
- Drug name required; strength/form/frequency/duration/quantity recommended
- Status machine: draft → issued → (dispensed | cancelled)
- Dispensed status set by pharmacy module on fulfillment

#### 4.2.3 Billing Module
**Files:** `apps/api/src/billing/billing.controller.ts`, `billing.service.ts`

Endpoints:
- `POST /invoices` — create invoice from encounter/items
- `GET /invoices/:id` — read invoice with lines + payments
- `PATCH /invoices/:id` — add discount, void (admin only)
- `POST /invoices/:id/lines` — add line item
- `POST /invoices/:id/payments` — record payment (idempotency key required)
- `GET /invoices` — list with filters (date, patient, status)
- `GET /patients/:id/outstanding` — outstanding balance

Business rules:
- All monetary values: BIGINT paise
- Invoice number: `INV-{YYYY}-{sequence}` per branch
- GST split per line (cgst_rate, sgst_rate, igst_rate)
- Payments immutable; refunds are new payment rows with negative amount
- Idempotency-Key header required on POST /payments
- Balance auto-calculated: total - paid

#### 4.2.4 Audit Service
**File:** `apps/api/src/common/audit.service.ts`

- Injectable service used by all other services
- Writes to `audit_logs` in same transaction as business write
- Captures: actor, entity, entity_id, action, old_value, new_value, reason, ip, user_agent
- Applied to: encounters, prescriptions, invoices, payments, patients (update), appointments (status)
- Admin API to read audit log: `GET /audit?entity=&entity_id=&from=&to=`

### 4.3 Frontend Wiring

**Consultation page (`apps/web/src/pages/Consultation.tsx`):**
- Replace hardcoded patient info with `/patients/:id` data
- Bind chief complaint, HPI, examination textareas to encounter API
- Bind diagnosis checkboxes to `/encounters/:id/diagnoses` API
- Add vitals form bound to `/encounters/:id/vitals`
- Add prescription writer panel bound to `/prescriptions?encounter_id=`
- Add "Sign & Close" button → PATCH /encounters/:id/lock
- Replace static "Previous Consultations" with `/patients/:id/encounters` API call
- AI Scribe button → POST /ai/jobs with type=scribe (returns jobId, polls for result)

**Patient Profile page (`apps/web/src/pages/PatientProfile.tsx`):**
- Replace placeholder timeline with `/patients/:id/timeline` API
- Show encounters, prescriptions, lab results, appointments chronologically
- Add tabs: Overview | Timeline | Prescriptions | Lab | Documents

**Appointments page (`apps/web/src/pages/Appointments.tsx`):**
- Wire "Check In" button → PATCH /appointments/:id/status { status: 'checked_in' }
- Wire "Complete" button → PATCH /appointments/:id/status { status: 'completed' }
- Auto-create encounter on "Start Consultation" → POST /encounters → navigate to /consultation/:encounterId

**Billing page (`apps/web/src/pages/Billing.tsx`):**
- Wire invoice table to `/invoices` API
- Wire "New Invoice" → modal to create from encounter
- Wire payment collection → POST /invoices/:id/payments
- Replace static data with live queries

### 4.4 Acceptance Criteria for M2

| Scenario | Expected Result |
|---|---|
| Doctor creates encounter from appointment | Encounter saved; vitals/diagnoses/prescription all attached |
| Receptionist checks in patient | Token issued; status changes; queue updated |
| Doctor signs encounter | `is_locked=true`; further updates return 409 ENCOUNTER_SIGNED |
| Doctor issues prescription | Status = issued; items saved; pharmacy can see it |
| Receptionist creates invoice from encounter | Invoice with encounter-linked lines; GST calculated |
| Payment recorded | Balance reduced; invoice status updates |
| Audit trail | Every mutation produces audit_log row in same transaction |
| Cross-tenant isolation | No data leaks between tenants (smoke test passes) |

---

## 5. M2.1 Revenue Add-ons (Weeks 9–16)

Goal: Complete the Clinic → Pharmacy → Lab → Billing operational loop.

### 5.1 Pharmacy Module

**Tables to add (0009_pharmacy.sql):**
```sql
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL, -- denormalized for performance; schema-isolated anyway
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('medicine', 'consumable', 'lab_reagent', 'dental', 'supply', 'equipment')),
  form TEXT,
  strength TEXT,
  unit TEXT NOT NULL,
  manufacturer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_batches (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id),
  batch_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  purchase_price_paise BIGINT NOT NULL,
  selling_price_paise BIGINT NOT NULL,
  mrp_paise BIGINT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  initial_qty INT NOT NULL,
  current_qty INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL,
  batch_id UUID REFERENCES item_batches(id),
  qty_change INT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('purchase', 'sale', 'adjustment', 'transfer', 'consumption', 'return')),
  ref_id UUID, -- prescription_id / procedure_id / purchase_id
  ref_type TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  invoice_no TEXT,
  total_paise BIGINT NOT NULL DEFAULT 0,
  received_by UUID NOT NULL REFERENCES users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  batch_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  qty INT NOT NULL,
  purchase_price_paise BIGINT NOT NULL,
  selling_price_paise BIGINT NOT NULL
);
```

**API:** `apps/api/src/pharmacy/pharmacy.controller.ts`, `pharmacy.service.ts`
- `POST /dispense` — verify prescription → deduct stock → create sale record
- `GET /dispense-queue` — pending prescriptions for pharmacy
- `POST /items` — drug master CRUD
- `POST /purchases` — purchase entry with batch creation
- `POST /stock-adjustment` — manual stock correction (audit required)

### 5.2 Laboratory Module

**Tables to add (0010_lab.sql):**
```sql
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  sample_type TEXT,
  unit TEXT,
  reference_range TEXT,
  gender_range TEXT,
  age_range TEXT,
  price_paise BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id UUID PRIMARY KEY,
  encounter_id UUID REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  model TEXT NOT NULL DEFAULT 'in_house' CHECK (model IN ('in_house', 'external')),
  sample_type TEXT,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'collected', 'processing', 'completed', 'reviewed')),
  collected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_order_items (
  id UUID PRIMARY KEY,
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES investigations(id),
  result_value TEXT,
  result_unit TEXT,
  flag TEXT CHECK (flag IN ('H', 'L', 'N')),
  reference_range TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY,
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id),
  report_pdf_url TEXT,
  report_text TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**API:** `apps/api/src/laboratory/laboratory.controller.ts`, `laboratory.service.ts`
- `POST /lab-orders` — create from encounter
- `PATCH /lab-orders/:id/status` — advance pipeline
- `POST /lab-orders/:id/results` — enter results with auto H/L flagging
- `POST /lab-orders/:id/review` — doctor review + approve
- `POST /lab-orders/:id/external-report` — upload PDF for external lab

### 5.3 Inventory Module

**API:** `apps/api/src/inventory/inventory.controller.ts`, `inventory.service.ts`
- Consumes `items`, `item_batches`, `stock_ledger` from Pharmacy
- `GET /items` — category filters, stock levels, expiry alerts
- `POST /stock-transfers` — branch-to-branch transfer
- `POST /stock-adjustments` — correction with reason

### 5.4 Procedures Module

**Tables to add (0011_procedures.sql):**
```sql
CREATE TABLE IF NOT EXISTS procedure_catalog (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  duration_min INT,
  price_paise BIGINT NOT NULL DEFAULT 0,
  consumable_item_ids UUID[],
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS procedure_orders (
  id UUID PRIMARY KEY,
  encounter_id UUID REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  procedure_id UUID NOT NULL REFERENCES procedure_catalog(id),
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'prepared', 'in_progress', 'completed', 'billed')),
  room TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedure_consumptions (
  id UUID PRIMARY KEY,
  procedure_order_id UUID NOT NULL REFERENCES procedure_orders(id),
  item_id UUID NOT NULL REFERENCES items(id),
  batch_id UUID REFERENCES item_batches(id),
  qty_used INT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.5 Frontend Wiring for Add-ons

- **Pharmacy page:** Wire dispense queue to `/dispense-queue`; drug master to `/items`; sales to `/purchases`
- **Laboratory page:** Wire orders to `/lab-orders`; result entry to actual API
- **Inventory page:** Wire to `/items` with category filters
- **Procedures page:** Wire schedule to `/procedure-orders`; catalog to `/procedure-catalog`

### 5.6 Acceptance Criteria for M2.1

| Scenario | Expected Result |
|---|---|
| Doctor orders lab test from encounter | Lab order created; sample collection workflow advances |
| Lab technician enters results | H/L flags auto-computed; critical values trigger notification |
| Pharmacy dispenses prescription | Stock deducted; invoice line created; prescription status = dispensed |
| Procedure completed | Consumables deducted; billing line auto-added |
| Inventory alert | Low-stock/expiry alerts visible to admin/pharmacy |

---

## 6. M3 Intelligence (Weeks 17–22)

Goal: Make Jioplix AI-native and data-driven.

### 6.1 AI Job Infrastructure

**Tables:**
```sql
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('scribe', 'summary', 'insight', 'coding', 'follow_up')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  input JSONB NOT NULL,
  output JSONB,
  error TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**BullMQ workers** (new `apps/api/src/workers/`):
- `ai-scribe` — processes audio/dictation → structured SOAP note draft
- `ai-summary` — generates pre-consultation summary from patient history
- `ai-insight` — generates operational insights (weekly digest)

**API:**
- `POST /ai/jobs` — enqueue AI job (202 Accepted + jobId)
- `GET /ai/jobs/:id` — poll for result
- `PATCH /ai/jobs/:id/approve` — doctor approves AI output → enters clinical record
- `PATCH /ai/jobs/:id/reject` — doctor rejects; reason captured in audit

**State machine:**
```
AI Draft
  → Doctor Review (human-in-loop)
  → Doctor Edit
  → Doctor Approve → Permanent Record
  OR
  → Doctor Reject → Discard
```

### 6.2 Patient Timeline API

`GET /patients/:id/timeline` — aggregates encounters, prescriptions, lab results, appointments, payments into chronological feed.

### 6.3 Analytics Aggregates

Nightly job (BullMQ) computes:
- Daily revenue per branch
- Doctor utilization
- No-show rate
- Patient growth
- Pharmacy/lab revenue split

Wire `apps/web/src/pages/Analytics.tsx` to `/analytics/*` endpoints.

### 6.4 Engagement / WhatsApp Outbox

**Tables:**
```sql
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[]
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_id UUID REFERENCES message_templates(id),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Wire `apps/web/src/pages/Engagement.tsx` to `/messages` + `/message-templates` APIs.

---

## 7. M4 Specialty + Compliance (Weeks 23–32)

Goal: Specialty-ready EMR and production-grade compliance.

### 7.1 Specialty Engine

**Tables:**
```sql
CREATE TABLE IF NOT EXISTS specialty_configs (
  id UUID PRIMARY KEY,
  clinic_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Approach:**
- Core EMR unchanged
- Specialty pack adds: extra encounter fields, custom forms, validation rules
- Frontend renders specialty-specific panels inside Consultation page based on `clinic.clinicType`

**P0 Specialty Packs:**
1. **Pediatrics** — growth chart inputs, vaccination schedule, pediatric dosage calculator
2. **Dental** — FDI tooth chart (interactive SVG), treatment plan builder, X-ray attachment
3. **Dermatology** — lesion tracker (location + photo upload), treatment timeline
4. **Gynecology** — LMP/EDD calculator, obstetric history, ANC tracking

### 7.2 ABDM/ABHA Adapter v0

- Isolated module: `apps/api/src/abdm/`
- ABHA linking: verify ABHA number + OTP via ABDM sandbox
- Consent records: `abdm_consents` table (immutable)
- Health record discovery: fetch from ABHA-compatible HIU
- Feature-flagged per tenant; core domain stays ABDM-agnostic

### 7.3 Security Hardening

| Item | Action | Effort |
|---|---|---|
| MFA enrollment | TOTP setup/verify/disable in web UI + API | 1 week |
| Rate limiting | Per-IP + per-tenant token buckets (Redis) | 3 days |
| Login anomaly detection | Track failed logins per user; alert/lockout | 2 days |
| Device/session management | List/revoke sessions API | 3 days |
| Security event logging | Structured audit of auth events | 2 days |
| Data export controls | Tenant data export job (schema dump + files) | 2 days |

### 7.4 Observability + Production Readiness

- **Logs:** pino structured logs in NestJS
- **Traces:** OpenTelemetry auto-instrumentation
- **Errors:** Sentry integration
- **Metrics:** /metrics endpoint (Prometheus format)
- **Health:** /healthz (liveness) + /readyz (DB + Redis probes) — already done
- **Backup:** pg_dump per schema + S3 upload; restore drill script
- **CI:** Add integration tests with testcontainers Postgres

---

## 8. Refactoring the Frontend Architecture

### 8.1 Current Problem
Pages mix static demo data with live API calls. Routing is hardcoded in `App.tsx`. State management is scattered (useState per page).

### 8.2 Target Architecture
```
apps/web/src/
  api/           ← typed client generated from contracts
  auth/          ← context, useAuth hook (done)
  components/    ← shared primitives (done)
  pages/         ← route-level components
  lib/           ← api.ts (done), utils
  hooks/         ← usePatients, useAppointments, useEncounter...
  stores/        ← zustand stores for complex shared state
```

### 8.3 Specific Refactors

| Area | Current | Target |
|---|---|---|
| Consultation | 238 lines of hardcoded demo data | 400–500 lines bound to `/encounters/:id` |
| PatientProfile | Placeholder timeline | Timeline from `/patients/:id/timeline` |
| Billing | Static invoices | Live `/invoices` + payment flow |
| Pharmacy/Lab/Inventory | Static tables | Live CRUD from respective APIs |
| Routing | Hardcoded in App.tsx | Lazy-loaded routes with Suspense |
| State | useState per page | zustand for cross-page state (e.g., active patient) |

---

## 9. API Contract Strategy

**Source of truth:** `packages/contracts/src/index.ts` (Zod schemas)

**Rule:** Every API endpoint must have:
1. Zod request/response schema in `packages/contracts`
2. DTO class in NestJS using `class-validator` + `class-transformer`
3. OpenAPI auto-generated from Nest decorators
4. Web client types derived from contracts

**Current gap:** `packages/contracts` has auth + patient + appointment schemas. Missing: encounters, vitals, diagnoses, prescriptions, invoices, payments, pharmacy, lab, inventory, procedures, AI jobs.

**Action:** Expand contracts package in parallel with backend modules.

---

## 10. Testing Strategy

| Layer | Current | Target |
|---|---|---|
| Unit tests | None | Services: 80%+ coverage |
| Integration tests | Smoke suite (29 checks) | Expand to 50+ checks covering new modules |
| E2E tests | None | Playwright: login → appointment → consultation → prescription → billing |
| Isolation tests | 3 checks | Automated cross-tenant leak scan per module |
| Load tests | None | k6: patient search p95 <1s, API p95 <500ms |

---

## 11. Migration Strategy for Existing Data

Per PRD §30:
1. Phase 1: Hide/deactivate hospital-specific UI (already done — no hospital UI exists)
2. Phase 2: Identify reusable platform services (auth, tenancy, RBAC — done)
3. Phase 3: Separate legacy HMS workflows (N/A — fresh build)
4. Phase 4: Archive unused tables (none to archive yet)
5. Phase 5: Remove obsolete tables after dependency analysis (future)

**Current state:** This is a greenfield build on the new architecture. No legacy HMS data migration needed.

---

## 12. Team Allocation (Recommended)

| Role | Focus | Phase |
|---|---|---|
| Backend Engineer 1 | Encounters + Prescriptions + Billing + Audit | M2 |
| Backend Engineer 2 | Pharmacy + Lab + Inventory + Procedures | M2.1 |
| Backend Engineer 1 | AI jobs + Analytics + Engagement | M3 |
| Frontend Engineer | Wire all pages to live APIs | M2–M3 parallel |
| Backend Engineer 2 | Specialty templates + ABDM adapter | M4 |
| DevOps | Observability, backups, CI | M4 |

---

## 13. Success Metrics

| Metric | Target | Current |
|---|---|---|
| Smoke tests passing | 50+ | 29 |
| API modules | 12+ | 4 |
| Live API-wired pages | 13/13 | 3/13 |
| Audit coverage | 100% of clinical/financial writes | 0% |
| API p95 latency | <500ms | Not measured |
| Patient search p95 | <1s | Not measured (index exists) |
| Cross-tenant isolation tests | Passing | 3 checks |
| Clinical workflow completion | Doctor completes consult → Rx → bill in <5 min | Broken |

---

## 14. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| M2 scope creep | High | High | Lock M2 scope; defer add-ons to M2.1 |
| AI integration overreach | Medium | High | Strict review state machine; no AI in clinical record without doctor approval |
| Multi-tenant migration bugs | Medium | Critical | Maintain SET LOCAL discipline; add migration drift monitor |
| Specialty template complexity | Medium | Medium | Start with 4 packs; use JSONB config, not code branching |
| Third-party integrations (ABDM/WhatsApp) delays | High | Medium | Adapter interfaces absorb provider changes; build core first |

---

## 15. Appendix: File Inventory

### Backend files to create (M2)
- `apps/api/src/encounters/encounters.controller.ts`
- `apps/api/src/encounters/encounters.service.ts`
- `apps/api/src/encounters/dto/create-encounter.dto.ts`
- `apps/api/src/prescriptions/prescriptions.controller.ts`
- `apps/api/src/prescriptions/prescriptions.service.ts`
- `apps/api/src/billing/billing.controller.ts`
- `apps/api/src/billing/billing.service.ts`
- `apps/api/src/common/audit.service.ts`
- `packages/db/migrations/tenant/0005_encounters.sql`
- `packages/db/migrations/tenant/0005_encounters_vitals.sql`
- `packages/db/migrations/tenant/0005_encounters_diagnoses.sql`
- `packages/db/migrations/tenant/0006_prescriptions.sql`
- `packages/db/migrations/tenant/0007_billing.sql`
- `packages/db/migrations/tenant/0008_audit_trigger.sql`

### Backend files to modify (M2)
- `apps/api/src/app.module.ts` — add new modules
- `packages/contracts/src/index.ts` — add encounter, prescription, billing, vitals, diagnosis schemas
- `apps/api/src/auth/auth.decorators.ts` — add `RequireRole('doctor')` decorator

### Frontend files to modify (M2)
- `apps/web/src/pages/Consultation.tsx` — full rewrite to bind live APIs
- `apps/web/src/pages/PatientProfile.tsx` — wire timeline
- `apps/web/src/pages/Appointments.tsx` — wire actions
- `apps/web/src/pages/Billing.tsx` — wire to live data
- `apps/web/src/App.tsx` — add `/encounters/:id` route
- `apps/web/src/lib/api.ts` — add encounter, prescription, billing, vitals functions
