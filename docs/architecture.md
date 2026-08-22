# Jioplix Backend Architecture

Version: 1.1 · Date: 2026-08-22
Companion documents: `docs/prd.md` (v4.0), `docs/progress.md`

---

## 1. Goals & Constraints (from PRD)

| Requirement | Source | Architectural Response |
|---|---|---|
| Strict tenant isolation | Epic 14 | **Schema-per-tenant** (this doc §3) |
| RBAC across 9 roles | Epic 14 | Role/permission tables per tenant schema + JWT guards |
| Clinical audit (old→new value) | Epic 15 | Append-only audit log w/ JSONB diff |
| Modular Core + Add-ons | §7 | Entitlement guard per module |
| API p95 < 500ms | §29 | Stateless API, indexed queries, Redis cache |
| AI latency ≠ API latency | §29 | Async AI job queue, never inline |
| ABDM compliance | Epic 13 | Isolated adapter module, consent records |
| India-first (GST/UPI/WhatsApp) | P5 | Paise integers, GST splits, WhatsApp outbox |

---

## 2. Stack Decisions

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 22 LTS + TypeScript | Monorepo, shared types with web app |
| API framework | NestJS (REST `/api/v1`, OpenAPI) | Guards/interceptors = tenancy, RBAC, entitlements, audit |
| Database | PostgreSQL 16 | One shared cluster; one schema per tenant |
| ORM | Drizzle | SQL-transparent; migrations applied per tenant schema |
| Cache / Queue | Redis 7 + BullMQ | Sessions, entitlement cache, outbox workers |
| Object storage | S3-compatible (MinIO dev / S3 prod) | Documents, lab PDFs, images |
| Search | Postgres `pg_trgm` FTS | Patient search <1s; Meilisearch only if needed |
| AuthN | Phone OTP (MSG91) + password fallback, JWT access 15m + rotating refresh, TOTP MFA | PRD Epic 15 |

Alternatives considered: Fastify+tsoa (lighter, more hand-rolling), Prisma (fine, but Drizzle's raw-SQL ergonomics suit per-schema migrations), Supabase (great accelerator, but ABDM/billing logic wants full control).

---

## 3. Multi-Tenancy Model — Schema-per-Tenant (DECIDED)

### 3.1 Isolation Ladder

```
Tier 1 (NOW):   Shared Postgres cluster → one SCHEMA per tenant
Tier 2 (opt-in): Dedicated database per tenant (enterprise/chains)
                → same application code, different registry row
```

Both tiers are served by the same `TenantConnectionFactory`. Moving a tenant
between tiers = provision target DB → migrate schema → copy data → flip registry row.

### 3.2 Layout

```
Postgres cluster
├── db: jioplix
│   ├── public              ← GLOBAL (platform-wide)
│   │   ├── tenants                 (registry: id, schema_name, status, tier, db_conn?)
│   │   ├── plans · plan_addons     (commercial catalog, PRD §24)
│   │   ├── platform_users          (Jioplix staff only)
│   │   ├── global_drug_master      (shared clinical catalogs)
│   │   ├── global_investigations
│   │   └── global_procedures
│   ├── t_<hash8>           ← ONE SCHEMA PER TENANT (identical DDL)
│   │   ├── branches · users · roles · user_branch_roles
│   │   ├── patients · allergies · conditions · documents · consents
│   │   ├── appointments · queue_tokens · doctor_availability
│   │   ├── encounters · vitals · encounter_diagnoses · clinical_notes
│   │   ├── prescriptions · prescription_items
│   │   ├── items · item_batches · stock_ledger · suppliers · purchases
│   │   ├── lab_orders · lab_order_items · lab_results
│   │   ├── procedure_catalog · procedure_orders · procedure_consumptions
│   │   ├── invoices · invoice_lines · payments · refunds
│   │   ├── message_templates · messages · follow_ups
│   │   ├── ai_jobs · addon_entitlements · audit_logs
│   │   └── schema_migrations        (per-tenant DDL version)
│   └── t_<hash8> ...       ← next tenant
```

Rules:
- Schema name: `t_` + first 8 chars of tenant UUID (stable, never derived from
  renameable slugs).
- Global catalogs hold clinical content (drug names, investigation definitions);
  tenant schemas hold commercial overlays (prices, stock, custom items).
- No tenant data ever lives in `public`.

### 3.3 Request Lifecycle

```
JWT (sub, tenant_id, branch_id, roles)
  → TenantGuard: lookup registry (Redis cache, 60s TTL) → {schema_name | db_conn}
  → Transaction opens: SET LOCAL search_path = t_ab12cd34, public
  → Repository layer runs unaware of tenancy (plain SQL against unqualified names)
  → Commit; pooled connection returns clean
```

**Critical pooling rule:** with pgBouncer/transaction pooling, `search_path`
MUST be `SET LOCAL` inside each transaction — never `SET` on the session.
Every repository method runs inside the request-scoped transaction; this is
enforced by a unit-of-work interceptor, not by convention.

### 3.4 Provisioning a New Tenant

1. INSERT row into `public.tenants` (status=`provisioning`)
2. `CREATE SCHEMA t_xxxx`
3. Apply all pending migrations into that schema (fresh, from migration files — never clone live data)
4. Seed: default roles/permissions, first branch, addon_entitlements from plan
5. UPDATE status=`active`; warm Redis cache entry

Target < 30s; runs inside onboarding flow (PRD success metric: 30-min activation).

### 3.5 Migrations Across Hundreds of Schemas

- Single source of truth: `packages/db/migrations/*.sql` (drizzle-kit generate)
- Custom migrator CLI iterates all `tenants` rows, applies pending files inside
  one transaction per tenant, records version in `schema_migrations`
- Version-skew policy: migrations are expand→migrate→contract (backwards-compatible steps) so a rolling deploy never breaks tenants mid-run
- Nightly job asserts every active tenant is at latest version; alerts on drift
- New tenant creation always uses latest migration set

### 3.6 Cross-Tenant Operations (the honest trade-offs)

| Need | Approach |
|---|---|
| Platform admin dashboards | Query `public.tenants` metadata + per-tenant aggregate endpoints (loop), NOT cross-schema joins |
| Consolidated chain reporting | Within one tenant already (branches share a schema). True cross-org rollups → nightly ETL into `analytics` schema / warehouse |
| Global search "find patient across my clinics" | Out of scope by design — isolation boundary |
| Tenant offboarding / GDPR-style deletion | `DROP SCHEMA t_xxxx CASCADE` + storage bucket purge + registry tombstone. Clean, auditable |

### 3.7 Why this satisfies the security goal

- Missing `WHERE tenant_id=...` bug class eliminated entirely (no shared rows)
- Per-tenant `pg_dump` = cheap per-customer backup/restore & export
- Suspected compromise of one tenant ⇒ blast radius contained to one schema
- Future dedicated-DB tier inherits identical DDL and code paths

Operational disciplines we accept in exchange (tracked as engineering tasks):
migrator CLI + drift monitor, `SET LOCAL search_path` enforcement test,
table-count monitoring (~40 tables × N tenants; Postgres handles 10k+ tables fine).

---

## 4. Data Integrity Rules (all tenant tables)

1. **Money**: BIGINT **paise**. Never floats. Invoice lines snapshot GST rate +
   CGST/SGST/IGST split + HSN at issue time.
2. **Clinical immutability**: signed encounters/notes locked; corrections =
   addendum records linked to original. AI notes carry state machine
   `draft → reviewed → approved | rejected`; only `approved` enters the record
   (PRD FR-5.2 safety workflow enforced at API level, doctor role required).
3. **Stock truth**: `stock_ledger` append-only (purchase/sale/adjustment/
   transfer/consumption/return refs). `items.stock_qty` maintained in the same
   transaction as ledger insert (fast reads) + nightly reconciliation job.
4. **Payments immutable**: refunds/voids are new rows referencing payment.
5. **Soft delete** only where legally permitted (e.g. appointment cancellation);
   clinical/financial rows are never deleted.
6. **Standard columns everywhere**: `id UUIDv7 PK, created_at, created_by,
   updated_at, updated_by`.
7. **IDs**: UUIDv7 generated app-side (time-ordered, index-friendly).
8. **Time**: UTC in DB; IST rendering at edge; appointments store clinic-local
   slot + tz offset.

---

## 5. API Design Conventions

- REST `/api/v1/<resource>`; OpenAPI generated from Nest decorators;
  typed client generated into `apps/web` (single source of truth with Zod contracts)
- Cursor pagination (`?cursor=&limit=`), max limit 100
- Errors: RFC7807-style `{code, message, details}`; stable machine codes
  (`MODULE_DISABLED`, `ENCOUNTER_SIGNED`, …)
- Idempotency-Key header required on POST /payments, POST /invoices
- Entitlement guard: `@RequireModule('pharmacy')` → 403 `MODULE_DISABLED`
  (UI consumes code to render Add-ons upsell)
- Rate limits: per-IP + per-tenant token buckets (Redis)
- Health: `/healthz` (liveness), `/readyz` (DB + Redis + queue probes)

## 6. Async Processing (Outbox + Workers)

```
API tx: business writes + outbox row (same commit)
  → BullMQ relay polls outbox → jobs: whatsapp-send, sms-otp,
    ai-scribe, ai-summary, abdm-sync, followup-reminder, report-pdf
Workers: retry w/ backoff → dead-letter queue → ops alert
AI jobs: POST /ai/jobs → 202 {jobId} → client polls GET /ai/jobs/:id or SSE
```

WhatsApp BSP (Gupshup/AiSMA/Meta Cloud API) hidden behind adapter interface.

## 7. Security & Compliance

- Encryption: TLS 1.3 transit; at-rest via RDS/storage KMS
- AuthZ: JWT claims (tenant, branches[], roles[]) + per-route permission check
  against tenant `roles.permissions` JSONB
- Audit: append-only `audit_logs(actor, entity, entity_id, action, old_value,
  new_value, reason?, ip, ua)` written in the same transaction as the change;
  monthly partitions; no UPDATE/DELETE grants
- Files: presigned PUT/GET, MIME allowlist, AV-scan hook, PHI bucket policies
- Backups: PITR + daily logical dumps per cluster; quarterly restore drill;
  per-tenant export job (schema-per-tenant makes this trivial)
- Secrets: environment-scoped, never in repo; rotation runbook

## 8. Repository Layout (pnpm workspaces)

```
jioplix/
├── apps/web          ← existing React app (moved here)
├── apps/api          ← NestJS
├── packages/db       ← drizzle schema (global + tenant), migrations, migrator CLI, seeds
├── packages/contracts← Zod DTOs + error codes shared web↔api
└── packages/config   ← eslint/tsconfig shared
```

Dev environment: `docker-compose up` → postgres, redis, minio, mailhog.
Seeds mirror the UI demo data (Dr. Priya, Rajesh Kumar, tokens #12–17…).

## 9. Delivery Milestones

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M1 Foundation** | Monorepo, docker-compose, CI, auth (OTP+JWT+MFA), tenant provisioning + migrator CLI, RBAC, patients CRUD+search, audit skeleton | Two tenants provisioned; RLS-free isolation proven by tests; patient search <1s |
| **M2 Clinical + Revenue** | Availability/appointments/queue, encounters EMR, prescriptions, invoices/payments (GST), audit complete | Full Book→Pay journey green |
| **M3 Add-ons** | Entitlements guard, pharmacy dispense, inventory ledger, lab orders/results, procedures | Module toggle gates APIs correctly |
| **M4 Intelligence + Engagement** | Outbox WhatsApp, templates, follow-ups, AI scribe/summary w/ review state machine, ABDM adapter v0, analytics aggregates | FR-5.x flows demoable end-to-end |

## 10. Open Questions

1. Cloud target: AWS vs GCP vs Indian-hosted (MeitY empanelment for ABDM?) — affects managed-service picks only, not design
2. WhatsApp BSP choice (pricing/throughput quotes pending)
3. SMS OTP provider (MSG91 assumed)
4. Mobile app roadmap — REST already supports it; native shell undecided

## 11. Deployment Architecture

### 11.1 Principle

Separate stateless frontend from stateful backend. Frontend fits serverless; backend requires a persistent process.

### 11.2 Topology

```
Vercel (Frontend)
  └── Static build of @jioplix/web
  └── SPA fallback routing (vercel.json)
  └── Env: VITE_API_URL → https://api.yourdomain.com/api/v1

Render (Backend)
  └── Node.js 22 process running NestJS @jioplix/api
  └── Port from process.env.PORT (Render injects this automatically)
  └── Env: DATABASE_URL, JWT_SECRET, REDIS_URL, S3_*

Aiven Postgres (or Neon / Supabase)
  └── Single cluster, schema-per-tenant (see §3)

Redis (Upstash / Render Redis)
  └── Sessions cache, rate limits, BullMQ workers

S3-compatible (Cloudflare R2 / Backblaze B2 / AWS S3)
  └── Documents, lab PDFs, images
```

### 11.3 Frontend: Vercel

- **Build:** `npm run build -w @jioplix/web` → `apps/web/dist`
- **Config:** `vercel.json` at repo root
- **Root Directory:** `.` (repo root)
- **Output Directory:** `apps/web/dist`
- **Install Command:** `npm install`
- **Build Command:** `npm run build -w @jioplix/web`
- **Environment Variable:** `VITE_API_URL` (set in Vercel dashboard)
- **Why Vercel:** Edge CDN, preview deployments per PR, zero-config SPA routing, free tier sufficient for staging.

### 11.4 Backend: Render

Do NOT deploy NestJS as Vercel Serverless Functions. Reasons:

- `pg.Pool` connections are not reused across invocations; cold starts exhaust connection limits.
- NestJS startup + Drizzle + tenant schema lookup adds seconds of latency on every cold start.
- Vercel Hobby tier 10s timeout kills long-running requests (file uploads, AI jobs).
- BullMQ workers need a long-lived process; Vercel Functions are stateless.

**Recommended platform: Render** (free tier available, already configured).

**Deploy steps:**

1. Create a new **Web Service** in Render, connect your repo
2. Set **Root Directory** to `apps/api`
3. Set **Runtime** to `Node`
4. Set **Build Command** to `npm install && npm run build`
5. Set **Start Command** to `npm run start`
6. Add environment variables (see §11.6)
7. Deploy — Render builds and starts the service

**Why this works:** Persistent Node.js process keeps `pg.Pool` warm; Redis and Postgres are external so the API is truly stateless and horizontally scalable.

**Render-specific notes:**

- Free tier spins down after 15 minutes of inactivity; first request after spin-down takes ~30s to wake up. Upgrade to Starter ($7/mo) for always-on.
- Health check path: `/healthz` (Render probes this automatically)
- Logs available in Render dashboard; set up email alerts for crash loops
- Auto-deploy on push to `main`; disable auto-deploy for preview branches if desired

### 11.5 CI/CD Flow

```
Git push to main
  ├── Vercel detects change → builds frontend → preview → production
  └── Render detects change → builds API → rolls out with zero-downtime deploy

Pull request
  └── Vercel creates preview deployment with PR-specific URL
```

Frontend and backend deploy independently. A frontend change does not trigger an API rebuild.

### 11.6 Environment Variables

**Vercel (Frontend):**

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://jioplix-api.up.railway.app/api/v1` | Base URL for all API calls |

**Render (Backend):**

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:5432/jioplix` | Postgres connection (Aiven / Neon) |
| `JWT_SECRET` | `long-random-string` | JWT signing key |
| `JWT_ACCESS_TTL` | `15m` | Access token expiry |
| `JWT_REFRESH_TTL` | `7d` | Refresh token expiry |
| `REDIS_URL` | `redis://host:6379` | Redis connection |
| `S3_ENDPOINT` | `https://s3.amazonaws.com` | S3-compatible endpoint |
| `S3_ACCESS_KEY` | `AKIA...` | S3 access key |
| `S3_SECRET_KEY` | `...` | S3 secret key |
| `S3_BUCKET` | `jioplix-documents` | S3 bucket name |
| `PORT` | `3000` | Set by platform; do not hardcode |

**Note:** `REDIS_URL` and S3 credentials require add-ons. Render offers Upstash Redis Marketplace add-on; Upstash also has a free tier for Redis.

### 11.7 Database Migrations

Migrations live in `packages/db/migrations/`. Apply them via the CLI:

```bash
npm run db:migrate -- --url $DATABASE_URL
```

On Render, use a **Startup Command** (under "Deploy" → "Start Command") that runs migrations before starting the server:

```bash
npm run db:migrate -- --url $DATABASE_URL && npm run start
```

Alternatively, add a separate Render **Background Worker** service that runs migrations on a schedule or via deploy hook.

### 11.8 Health Checks

Render auto-probes `GET /healthz` on the platform-assigned port. The NestJS `HealthController` should report:

- Liveness: `GET /healthz` → `200 { status: "ok" }`
- Readiness: `GET /readyz` → checks `DATABASE_URL` (pool query `SELECT 1`) and `REDIS_URL` (PING)

Set the service's health check path to `/healthz` in Render dashboard.

### 11.9 Cost Estimate (Production, ~100 tenants)

| Service | Tier | Est. Cost |
|---|---|---|
| Vercel Pro | Frontend | $20/mo |
| Render | Backend (Starter) | $7/mo |
| Upstash Redis | Free tier → $0.20/mo beyond | $0–5/mo |
| Aiven Postgres | 2 vCPU / 4 GB | $30–50/mo |
| Cloudflare R2 | Storage + egress | Pay-as-you-go (~$5–15/mo) |
| **Total** | | **~$62–97/mo** |

Staging (free tiers): Vercel Hobby ($0) + Render Free ($0, spin-down) + Upstash Free ($0) + Neon Free ($0) = **$0/mo** with slower cold starts.
