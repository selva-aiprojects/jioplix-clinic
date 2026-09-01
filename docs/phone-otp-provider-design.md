# Phone OTP Provider Design (Demo → Email, ₹0 · paid SMS/WhatsApp opt-in)

Version: 1.1 · Date: 2026-08-28
Companion documents: `docs/architecture.md` (AuthN, §2/§7), `docs/backend-persistence-roadmap.md`,
`docs/prd.md`, `docs/progress.md`

---

## 1. Goal

Provide **phone + OTP verification** that:
- works fully self-contained in **demo mode** (static, on-screen OTP, zero cost, no SMS gateway), and
- swaps cleanly to a **cost-free real channel** (**email OTP**, ₹0) or, if a clinic opts in, a **paid
  India SMS/WhatsApp provider** — **without changing the web UI or session code**.

This is a **Ports & Adapters** seam: the auth endpoints are the port; each provider is an adapter.

> **Board constraint (2026-08-28):** SMS to an arbitrary Indian phone can never be ₹0 (every aggregator
> charges per OTP). "Cost-free" is therefore delivered by two channels: the **demo/on-screen** code for
> sandbox, and **email OTP** for real logins. SMS/WhatsApp (MSG91 or Supabase) is an opt-in **paid**
> upgrade, gated by `OTP_DELIVERY`, and never the default.

---

## 2. Why email as the default (and what paid channels are for)

| Channel | Real cost | Default? | Notes |
|---|---|---|---|
| **Email OTP** (user's registered email, looked up by phone) | **₹0** | ✅ | Uses the existing `MailerService` / `RESEND_API_KEY`; free tiers cover a clinic's daily logins |
| **On-screen demo code** | ₹0 | demo-only | Allowlist-gated, sandbox/staff only — never production |
| **MSG91 SMS/WhatsApp** | ~₹0.1–0.3/OTP | opt-in | DLT-approved template required (see `docs/sms-dlt-provider.md`) |
| **Supabase Auth phone OTP** | Per-SMS to attached provider | opt-in | Needs a provider (TextLocal/Twilio/Vonage/MessageBird/Verify) + DLT |

Supabase/Firebase comparison (v1.0) stands for the **paid** tiers: Firebase Phone Auth is client-driven
(reCAPTCHA, token verification) and **does not deliver SMS in India for new accounts**, so it is not a fit;
Supabase Phone is a valid **opt-in** engine. Neither is the default because both incur a per-OTP cost.

Decision: **email OTP is the production default**. Paid SMS/WhatsApp (MSG91 first, Supabase as the
Supabase-as-auth-engine option) is explicitly selected via `OTP_DELIVERY` when a clinic wants SMS.

---

## 3. The two decisions are separate

- **Verification engine** (who issues/validates the OTP): a local DB store (hashed, TTL, single-use) for
  demo + email; MSG91 or Supabase do their own server-side validation for the paid tiers.
- **Delivery channel** (who physically delivers the OTP): on-screen (demo), **email (₹0 default)**, or an
  external SMS/WhatsApp provider (paid opt-in).

Keeping them separate means we can change the SMS provider without touching auth, and can run the demo
with **no delivery at all**.

---

## 4. Provider selection rule (SECURITY-CRITICAL)

The provider is chosen by **phone-number allowlist + env flag**, **NOT** by "is this a demo/registered user".

```
provider =
    (DEMO_OTP_ENABLED === 'true' && DEMO_OTP_ALLOWLIST.contains(normalize(phone)))
        ? DemoOtpProvider      // print/log the code, no delivery
        : OTP_DELIVERY === 'msg91'    && MSG91_AUTH_KEY && MSG91_TEMPLATE_ID
            ? Msg91OtpProvider  // India SMS/WhatsApp via MSG91 (paid opt-in)
            : OTP_DELIVERY === 'supabase'
                ? SupabaseOtpProvider  // Supabase Auth phone OTP (paid opt-in)
                : EmailOtpProvider     // ₹0 default: email to the user's registered address
```

- **Any phone not on the allowlist ALWAYS goes to a real provider**, regardless of account state.
  This prevents an attacker from registering a fake account and using the static-OTP backdoor to verify a
  *real* number.
- The demo flag and allowlist are **off/missing in production**.
- The factory additionally requires the tenant slug to be a **demo clinic** (`nova` only) before
  returning the demo provider — a self-registered tenant can never enable on-screen codes.
- A paid mode (`msg91`) whose secrets are missing **degrades to email** rather than breaking login.
- OTP **validation** is never bypassed in any path — the demo path only changes *delivery* (display vs
  delivery), and MSG91/Supabase both do their own server-side validation of the code.

---

## 5. Interface (the seam)

Single adapter interface in the API auth module:

```ts
// apps/api/src/auth/otp/otp-provider.interface.ts
export interface OtpProvider {
  /** Initiate OTP for a phone. Returns an opaque delivery hint (e.g. demo code) or null when SMS'd. */
  requestOtp(ctx: {
    schemaName: string
    phone: string
  }): Promise<{ demoCode?: string | null }>

  /** Verify a code, returning success/failure. */
  verifyOtp(ctx: {
    schemaName: string
    phone: string
    code: string
  }): Promise<{ valid: boolean; details?: Record<string, unknown> }>
}
```

### Adapters

| Adapter | `requestOtp` | `verifyOtp` | When |
|---|---|---|---|
| `DemoOtpProvider` | Generate random 6-digit code; **store hashed** (TTL, e.g. 5 min) in the shared `otp_requests` table; return plaintext `demoCode` for the UI to show. | Compare against stored hash; single-use; expire on success/failure-limit. | Demo/staging only, allowlist-gated. |
| `EmailOtpProvider` | Store hashed code (same store); look up recipient email by **phone** in the tenant `users` table (never from the request body); send a branded OTP email via `MailerService`. Dev (no `RESEND_API_KEY`) logs the code server-side instead. | Same local store — single-use, TTL, attempts. | **Default real path (₹0).** Fails closed in prod if the user has no email. |
| `Msg91OtpProvider` | MSG91 Auth (OTP) API v5: `POST /api/v5/otp` with DLT-approved `template_id` — MSG91 generates + delivers + rate-limits; our app never sees the code. | `POST /api/v5/otp/verify` → MSG91 confirms server-side. | Opt-in: `OTP_DELIVERY=msg91` with `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID`. See `docs/sms-dlt-provider.md`. |
| `SupabaseOtpProvider` | `supabase.auth.signInWithOtp({ phone })` (or **Send SMS Hook** → custom SMS/WhatsApp provider). | `supabase.auth.verifyOtp({ phone, token })` → session. | Opt-in: `OTP_DELIVERY=supabase` with `SUPABASE_URL` + key. |

### Selection

A factory reads `OTP_DELIVERY` + allowlist and returns the active provider; the existing `auth/send-otp` and
`auth/verify-otp` controllers call `provider.requestOtp(...)` / `provider.verifyOtp(...)` instead of the
current in-module logic. **Web UI + `AuthContext` are unchanged.**

---

## 6. Demo mode behavior (current work)

- On the demo tenant, when an allowlisted demo number requests an OTP, the API returns
  `{ demoCode: "123456" }` and the web login surface renders **"Demo OTP: 123456"** inline.
- No SMS is sent; no provider account/keys are needed; cost = ₹0.
- The code still expires and is single-use, keeping the flow honest.

### Demo allowlist
The seeded demo phones (primary tenant `nova`, `professional` plan):
`+919800000101` (Dr. Priya), `+919800000102` (Dr. Anand), `+919800000201` (Ramesh), `+919800000202`
(Sunita), `+919800000203` (Vijay). Any other number → real provider.

---

## 7. Production path (at sign-off)

1. **Default, ₹0:** leave `OTP_DELIVERY=email` and add `RESEND_API_KEY`. Users log in with their phone and
   receive the code at the email registered on the tenant `users` row. No DLT, no aggregator, no charge.
2. **Opt-in SMS/WhatsApp (paid):** set `OTP_DELIVERY=msg91` (recommended, direct MSG91) or
   `OTP_DELIVERY=supabase` (Supabase Auth with an attached India provider / Send SMS Hook). Both need
   **DLT-registered templates** — see `docs/sms-dlt-provider.md`.
3. Keep the `OtpProvider` seam; adapters exist for all four tiers. Keys live server-side only; they are
   never in the browser bundle beyond the publishable anon key.
4. Set `DEMO_OTP_ENABLED=false`; remove demo allowlist from production.
5. The demo-seeded users carry email addresses (`<name>@<slug>.demo.jioplix`) so both demo and live
   work out of the box; re-run `npm run db -- seed-demo` to backfill on existing databases.

---

## 8. Env vars (additions)

| Variable | Demo | Production (default) | Paid opt-in |
|---|---|---|---|
| `DEMO_OTP_ENABLED` | `true` | `false` (unset) | — |
| `DEMO_OTP_ALLOWLIST` | `+919800000101,+919800000102,...` | unset | — |
| `DEMO_OTP_TTL_SECONDS` | `300` | n/a | — |
| `OTP_DELIVERY` | `email` | `email` (default) | `msg91` \| `supabase` |
| `RESEND_API_KEY` / `RESEND_FROM` | unset (console stub) | set | n/a |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | unset | unset | set with `OTP_DELIVERY=msg91` |
| `MSG91_OTP_LENGTH` / `MSG91_OTP_EXPIRY_MINUTES` / `MSG91_BASE_URL` | defaults | defaults | optional |
| `SUPABASE_URL` / key | unset | unset | set with `OTP_DELIVERY=supabase` |

---

## 8a. Acceptance checklist

- [x] OTP provider chosen by phone allowlist + env, never by user/demo flag alone.
  Implemented in `OtpProviderFactory.resolve()` — demo requires `DEMO_OTP_ENABLED=true`, a demo-clinic
  slug, **and** an allowlisted phone; any other number hard-routes to a real provider (**`EmailOtpProvider`
  (₹0) by default**, or `Msg91OtpProvider`/`SupabaseOtpProvider` when `OTP_DELIVERY` says so).
- [x] Demo OTP prints on screen with no SMS and no provider cost.
  `DemoOtpProvider` returns `demoCode`; `Login.tsx` renders "Demo OTP: 123456".
- [x] Non-allowlisted numbers are hard-routed to the real provider.
  Verified by test: send-otp for `+919800000999` on `nova` returns **no** `demoCode`.
- [x] Real logins deliver the code at **₹0** (email), fail closed if the user has no email in prod,
  and console-stub in dev.
  `EmailOtpProvider` resolves the recipient by phone in the tenant `users` table; no DLT, no aggregator.
- [x] UI/`AuthContext` unchanged across all paths.
  Only `otp.service.ts` + new `auth/otp/*` providers changed server-side; web `Login.tsx` already
  renders `data.data.demoCode` when present.
- [x] Web + API typecheck, lint, build green.
  `npm run typecheck`, `npm run lint`, API build all green.

### Test status (2026-08-28)

`node scripts/test-otp.mjs` → **26/26 PASS** (HERMETIC — real path uses the **email** dev console stub; it
forces `OTP_DELIVERY=email`, `RESEND_API_KEY=` empty, `SUPABASE_URL=`/keys empty and never fires live
SMS/email even with creds in `.env`). Coverage:
- Demo path: demoCode surfaced, rate limit, single-use, max-attempts bounding, unknown-clinic hides existence.
- Real path (**email adapter**): no `demoCode` ever returned (`+919800000999` on `nova`), OTP issued via the
  `[EMAIL STUB]` console path, verified end-to-end and a JWT session issued.
- When `OTP_DELIVERY=msg91`/`supabase` is set, the factory routes to those adapters instead (subject to the
  corresponding creds).

`node scripts/test-msg91.mjs` → **19/19 PASS** (offline — inline mock MSG91 server; boots the API with
`OTP_DELIVERY=msg91`):
- Demo allowlist still wins; mobile normalization (`+91…` → `91…`); `template_id`/`otp_length`/auth key passed.
- Wrong code → `OTP_INVALID`; correct (mocked) code → JWT session; single-use; rate-limit/resend-window mapping;
  unknown clinic hides existence and spends **zero** SMS; non-allowlisted number on `nova` hard-routes to MSG91.

`node scripts/test-otp-live.mjs send|verify …` → opt-in live round-trip against a **real** channel:
`--email` (default, ₹0 — no secrets needed · omits to check your inbox / logs), `--msg91` or `--supabase`
(refuse to run paid SMS without `ALLOW_LIVE_SMS=true`; force `DEMO_OTP_ENABLED=false`).

`npm run smoke` → **49/49**; API build + web lint/typecheck green.

### Env surface (final)

| Variable | Demo | Production (default) |
|---|---|---|
| `DEMO_OTP_ENABLED` | `true` | `false` (unset) |
| `DEMO_OTP_ALLOWLIST` | `+919800000101,+919800000102,...` | unset |
| `DEMO_OTP_TTL_SECONDS` | `300` | n/a |
| `OTP_DELIVERY` | `email` | `email` (₹0) |
| `RESEND_API_KEY` | unset (console stub) | set |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | unset | unset (set only for paid SMS opt-in) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | unset | unset (set only for paid opt-in) |

### Files

- `apps/api/src/auth/otp/otp-provider.interface.ts` — the `OtpProvider` seam (+ `clinicName` for delivery copy).
- `apps/api/src/auth/otp/local-otp.store.ts` — shared DB store (hashed, TTL, single-use, attempts).
- `apps/api/src/auth/otp/demo-otp.provider.ts` — allowlist demo adapter (returns `demoCode`).
- `apps/api/src/auth/otp/email-otp.provider.ts` — **₹0 default**: email the code to the user's registered address.
- `apps/api/src/auth/otp/supabase-otp.provider.ts` — Supabase Auth adapter + dev fallback.
- `apps/api/src/auth/otp/msg91-otp.provider.ts` — MSG91 Auth API v5 adapter (India SMS/WhatsApp).
- `apps/api/src/auth/otp/otp-provider.factory.ts` — SECURITY-CRITICAL selection rule (`OTP_DELIVERY`).
- `apps/api/src/auth/otp.service.ts` — port: delegates to the resolved provider.
- `packages/db/src/demo.ts` — seeder now writes deterministic demo emails (`<name>@<slug>.demo.jioplix`).
- `scripts/test-otp.mjs` — 26-check hermetic provider test (real path → email console stub).
- `scripts/test-msg91.mjs` — 19-check offline MSG91 adapter test (inline mock server, no SMS spent).
- `scripts/test-otp-live.mjs` — opt-in live round-trip (`--email` ₹0 default; paid SMS needs `ALLOW_LIVE_SMS=true`).

---

## 9. Out of scope (for now)

- **Paid SMS/WhatsApp delivery** via MSG91 / Supabase, TRAI DLT template registration, and provider
  commercial selection — deferred to when a clinic explicitly opts in. Both adapters are fully implemented
  and activate via `OTP_DELIVERY=msg91|supabase`; until then real logins use the ₹0 email path (dev logs the
  code server-side, never client-visible). See `docs/sms-dlt-provider.md` for the DLT/provider playbook.
- Captcha hardening of rate limits (deferred; demo allowlist is trusted in demo only).
