# Backend Persistence Roadmap

Version: 1.0 · Date: 2026-08-28
Companion documents: `docs/prd.md`, `docs/architecture.md`, `docs/progress.md`

---

## Why this exists

Several frontend feature pages still show **mock/hardcoded data** because their backend endpoints are
**in-memory stubs** (no DB tables). This contradicts the product principle: the UI should "pick up from
seeded data instead of showing fixed (mocked) data", and staff should never feel excluded ("why not my name?").

Wiring the UI to the current stubs would only trade one set of fake data for another (everything resets on
server restart), so we deliberately did **not** wire them. This document is the plan to make those modules
persistent (DB-backed) so the UI can legitimately load real, per-tenant data.

---

## Current state (verified at time of writing)

| Page (`apps/web/src/pages/`) | Mock data | Backend module | Persistence today |
|---|---|---|---|
| `Campaigns.tsx` | `mockCampaigns`, `mockTemplates`, `mockAutomationRules` | `apps/api/src/engagement/` | ❌ in-memory arrays |
| `Engagement.tsx` | `messages`, `automationRules`, stats | `apps/api/src/engagement/` + `whatsapp/` | ❌ none / no history endpoint |
| `ABDMIntegration.tsx` | `mockActivityLog`, stats | `apps/api/src/abdm/` | ❌ in-memory log, no table |
| `OnlineBooking.tsx` | `MOCK_BOOKING_URL`, `MOCK_RECENT_BOOKINGS`, config | `apps/api/src/booking/` | ❌ config hardcoded, no reservation table |

Key facts:
- All three backend modules are registered with `TenantGuard`/permissions where applicable, but their services
  return in-memory data (see `engagement.service.ts`, `booking.service.ts`, `abdm.service.ts` `// TODO` markers).
- **No drizzle tables exist** for campaigns, templates, automation rules, outgoing messages, ABDM activity,
  booking config, or reservations.
- No client API functions exist in `apps/web/src/lib/api.ts` for any of these modules.
- The only ABDM-persisted fields today are `patients.abha_number` / `patients.abha_address`.

---

## Guiding principles

1. **Schema-per-tenant persistence.** Feature data (campaigns, bookings, messages, ABDM activity) lives in the
   tenant schema, following the existing `withTenant(schemaName, async (db) => ...)` pattern used by clinical
   modules (`encounters`, `billing`, etc.).
2. **Mock → empty state.** While a backend is missing, the UI must show an honest **empty state**, never
   fabricated names/staff. Once an endpoint exists, wire the UI to it.
3. **Seed real demo rows** (in `packages/db/src/demo.ts`) so the demo tenant shows realistic but *database-real*
   data — matching the principle that "fixed/mocked" UI is wrong but *seeded* data is right.
4. **Permissions + RBAC.** Every guarded endpoint keeps its `@RequirePermissions(...)`; new endpoints follow the
   same convention.
5. **Auditability.** Outgoing messages and ABDM activity are audit-worthy; model them append-only like `auditLogs`.

---

## Phasing

P0 = unblocks the most visible "fake data" and is smallest/cleanest. P3 = largest, needs external SDKs.

### P0 — Online Booking (immediate, self-contained)

**Goal:** persist booking config + reservations; show real recent bookings and slot availability.

- **New tenant tables** (`packages/db/migrations/tenant/0015_booking.sql`):
  - `booking_config` (1 row per tenant): `id UUID PK`, `clinic_slug TEXT`, `allowed_days TEXT[]`,
    `time_slots TEXT[]`, `max_patients_per_day INT`, `advance_booking_days INT`, timestamps.
  - `booking_reservations`: `id UUID PK`, `clinic_slug TEXT`, `patient_name`, `phone`, `booking_date DATE`,
    `time_slot TEXT`, `status TEXT CHECK IN ('confirmed','pending','cancelled')`, `created_at`.
- **Drizzle schema** (`apps/api/src/db/schema/tenant.ts`): add `bookingConfig`, `bookingReservations`.
- **`booking.service.ts`:** read/upsert config from DB; `reserveSlot` inserts a row; add
  `GET /booking/reservations` (list, paginated, filter by date) → powers the "Recent Online Bookings" table;
  `getAvailableSlots` derives availability from reservations + config.
- **Frontend (`OnlineBooking.tsx`):** replace `MOCK_RECENT_BOOKINGS` and config state with `GET /booking/reservations`
  and `GET /booking/config`; keep `GET /booking/link`.
- **api.ts:** add `getBookingLink()`, `getBookingConfig()`, `saveBookingConfig()`, `listBookingReservations()`.
- **Perms:** `booking:read` (link/config/reservations), `booking:update` (POST config). Slots/reserve stay `@Public`.
- **Demo seed:** a handful of reservations + config in `demo.ts`.
- **Done when:** bookings persist across restart; availability reflects existing bookings; the page has no mock arrays.

### P1 — Campaigns (engagement)

**Goal:** persist campaigns + templates; keep automation rules as a follow-up.

- **New tenant tables** (`0016_campaigns.sql`):
  - `campaigns`: `id UUID PK`, `name`, `type` CHECK ('whatsapp','sms','email'), `status` CHECK
    ('draft','active','completed','paused'), `recipients/sent/delivered/read INT`, `audience`, `template_id`,
    `last_sent_at`, `created_by`, timestamps.
  - `campaign_templates`: `id UUID PK`, `name`, `category`, `content` (with `{placeholders}`), `channel`.
- **`engagement.service.ts`:** back `listCampaigns`, `createCampaign`, `updateCampaignStatus`, `listTemplates` with DB.
- **api.ts:** add `listCampaigns()`, `listCampaignTemplates()`, `createCampaign()`, `updateCampaignStatus()`.
- **Frontend (`Campaigns.tsx`):** load campaigns + templates; **empty states** for automation rules until P2.
- **Recounting:** when a campaign is sent, atoms like `delivered/read` should be updated from the WhatsApp
  outbox (see P2) rather than hardcoded stats.
- **Done when:** campaigns/templates persist and the page shows real rows.

### P2 — Outbound message history + automation rules (Engagement)

**Goal:** power the Engagement Hub's message list and automation rules from real data.

- **New tenant tables** (`0017_messaging.sql`):
  - `message_logs` (outbox): `id UUID PK`, `channel` CHECK ('whatsapp','sms','email'), `type`, `patient_id`,
    `to_phone`, `template_id`, `content`, `status` CHECK ('sent','delivered','read','failed'), `sent_at`,
    `provider_msg_id`. Append-only → repeat the `auditLogs` pattern.
  - `automation_rules`: `id UUID PK`, `trigger`, `action`, `channel`, `enabled BOOL`, timestamps.
- **`whatsapp.service.ts` / `notifications`:** persist sent messages to `message_logs` in `POST /whatsapp/send`
  and `send-bulk`; add `GET /engagement/messages` returning the log (powers the message list + stats).
- **`engagement.service.ts`:** add CRUD for automation rules driving `POST /engagement/campaigns`.
- **Frontend (`Engagement.tsx`):** replace `messages` array with `GET /engagement/messages`; derive stats from real
  counts; wire automation rules to the new endpoint.
- **Perms:** `campaigns:read`/`campaigns:write` for messaging/logs; automation rules under `engagement:write`.
- **Pass-through WhatsApp counts:** campaign `delivered/read` increments come from webhook/provider status so the
  Campaigns stats are real too.
- **Done when:** message history and rules persist; Engagement page shows no hardcoded messages/stats.

### P3 — ABDM activity log

**Goal:** persist ABDM audit trail so the Integration page shows real history (and satisfies ABDM auditability).

- **New tenant table** (`0018_abdm_activity.sql`): `abdm_activity_log`: `id UUID PK`, `action`, `detail`,
  `status` CHECK ('success','error','info'), `patient_id`, `created_at`. Append-only.
- **`abdm.service.ts`:** replace the in-memory `private readonly activityLog` with DB writes in `logActivity()`;
  back `GET /abdm/activity` from the table (keep `limit`).
- **Frontend (`ABDMIntegration.tsx`):** fetch activity from `GET /abdm/activity`; render relative `time` from the
  ISO `timestamp`; map action codes (`ABHA_LINK`, …) to human labels; **empty state** when no activity yet.
- **api.ts:** add `getAbdmActivity()`, `getAbdmStatus()`, `linkAbha()`.
- **Perms:** none today (JWT only) — recommend adding `abdm:read` / `abdm:write` for consistency.
- **Linked with P0-style seeds:** optionally seed link events for the demo tenant.
- **Done when:** activity persists and the page reflects real events (or an honest empty state).

---

## Cross-cutting work

Each phase should also include:

1. **Drizzle schema + `tenant.ts` export** for every new table, and the `tenant` schema migration in
   `packages/db/migrations/tenant/` (SSN-style sequent numeric prefix matching the current files).
2. **Seed data** in `packages/db/src/demo.ts` keyed to the demo tenant so pages show *seeded* (not mocked) data.
3. **Client API functions** in `apps/web/src/lib/api.ts` using the existing `api<T>(path)` helper (already unwraps
   the `{ data: T }` envelope).
4. **Empty states** in the UI whenever a list is legitimate-empty — never fabricate rows or names.
5. **Verification:** `apps/api` `tsc -p tsconfig.json`, `apps/web` `tsc -b` + `npm run build`, `npm run lint`.

---

## Acceptance checklist

- [ ] No frontend page renders hardcoded staff/patient names for real feature data.
- [ ] Campaigns, bookings, messages, automation rules, and ABDM activity persist across server restart.
- [ ] Every new table has a drizzle model + migration + seed.
- [ ] Tenant isolation holds (`withTenant`) for all new reads/writes.
- [ ] Permissions enforced on all new guarded endpoints.
- [ ] Web + API typecheck, lint, and build are green.

---

## Non-goals (explicitly out of scope for now)

- Building the actual WhatsApp/SMS/email provider adapters (delivery is a separate effort — here we only persist
  logs and surface counts).
- Scheduling the "live ABDM gateway" beyond sandbox stubs (persistence of activity is our concern).
- Replacing the `OnboardingWizard`/demo-login demo accounts — those are *seeded demo users*, which is correct per
  the principle.
