# Jioplix Clinic OS — Technical Requirements Document (TRD)

Document Version: 1.0 · Date: 2026-08-21
Derived from: `docs/prd.md` v4.0 · Companion: `docs/architecture.md`
Status: Engineering Baseline

---

## 1. Document Purpose

This document translates the product requirements of the Jioplix PRD into
**verifiable technical requirements** for the engineering team. Each requirement
has a stable ID (`TR-xxx`) for traceability in tickets, tests and reviews.

Requirement keywords: **MUST** (mandatory), **SHOULD** (strong preference),
**MAY** (optional).

---

## 2. System Overview

Jioplix is a multi-tenant SaaS platform for outpatient clinics comprising:

- **Web application** (React SPA) — doctor, reception, admin workspaces
- **REST API** (`/api/v1`) — business logic, tenancy, authorization
- **PostgreSQL cluster** — schema-per-tenant data isolation
- **Async workers** — WhatsApp/SMS, AI jobs, reminders, report generation
- **Object storage** — documents, lab PDFs, clinical images
- **Integrations** — ABDM/ABHA, WhatsApp BSP, SMS OTP, payments (UPI/card), GST invoicing

---

## 3. Functional Technical Requirements

### 3.1 Tenancy & Provisioning

| ID | Requirement |
|---|---|
| TR-101 | System MUST isolate every tenant's data in a dedicated PostgreSQL schema (`t_<hash8>`); no tenant rows in `public`. |
| TR-102 | Tenant→schema resolution MUST come from a server-side registry; clients MUST NOT supply schema names. |
| TR-103 | `search_path` MUST be set via `SET LOCAL` inside each transaction (pgBouncer-safe). Session-level `SET` is prohibited. |
| TR-104 | New tenant provisioning MUST create schema + apply all migrations + seed defaults atomically and complete in < 30 s. |
| TR-105 | Migrator MUST apply pending DDL to all active tenant schemas, record per-tenant version, and support expand→contract (zero-downtime) steps. |
| TR-106 | A nightly job MUST detect schema-version drift across tenants and alert. |
| TR-107 | Tenant offboarding MUST support full purge: drop schema, purge storage objects, tombstone registry row. |
| TR-108 | Architecture MUST allow upgrading a tenant to a dedicated database without application code changes (registry-driven connection routing). |
| TR-109 | Multi-branch clinics MUST operate within one tenant schema; branch scoping is an application-level filter. |

### 3.2 Identity & Access

| ID | Requirement |
|---|---|
| TR-110 | Login MUST support phone-number OTP (primary) and password (fallback), completing in < 2 s server-side (PRD §29). |
| TR-111 | Sessions MUST use short-lived access tokens (≤ 15 min) + rotating refresh tokens with reuse detection. |
| TR-112 | RBAC MUST enforce the PRD role set (Platform Admin, Tenant Admin, Clinic Admin, Doctor, Receptionist, Nurse/Assistant, Pharmacist, Lab Technician, Accountant) with per-route permission checks. |
| TR-113 | MFA (TOTP) MUST be supported and MAY be enforced per tenant policy. |
| TR-114 | All authentication events (success/failure/lockout) MUST be audited. |

### 3.3 Patient Journey (Core)

| ID | Requirement |
|---|---|
| TR-120 | Patient search by name/phone MUST return results in < 1 s at p95 using Postgres trigram indexes. |
| TR-121 | Patients MUST carry unique tenant-wide patient ID + optional ABHA number/address fields. |
| TR-122 | Appointments MUST support slots from doctor availability templates, walk-ins, reschedule, cancel, no-show states. |
| TR-123 | Queue tokens MUST be sequence-per (branch, doctor, date) with status transitions and waiting-time computation. |
| TR-124 | Encounters MUST follow the consultation workflow (history → vitals → diagnosis(ICD-10) → prescription → orders) and become immutable once signed; corrections are addendums. |
| TR-125 | Prescriptions MUST reference drug master entries with strength, form, dosage sig, quantity and route. |

### 3.4 Add-on Modules

| ID | Requirement |
|---|---|
| TR-130 | Every add-on API surface MUST be gated by an entitlement guard returning `403 MODULE_DISABLED` when the module is not enabled for the tenant. |
| TR-131 | Pharmacy dispensing MUST deduct stock transactionally with an append-only stock ledger entry (reason-coded). |
| TR-132 | Inventory MUST support batches with expiry, reorder levels, low-stock/expiry alerts, adjustments and transfers between branches. |
| TR-133 | Laboratory MUST support both in-house workflow (order→collect→process→result→review) and external model (upload report PDF into patient record). |
| TR-134 | Lab results MUST store value+unit+reference range and auto-compute H/L abnormal flags; critical values MUST trigger doctor notification jobs. |
| TR-135 | Procedures MUST link order → EMR entry → inventory consumption → invoice line in one business transaction. |

### 3.5 Billing & Payments

| ID | Requirement |
|---|---|
| TR-140 | All monetary values MUST be stored as BIGINT paise; floats are prohibited. |
| TR-141 | Invoices MUST snapshot GST breakdown (CGST/SGST/IGST, rate, HSN) per line at issue time and support GST-compliant numbering series per branch. |
| TR-142 | Payments MUST be immutable; refunds/voids are new referencing records. Payment endpoints MUST accept Idempotency-Key headers. |
| TR-143 | UPI/card/online flows MUST integrate through a payment adapter; cash is recorded offline. |

### 3.6 Engagement & AI

| ID | Requirement |
|---|---|
| TR-150 | Outbound WhatsApp/SMS MUST go through a transactional outbox table committed with business writes; workers deliver with retry/backoff and dead-letter queueing. |
| TR-151 | AI operations (scribe, summaries, insights) MUST run as async jobs (202 + job id; poll/SSE). No AI call may block an HTTP request path. |
| TR-152 | AI-generated clinical content MUST persist with review state `draft → reviewed → approved | rejected`; only doctor-approved content enters the permanent record (PRD FR-5.2). |
| TR-153 | Patient-friendly summaries MUST support language selection (initial: English, Hindi + 1 regional). |

### 3.7 ABDM Integration

| ID | Requirement |
|---|---|
| TR-160 | ABHA linking/creation, consent artefacts and record-sharing MUST live behind an isolated adapter module; core domain stays ABDM-agnostic. |
| TR-161 | Consent records MUST be immutable and auditable; sharing without active consent MUST be blocked at service layer. |

---

## 4. Non-Functional Requirements (measurable)

| ID | Category | Requirement |
|---|---|---|
| TR-200 | Latency | Login < 2 s; patient search < 1 s; patient profile / dashboard / consultation loads < 2 s (server contribution p95). |
| TR-201 | Latency | Standard API p95 < 500 ms excluding AI endpoints. |
| TR-202 | Availability | 99.9% monthly uptime for API and web. |
| TR-203 | Scalability | Platform MUST support 1 → 100+ tenants per cluster and 1 → 10 doctors per clinic without re-architecture; target ≥ 500 schemas per cluster with monitoring. |
| TR-204 | Auditability | Every create/update/delete on clinical or financial entities MUST produce an audit row (actor, action, entity, old/new JSONB, reason?, ip, ua) in the same DB transaction. |
| TR-205 | Durability | Automated daily backups + PITR; quarterly restore drills documented. |
| TR-206 | Security | TLS 1.2+ in transit; encryption at rest for DB and object storage; secrets never in code. |
| TR-207 | Isolation test | Automated integration tests MUST prove cross-tenant access is impossible (attempted leak returns empty/404, not foreign data). |
| TR-208 | Observability | Structured logs (pino), request tracing (OpenTelemetry), error tracking (Sentry), health probes `/healthz` `/readyz`. |
| TR-209 | Data retention | Configurable retention policy per tenant; clinical records retained per applicable regulation; deletion only via offboarding flow. |
| TR-210 | Timezone | Storage in UTC; IST rendering; appointments carry clinic-local slot + offset. |
| TR-211 | Compatibility | Web app supports last 2 versions of Chrome/Edge/Firefox/Safari; usable down to 360 px viewport (reception tablets/phones). |

---

## 5. Technology Requirements

| ID | Requirement |
|---|---|
| TR-300 | Single language: TypeScript (strict mode) across web, api, shared packages. Node.js 22 LTS runtime. |
| TR-301 | Monorepo (npm workspaces): `apps/web`, `apps/api`, `packages/db`, `packages/contracts`, `packages/config`. |
| TR-302 | API framework NestJS; ORM Drizzle; validation via Zod contracts shared web↔api (`packages/contracts`). |
| TR-303 | Database PostgreSQL ≥ 16; migrations are plain SQL files applied by the in-house migrator CLI (per-schema fan-out). |
| TR-304 | Queue/cache Redis ≥ 7 with BullMQ workers; outbox relay pattern mandatory for external side-effects. |
| TR-305 | Object storage S3-compatible API (MinIO locally, S3/R2 in prod) with presigned URLs. |
| TR-306 | Local dev environment fully reproducible via `docker-compose.yml` (postgres, redis, minio, mailhog) and seed scripts mirroring UI demo data. |
| TR-307 | CI pipeline MUST run: typecheck, lint, unit tests, integration tests (real Postgres via containers), build. |
| TR-308 | Generated OpenAPI spec MUST be published on every API build; web client types generated from it OR from shared Zod contracts. |

---

## 6. Interface Requirements

| ID | Interface | Requirement |
|---|---|---|
| TR-400 | REST API | Versioned prefix `/api/v1`; cursor pagination; RFC7807-style errors with stable machine codes. |
| TR-401 | Auth | `Authorization: Bearer <JWT>`; claims: sub, tenant_id, branches[], roles[], perm_version. |
| TR-402 | WhatsApp BSP | Adapter interface (send template, delivery webhooks) — provider swappable. |
| TR-403 | SMS/OTP | Provider adapter (MSG91 default), rate-limited per phone. |
| TR-404 | Payments | Adapter for UPI/card gateway + webhook signature verification. |
| TR-405 | ABDM | Gateway client module with consent-flow state machine; feature-flagged per tenant eligibility. |
| TR-406 | Files | Presigned upload flow: client requests URL → uploads → confirms metadata (sha256, mime allowlist). |

---

## 7. Data Requirements

| ID | Requirement |
|---|---|
| TR-500 | Standard columns on all tables: `id UUIDv7 PK, created_at, created_by, updated_at, updated_by`; UUIDv7 generated app-side. |
| TR-501 | Global catalogs (drugs, investigations, procedures) live in `public`; tenant schemas hold commercial overlays (prices, stock, custom items). |
| TR-502 | Stock ledger is append-only; current qty maintained transactionally + nightly reconciliation. |
| TR-503 | Soft delete permitted only where legally safe (e.g., appointment cancel); clinical/financial rows immutable post-signature/issue. |
| TR-504 | Audit log partitions monthly; UPDATE/DELETE revoked at role level. |
| TR-505 | Seed dataset MUST reproduce PRD examples (Dr. Priya, patients Ananya/Rajesh/Vikram, tokens #12–17) for demo parity with UI. |

---

## 8. Acceptance & Verification

- Each TR-x maps to at least one of: unit test, integration test (testcontainers Postgres asserting isolation/migrations), load script (k6 for TR-200/201), or review checklist item.
- **Definition of Done (feature)**: typed contract merged → API implemented with entitlement+audit → migration applied via migrator → tests green in CI → OpenAPI diff reviewed → docs updated (`progress.md` session log).
- **Release gate**: zero critical vulnerabilities (audit), backup restore drill passed, drift monitor clean, p95 budgets met on staging with seeded data.

---

## 9. Constraints & Assumptions

- India-first: GST law, UPI rails, ABDM specs as of implementation date; compliance items tracked separately.
- WhatsApp/SMS/payment provider selection pending commercial quotes (adapters absorb changes).
- Mobile apps out of scope for R1; REST + contracts keep the option open.
- Team size assumption: 2–5 engineers; docs favor explicitness over ceremony.

## 10. Traceability Matrix (summary)

| PRD Epic | TR ranges |
|---|---|
| 14 Multi-Tenancy | TR-101…109 |
| 15 Security | TR-110…114, TR-204…209 |
| 2 Patients | TR-120…121 |
| 3 Appointments/Queue | TR-122…123 |
| 4 Clinical EMR | TR-124…125 |
| 8–11 Add-ons | TR-130…135 |
| 7 Billing | TR-140…143 |
| 6 Engagement | TR-150…151 |
| 5 AI Copilot | TR-151…153 |
| 13 ABDM | TR-160…161 |
| 16 Analytics | served via aggregates (architecture §7) |
