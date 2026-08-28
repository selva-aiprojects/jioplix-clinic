# Phone OTP Provider Design (Demo → Supabase + India SMS)

Version: 1.0 · Date: 2026-08-28
Companion documents: `docs/architecture.md` (AuthN, §2/§7), `docs/backend-persistence-roadmap.md`,
`docs/prd.md`, `docs/progress.md`

---

## 1. Goal

Provide **phone + OTP verification** that:
- works fully self-contained in **demo mode** (static, on-screen OTP, zero cost, no SMS gateway), and
- swaps cleanly to **Supabase Auth** with an **India SMS/WhatsApp provider** at product sign-off,
  **without changing the web UI or session code**.

This is a **Ports & Adapters** seam: the auth endpoints are the port; each provider is an adapter.

---

## 2. Why Supabase (and why not Firebase)

| | Firebase Phone | Supabase Phone |
|---|---|---|
| Auth OTP service cost | Free tier (10k SMS verifications/mo) | **Free** (50k MAU free tier) |
| SMS delivery | Not in India (disabled for new non-enterprise projects/accounts) | **Supports India** via attached provider (TextLocal, Twilio, Vonage, MessageBird) |
| Web flow | reCAPTCHA required | reCAPTCHA required |
| Cost for a clinic | Per-SMS to provider | Same — provider is the only real cost |
| Fit for India-first product | ⚠️ Blocked for Indian numbers | ✅ Practical path |

Decision: **Supabase Auth** is the identity/verification engine for production. Supabase does **not** send
SMS itself — it must be attached to an SMS/WhatsApp provider (this is the only per-OTP cost, ~₹0.2–0.3 in
India, or cheaper via WhatsApp). For sign-off, **India TRAI DLT** template registration with the chosen
provider is the real operational hurdle, not the Supabase cost.

---

## 3. The two decisions are separate

- **Verification engine** (who issues/validates the OTP): Supabase Auth.
- **Delivery channel** (who physically delivers the OTP): an external SMS/WhatsApp provider.

Keeping them separate means we can change the SMS provider without touching auth, and can run the demo
with **no delivery at all**.

---

## 4. Provider selection rule (SECURITY-CRITICAL)

The provider is chosen by **phone-number allowlist + env flag**, **NOT** by "is this a demo/registered user".

```
provider =
    (DEMO_OTP_ENABLED === 'true' && DEMO_OTP_ALLOWLIST.contains(normalize(phone)))
        ? DemoOtpProvider      // print/log the code, no SMS
        : MSG91_AUTH_KEY && MSG91_TEMPLATE_ID
            ? Msg91OtpProvider  // India SMS/WhatsApp via MSG91 (wins when configured)
            : SupabaseOtpProvider  // real Supabase + SMS/WhatsApp delivery
```

- **Any phone not on the allowlist ALWAYS goes to a real provider**, regardless of account state.
  This prevents an attacker from registering a fake account and using the static-OTP backdoor to verify a
  *real* number.
- The demo flag and allowlist are **off/missing in production**.
- The factory additionally requires the tenant slug to be a **demo clinic** (`nova` only) before
  returning the demo provider — a self-registered tenant can never enable on-screen codes.
- OTP **validation** is never bypassed in any path — the demo path only changes *delivery* (display vs SMS),
  and MSG91/Supabase both do their own server-side validation of the code.

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
| `DemoOtpProvider` | Generate random 6-digit code; **store hashed** (TTL, e.g. 5 min) in tenant `otp_codes` table; return plaintext `demoCode` for the UI to show. | Compare against stored hash; single-use; expire on success/failure-limit. | Demo/staging only, allowlist-gated. |
| `SupabaseOtpProvider` | `supabase.auth.signInWithOtp({ phone })` (real) or via **Send SMS Hook** → custom SMS/WhatsApp provider for India delivery. | `supabase.auth.verifyOtp({ phone, token })` → session. | Production, at sign-off. |
| `Msg91OtpProvider` | MSG91 Auth (OTP) API v5: `POST /api/v5/otp` with DLT-approved `template_id` — MSG91 generates + delivers + rate-limits; our app never sees the code. | `POST /api/v5/otp/verify` → MSG91 confirms server-side. | India-first alternative; wins over Supabase when `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` are set. See `docs/sms-dlt-provider.md`. |

### Selection

A factory reads env + allowlist and returns the active provider; the existing `auth/send-otp` and
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

1. Provision a **Supabase project**; enable **Phone provider**.
2. Attach an **India SMS provider** with **DLT-registered templates** (TextLocal/Twilio+Verify for
   **WhatsApp OTP** — cost-effective for India). Optionally route through a **Send SMS Hook** edge
   function for full delivery control at ~₹0.25/OTP.
3. Keep the `OtpProvider` seam; implement the delivery adapter of choice — `Msg91OtpProvider` (India,
   recommend) or `SupabaseOtpProvider`; set env (see §8). Keys live server-side only; they are never in the
   browser bundle beyond the publishable anon key.
4. Set `DEMO_OTP_ENABLED=false`; remove demo allowlist from production.
5. Map a verified phone identity (Supabase or MSG91) to the tenant `users.phone` at login.

---

## 8. Env vars (additions)

| Variable | Demo | Production |
|---|---|---|
| `DEMO_OTP_ENABLED` | `true` | `false` (unset) |
| `DEMO_OTP_ALLOWLIST` | `+919800000101,+919800000102,...` | unset |
| `DEMO_OTP_TTL_SECONDS` | `300` | n/a |
| `SUPABASE_URL` | unset | set |
| `SUPABASE_SERVICE_ROLE_KEY` / anon key | unset | set (server-side only) |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | unset | set (activates MSG91 over Supabase) |
| `MSG91_OTP_LENGTH` / `MSG91_OTP_EXPIRY_MINUTES` / `MSG91_BASE_URL` | defaults | optional |

---

## 8a. Acceptance checklist

- [x] OTP provider chosen by phone allowlist + env, never by user/demo flag alone.
  Implemented in `OtpProviderFactory.resolve()` — demo requires `DEMO_OTP_ENABLED=true`, a demo-clinic
  slug, **and** an allowlisted phone; any other number hard-routes to a real provider (`Msg91OtpProvider`
  when `MSG91_AUTH_KEY`+`MSG91_TEMPLATE_ID` are set, else `SupabaseOtpProvider`).
- [x] Demo OTP prints on screen with no SMS and no provider cost.
  `DemoOtpProvider` returns `demoCode`; `Login.tsx` renders "Demo OTP: 123456".
- [x] Non-allowlisted numbers are hard-routed to the real provider.
  Verified by test: send-otp for `+919800000999` on `nova` returns **no** `demoCode`.
- [x] UI/`AuthContext` unchanged across both paths.
  Only `otp.service.ts` + new `auth/otp/*` providers changed server-side; web `Login.tsx` already
  renders `data.data.demoCode` when present.
- [x] Web + API typecheck, lint, build green.
  `npm run typecheck`, `npm run lint`, API build all green.

### Test status (2026-08-28)

`node scripts/test-otp.mjs` → **26/26 PASS** (HERMETIC — real path uses the local dev fallback; it forces
`SUPABASE_URL=`/keys empty and never fires live SMS even with creds in `.env`). Coverage:
- Demo path: demoCode surfaced, rate limit, single-use, max-attempts bounding, unknown-clinic hides existence.
- Real path (Supabase adapter): no `demoCode` ever returned (`+919800000999` on `nova`), OTP verified
  end-to-end and a JWT session issued via the self-contained fallback.
- When `SUPABASE_URL` + key are set, the same adapter calls `supabase.auth.signInWithOtp` / `verifyOtp`.

`node scripts/test-msg91.mjs` → **19/19 PASS** (offline — inline mock MSG91 server):
- Demo allowlist still wins; mobile normalization (`+91…` → `91…`); `template_id`/`otp_length`/auth key passed.
- Wrong code → `OTP_INVALID`; correct (mocked) code → JWT session; single-use; rate-limit/resend-window mapping;
  unknown clinic hides existence and spends **zero** SMS; non-allowlisted number on `nova` hard-routes to MSG91.

`node scripts/test-otp-live.mjs send|verify …` → opt-in live round-trip against the **real** configured
provider (refuses to run without `ALLOW_LIVE_SMS=true`; forces `DEMO_OTP_ENABLED=false`).

`npm run smoke` → **49/49**; API build + web lint/typecheck green.

### Env surface (final)

| Variable | Demo | Production |
|---|---|---|
| `DEMO_OTP_ENABLED` | `true` | `false` (unset) |
| `DEMO_OTP_ALLOWLIST` | `+919800000101,+919800000102,...` | unset |
| `DEMO_OTP_TTL_SECONDS` | `300` | n/a |
| `SUPABASE_URL` | unset | set |
| `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | unset | set (server-side only) |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | unset | set (MSG91 wins over Supabase) |

### Files

- `apps/api/src/auth/otp/otp-provider.interface.ts` — the `OtpProvider` seam.
- `apps/api/src/auth/otp/local-otp.store.ts` — shared DB store (hashed, TTL, single-use, attempts).
- `apps/api/src/auth/otp/demo-otp.provider.ts` — allowlist demo adapter (returns `demoCode`).
- `apps/api/src/auth/otp/supabase-otp.provider.ts` — Supabase Auth adapter + dev fallback.
- `apps/api/src/auth/otp/msg91-otp.provider.ts` — MSG91 Auth API v5 adapter (India SMS/WhatsApp).
- `apps/api/src/auth/otp/otp-provider.factory.ts` — SECURITY-CRITICAL selection rule.
- `apps/api/src/auth/otp.service.ts` — port: delegates to the resolved provider.
- `scripts/test-otp.mjs` — 26-check hermetic provider test.
- `scripts/test-msg91.mjs` — 19-check offline MSG91 adapter test (inline mock server, no SMS spent).
- `scripts/test-otp-live.mjs` — opt-in live round-trip (`ALLOW_LIVE_SMS=true`).

---

## 9. Out of scope (for now)

- **Live SMS delivery** via MSG91 / Supabase, TRAI DLT template registration, and provider
  commercial selection — deferred to product sign-off. Both adapters are fully implemented and activate
  the moment their env vars are set (`MSG91_AUTH_KEY`+`MSG91_TEMPLATE_ID`, or `SUPABASE_URL`+key); until
  then the Supabase adapter falls back to a self-contained DB-stored OTP with the code logged server-side
  (never client-visible). See `docs/sms-dlt-provider.md` for the DLT/provider playbook.
- Captcha hardening of rate limits (deferred; demo allowlist is trusted in demo only).
