# Jioplix Clinic OS — Build Progress

Reference document tracking UI implementation against the PRD (`docs/prd.md` v4.0).
Update this file after every work session.

---

## 1. Project Snapshot

| Item | Value |
|---|---|
| Product | Jioplix — AI-Powered Clinic Operating System |
| PRD Version | 4.0 (Target: Q4 2026) |
| Release Scope | Release 1 (Clinic Core) + Release 1.1 (Revenue Add-ons) |
| Stack | Monorepo (npm workspaces): `apps/web` React 19 + TS + Vite 8 + Tailwind 4 · `apps/api` NestJS 11 · `packages/db` migrator/seeder CLI · `packages/contracts` shared zod enums/schemas/permissions |
| Data | PostgreSQL 17 project-local (`.pgdata`, port **5434**, `scripts/dev-db.ps1 start`) · Drizzle ORM in api · schema-per-tenant |
| Auth | JWT access 15m + rotating refresh 7d, scrypt passwords, RBAC guards; demo password `demo1234` |
| Verification | `npm run smoke` — 29 checks, all passing · lint (oxlint) + tsc per workspace |
| Demo tenants | sunrise (starter/Dental) · nova (professional/Pediatric) · apex (clinic/Dermatology) · medicore (enterprise/General) |

---

## 2. Architecture Decisions

- **Core + Add-on model** (PRD §7): Core modules always visible; add-on modules (Pharmacy, Laboratory, Inventory, Procedures) are separate routes with an Add-ons management page.
- **Patient Journey as IA** (PRD §33): Sidebar groups follow the journey — Overview → Patient Journey → Add-ons.
- **Multi-tenancy**: schema-per-tenant (`t_<hash8>`), registry in `public.tenants`; TenantGuard resolves tenant from JWT first (header spoofing loses). Details in `docs/architecture.md`, requirements in `docs/trd.md`.
- **Auth**: `{clinic(slug), phone, password}` login → bearer flow with single-flight refresh on the web client; global JwtAuthGuard (@Public opt-out) + wildcard-aware PermissionsGuard.
- **Error contract**: stable machine codes `{error:{code}}` via global ErrorFilter (TRD TR-400); web maps codes to friendly copy.
- **Design system**: single theme in `src/index.css` via Tailwind 4 `@theme` tokens carrying the Jioplix brand palette (v1.0).
- Web pages beyond login/dashboard-greeting still render static demo data; live API wiring is tracked in the backlog.

---

## 3. Design System Reference (keep consistent)

| Token | Usage |
|---|---|
| `primary-*` | **Jioplix Blue** (`#1265e8` @ 500) — brand, active states, clinical actions, focus ring |
| `accent-*` | **Jioplix Teal** (`#08bfa9` @ 500) — secondary highlights, add-on badges, gradients |
| `success-*` / `warning-*` / `danger-*` / `info-*` | Status semantics (`#16a36a` / amber / `#e5484d` / `#1688f8`) |
| `surface-50…900` | Neutrals; text ink is brand navy (`800 #10234a`, `900 #071f5c`) |

**Patterns**
- Cards: `bg-white rounded-2xl border border-surface-100 shadow-healthcare`
- Page header: **use `<PageHeader>` from `components/ui.tsx`** (icon tile + title + subtitle + Add-on badge + actions slot)
- Primary buttons: **use `<Button variant="primary">` — ALWAYS blue (`primary-600`)**; secondary = white bordered. Module colors are identity-only (icon tiles, badges), never CTAs.
- Stat cards: **use `<StatCard>`** (icon chip 9×9 + value + optional change chip)
- Body text: `text-[13px]`; secondary `text-[12px]`; labels `text-[11px] uppercase tracking-wider`
- Tables: header row `text-[11px] font-semibold text-surface-400 uppercase`, rows `border-b border-surface-50 hover:bg-surface-50/50`
- Status pills: `inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border`
- AI surfaces: `bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600` white text (renders brand blue→teal)
- Avatars: gradient circles with initials
- Utilities: `.gradient-healthcare`, `.gradient-healthcare-soft`, `.shadow-healthcare(-lg)`, `.scrollbar-thin`
- Specialty theming: `.theme-<clinicType>` root + `.specialty-header/title/icon/card` children (Epic 12)

**UI unification pass (this session)**: added `apps/web/src/components/ui.tsx` with `PageHeader`, `StatCard`, `Button`, `Badge`; refactored all 13 pages onto them. Before: primary CTA color varied per module (Lab=red, Procedures/Consultation/Engagement=green, Pharmacy=sky, Inventory=indigo) and two header species existed → app felt stitched together. Now every page shares one header anatomy and one CTA color; module tints survive only in the header icon tile (teal core / sky pharmacy / rose lab / indigo inventory / green procedures).

---

## 4. Completed Work

### Foundation
- [x] Vite + React 19 + TS + Tailwind 4 scaffold
- [x] Theme tokens + healthcare utilities (`src/index.css`)
- [x] App shell: `Layout.tsx`, collapsible `Sidebar.tsx`, sticky `TopBar.tsx` (search, AI Copilot button, notifications, user menu)
- [x] Routing in `App.tsx`

### Release 1 — Clinic Core (all pages built)
| Epic | Route | File | Notes |
|---|---|---|---|
| 1. Command Center | `/` | `src/pages/Dashboard.tsx` | Today's metrics, live queue, quick actions, AI insights, activity feed |
| 2. Patients | `/patients` | `src/pages/Patients.tsx` | Search/filter list |
| 2. Patient Record | `/patients/:id` | `src/pages/PatientProfile.tsx` | Timeline, history, documents |
| 3. Appointments | `/appointments` | `src/pages/Appointments.tsx` | Calendar + queue |
| 4. Clinical EMR | `/consultation` | `src/pages/Consultation.tsx` | Workflow stepper, vitals, AI pre-consult summary, diagnosis (ICD-10), AI Scribe button |
| 7. Billing | `/billing` | `src/pages/Billing.tsx` | Invoices, payments |
| 16. Analytics | `/analytics` | `src/pages/Analytics.tsx` | Revenue/patient charts (recharts) |
| 6. Engagement | `/engagement` | `src/pages/Engagement.tsx` | WhatsApp journey notifications |

### Backend & Platform (live)
- [x] Monorepo scaffold + migrator CLI (`init-global` / `provision` / `migrate` / `seed-demo`) — global migrations need `init-global`, tenant ones `migrate`
- [x] Multi-tenant API: TenantGuard (token-first), transaction-local `search_path` unit-of-work, ErrorFilter machine codes
- [x] JWT + RBAC auth (`/auth/login|refresh|logout|me`), scrypt passwords, rotating refresh tokens, permission wildcards
- [x] Patients module (list/create, trigram search, MRN collision-safe)
- [x] Appointments + Queue module (status machines, auto token on check-in, doctor role read perms via `0004`)
- [x] Web auth: login page, dependency-free session store w/ single-flight refresh, RBAC-aware sidebar, TopBar user menu
- [x] Smoke suite **29/29** (`npm run smoke`) · lint/typecheck/build green across workspaces

---

## 5. Release 1.1 Add-ons — ✅ Completed (this session)

| # | Task | Status |
|---|---|---|
| 1 | Pharmacy page — dispense queue (verify → dispense → bill), drug master w/ stock+expiry status, today's sales | ✅ Done |
| 2 | Laboratory page — orders table, sample pipeline tracker (Ordered→Collected→Processing→Completed→Reviewed), result entry w/ reference ranges + H/L flags, in-house vs external models | ✅ Done |
| 3 | Inventory page — category filters, stock level bars vs reorder level, low-stock/expiry alerts, stock value | ✅ Done |
| 4 | Procedures page — catalog grid (price/duration/consumables), today's schedule w/ status flow, consumption feed | ✅ Done |
| 5 | Add-ons management page — Core (locked) vs add-on toggles w/ pricing (PRD §7, §24) | ✅ Done |
| 6 | Sidebar regrouped: Overview / Patient Journey / Add-ons (+ "Add-on" badges) + routes wired | ✅ Done |
| 7 | Dashboard quick-action links → `/pharmacy`, `/laboratory` | ✅ Done |
| 8 | Verified: `npm run lint` clean + `npm run build` passing | ✅ Done |

**Routes live:** `/pharmacy` · `/laboratory` · `/inventory` · `/procedures` · `/addons`

**Key UX decisions**
- Every add-on page carries an "Add-on" badge next to its title (modular positioning, PRD P3).
- Pharmacy queue cards show per-medication stock availability; out-of-stock blocks dispensing and surfaces a purchase-order CTA.
- Lab pipeline is visualized as a 5-step dot tracker on each order row; result entry auto-flags H/L values against reference ranges with critical-value panel.
- Inventory uses one shared engine view across Medicines / Consumables / Lab Reagents / Dental / Supplies / Equipment (PRD §17 architecture).
- Procedures page shows the Clinical → EMR → Inventory → Billing chain as an integrated workflow panel.
- Add-ons page implements Core (locked "Included") vs toggleable paid modules with PRD §24 indicative pricing.

---

## 6. Backlog (not started)

- [ ] Wire web pages to live API — Patients list/create, Appointments + Queue (endpoints already shipped), Dashboard metrics
- [ ] Queue management deep-view UI (token display, waiting-time tracking) — Epic 3 (API done)
- [ ] Specialty EMR templates (Dental chart, Pediatrics growth charts, Dermatology lesion tracking, Gyn obstetric history) — Epic 12
- [ ] ABDM/ABHA linking UI + consent management — Epic 13
- [ ] Multi-branch switcher — Epic 14
- [ ] Audit log viewer — Epic 15
- [ ] AI Scribe dictation flow w/ mandatory review-before-save workflow — FR-5.2
- [ ] Patient-friendly summary + language selection — FR-5.3
- [ ] Prescription writer inside Consultation (currently diagnosis only)
- [ ] GST invoice detail view — Epic 7

---

## 7. Session Log

| Date | Summary |
|---|---|
| 2026-08-21 | Resumed UI build. Created this progress tracker. Built Release 1.1 add-on pages (Pharmacy, Lab, Inventory, Procedures), Add-ons manager, sidebar regroup, route wiring. Lint + build verified green. |
| 2026-08-21 | Backend architecture defined in `docs/architecture.md`. Decision: schema-per-tenant isolation (upgradeable to dedicated DB), NestJS + Postgres + Drizzle + Redis/BullMQ. Next: M1 foundation scaffold. |
| 2026-08-21 | Wrote `docs/trd.md` (TRD v1.0, TR-xxx requirements). M1 scaffold built: npm-workspaces monorepo (apps/web, apps/api, packages/db, packages/contracts), docker-compose (pg16/redis/minio/mailhog), DB migrator CLI (init-global / provision / migrate / list) with global+tenant SQL migrations & seeding, NestJS API (healthz/readyz, TenantGuard w/ registry cache, transaction-local search_path unit-of-work, patients list/create). All builds green; web lint clean. Known issue solved: drizzle types must not cross package boundaries — schema lives in api, db pkg is raw-SQL tooling only. Next: auth (OTP/JWT/RBAC guards), appointments module, integration tests. |
| 2026-08-21 | Local PostgreSQL 17.10 running project-local at `.pgdata`, port **5434** (installed services occupy 5432/5433; ours started via detached postgres.exe — see `scripts/dev-db.ps1`). Added tenant migration `0002_scheduling.sql` (appointments + queue_tokens). Demo seeder (`npm run db -- seed-demo`) populates plan-aware users/patients/appointments/queue. **4 demo tenants live:** sunrise (starter), nova (professional), apex (clinic), medicore (enterprise). Verified end-to-end: readyz ok; GET /patients?x-tenant-id=nova returns nova's data; unknown tenant → 404. Gotchas fixed: .env path from workspace cwd; pg_trgm must be created WITH SCHEMA public (global migration); provision is idempotent per slug. |
| 2026-08-21 | Smoke suite `scripts/smoke-test.mjs` (`npm run smoke`): 13 checks — DB reachability, registry, migrations, API boot/health, tenant guard (403 no-header / 404 TENANT_NOT_FOUND), patient list+create, rapid-create MRN uniqueness, cross-tenant leak scan, validation errors, self-cleanup. **Caught real P0:** MRN was derived from uuidv7's first 8 hex = timestamp bits → all patients registered within ~65s collided on `patients_mrn_uq` → 500. Fixed in `patients.service.ts`: MRN now uses last 12 hex (random bits) + retry-once-on-23505. Also added global `ErrorFilter` (stable machine error codes per TRD TR-400: `{error:{code}}`). Lint + typecheck green across workspaces. |
| 2026-08-21 | **UI/UX unification pass** (user: "look and feel scattered"). Audit found per-module CTA colors (Lab red, Procedures green, Pharmacy sky…), two header species, hand-rolled stat cards. Created `apps/web/src/components/ui.tsx` — canonical `PageHeader` / `StatCard` / `Button` / `Badge` primitives — and refactored all 13 pages onto them. Rule: module tints are identity-only (header icon tiles); CTAs always teal primary-600; danger = destructive only. Web lint/typecheck/build green. |
| 2026-08-21 | Global CSS audit: verified chain (main.tsx→index.css→tokens in bundle) was already wired; completed real gaps — `@layer base` polish (::selection, :focus-visible outline, number-spinner removal, prefers-reduced-motion), `theme-color` meta. Build green. |
| 2026-08-21 | **JWT + RBAC auth shipped end-to-end.** Login `{clinic(slug), phone, password}` → access JWT 15m (`sub/tid/schema/slug/roles/perms`) + rotating refresh JWT 7d stored as sha256 hash in tenant-schema `refresh_tokens` (migration `0003_auth.sql`). Node scrypt password hashing (`scrypt$saltB64$hashB64`, timingSafeEqual). Global guards: JwtAuthGuard (@Public opt-out) → PermissionsGuard (wildcard-aware via contracts `hasAllPermissions`). TenantGuard is token-first (spoofed x-tenant-id header loses to JWT tid). `/auth/login|refresh|logout|me`; demo users seeded with password `demo1234`; seeder now fully idempotent (users upsert, patients/allergies NOT EXISTS guard, appointments skip-if-today). Smoke suite reworked to bearer flow: **22/22 PASS** (login/bad-pw/unknown-clinic, no-token/tampered-token, RBAC pharmacist-denied + doctor-allowed, ISO spoof-header, refresh rotation single-use, /me, create+MRN uniqueness, leak scan, validation, cleanup). Gotchas: NestJS @Post defaults 201 (added @HttpCode(200)); `declare module 'express'` augmentation merges fine across files; Windows CRLF broke schema-name equality in tests (split on /\r?\n/). Lint + typecheck green all workspaces. Next: appointments module, web login screen + auth store. |
| 2026-08-21 | **Clinic Type added per PRD §4.3/§7.2/Epic 12.** New `CLINIC_TYPES` contract enum (general/dental/pediatric/dermatology/gynecology) + `CLINIC_TYPE_LABELS`. Global migration `0003_clinic_type.sql` adds `tenants.clinic_type`; provisioner accepts it; demo tenants now have coherent identities — Sunrise **Dental**, Nova Children's **Pediatric**, Apex Skin & Aesthetics **Dermatology**, MediCore **General**. API surfaces `clinic.clinicType` in login/refresh/me; smoke asserts it (22/22). Web: sidebar brand now "Jioplix · Clinic OS · {type}", Dashboard subtitle uses clinic name, TopBar doctor specialty matches type, Add-ons Specialty Packs gained missing **Dermatology** card (PRD §7.2 lists 4 specialties). Gotcha: `npm run db -- migrate` only covers tenant schemas — global migrations need `init-global`. Lint/typecheck/web build green. |
| 2026-08-21 | **Security + Web auth shipped.** (1) Fixed `npm audit` high: drizzle-orm 0.44.7 → **0.45.2** (GHSA-gpj5-g38j-94v9, SQL-injection via identifiers) — API rebuild + 22/22 smoke green on new version. User rotated JWT_SECRET for HS256. (2) **Web login + auth store, dependency-free:** `lib/api.ts` fetch client (machine-code ApiError, single-flight token refresh with retry-once, localStorage session v1, session-expiry handler); `auth/` split into context.ts / AuthContext.tsx / useAuth.ts (fast-refresh clean); bootstrap validates stored session via `/auth/me`. Login page: split-screen brand panel (specialty chips per PRD §4.3), clinic-ID/phone/password form, show-password toggle, friendly error copy mapped from INVALID_CREDENTIALS/TENANT_NOT_FOUND/VALIDATION_FAILED/NETWORK_ERROR, one-click demo-role fill (receptionist/doctor/pharmacist), a11y labels+aria-invalid+autocomplete. Routing: `/login` public, ProtectedRoute w/ branded splash + return-to-intended-route, catch-all redirect. Sidebar: real clinic type in brand line + **RBAC-aware nav** (Pharmacy→pharmacy:*, Lab→lab:*, Inventory→inventory:read, Procedures→procedures:*); TopBar: session user avatar/initials + dropdown (clinic info, sign-out, outside-click/Esc close); Dashboard greeting time-aware from session. Verified: CORS preflight 204 from :5173, live login returns Nova Children's Clinic (pediatric). Lint/typecheck/build green all workspaces. |
| 2026-08-21 | **Brand realignment to Jioplix Design System v1.0.** User supplied logo.png (577x242 wordmark), favicon.png, hero.png and a draft theme CSS. Rewrote `index.css` as single-source system: Tailwind `@theme` tokens remapped to brand (primary=Jioplix Blue #1265e8 ramp, accent=Teal #08bfa9, navy ink surface-800/900 #10234a/#071f5c, status hues success #16a36a / danger #e5484d / info #1688f8), brand gradient utilities (blue-lightblue-teal) + navy-tinted shadows, deduped specialty theme block (Epic 12 clinic types) kept once. Dropped dead vanilla component CSS (.btn/.card/.sidebar-item/global th/td etc.) that nothing referenced and which would have clobbered Tailwind tables. Wired assets: favicon.png in index.html (+theme-color #071f5c, old favicon.svg removed), logo.png in Sidebar (wordmark + collapsed favicon mark) and Login (white chip on gradient panel, mobile header), favicon.png in auth Splash, hero.png framed above login form. All existing pages inherit rebrand via tokens - zero component churn. Web tsc -b exit 0, oxlint clean, build green (hero bundled). | 

Refer: gap_analysis_jioplix_vs_healthplix.md
