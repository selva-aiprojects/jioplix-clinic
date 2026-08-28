# SMS / WhatsApp OTP provider playbook (India — DLT & MSG91)

This doc is the operational partner to `phone-otp-provider-design.md`. It explains **why** an India
product needs an SMS aggregator + TRAI DLT registration, and how to light up the **MSG91** adapter that
ships in `apps/api/src/auth/otp/msg91-otp.provider.ts`.

## 1. The landscape (read this first)

| Question | Answer |
|---|---|
| Do we need a telecom partner? | **Yes** — but not *us* as a licensee. An SMS **aggregator** (MSG91, Textlocal, Exotel, Twilio, Fast2SMS) is effectively our telecom partner; they hold the operator connections. |
| Can we legally send SMS ourselves? | No. Transactional SMS delivery requires a licensed operator + TRAI compliance. Aggregators make it turnkey. |
| What is DLT? | TRAI's **Distributed Ledger Technology** anti-spam registry. Every transactional SMS in India must be sent from a **DLT-registered sender ID + approved template**. OTP (transactional) is allowed with a `JPLXOK`-style transactional sender ID. |
| Who registers? | Do it **once for Cognivectra as the sender of record** — one DLT registration covers OTP for every tenant clinic. Clinics don't register per-tenant. |
| Cost? | One-time DLT/sender fees (~₹0–2k depending on provider), then **~₹0.18–0.30 / OTP** at scale. No free production SMS exists in India. |
| WhatsApp? | Cheaper per OTP and higher open rates. Needs a WhatsApp Business Account (WABA) + approved template. MSG91/Exotel both offer SMS + WhatsApp OTP. |

## 2. DLT registration checklist (with MSG91)

1. Create an MSG91 account → verify business identity (PAN/GST).
2. **DLT / SMS** section → add a **Sender ID** (e.g. `JPLXOK`) with ownership type *Transactional*.
3. Create the **OTP template** with exactly one variable (`{{otp}}`), e.g.
   `Your Jioplix verification code is {{otp}}. It is valid for 5 minutes.`
   → Template approval is done by the operator; **2–7 days** lead time. Don't schedule a go-live on SMS
   the same week you sign up.
4. From the MSG91 panel **OTP section**, copy the approved `template_id` (this goes to `MSG91_TEMPLATE_ID`).

## 3. Wiring the MSG91 adapter (already in the codebase)

Factory order: **Demo allowlist → MSG91 (if configured) → Supabase**. Setting MSG91 env **overrides**
the Supabase/SMS-stub path for every non-allowlisted number — no code changes needed.

```env
MSG91_AUTH_KEY=<authkey from MSG91 -> API & Automation>
MSG91_TEMPLATE_ID=<DLT-approved OTP template id>
MSG91_OTP_LENGTH=6          # optional, 4–9
MSG91_OTP_EXPIRY_MINUTES=5  # optional
# MSG91_BASE_URL=https://control.msg91.com  # only override for a sandbox/mock
```

How the adapter works (MSG91 Auth API v5, `mobile` in international format **without** `+`):

| Step | Call |
|---|---|
| Send | `POST https://control.msg91.com/api/v5/otp?template_id=&mobile=9188XXXXXX00&authkey=&otp_length=&otp_expiry=` — MSG91 generates, stores, delivers, rate-limits. Our app never sees the code. |
| Verify | `POST https://control.msg91.com/api/v5/otp/verify?mobile=&otp=&authkey=` — MSG91 decides valid/expired/attempts. |
| Resend | `POST https://control.msg91.com/api/v5/otp/retry?mobile=&authkey=&retrytype=text` (resend-window errors map to our 60s "wait" message). |

Error mapping: `Invalid OTP` → `OTP_INVALID`; expired → `OTP_EXPIRED`; attempts/rate-limit → `OTP_MAX_ATTEMPTS`;
anything else → `OTP_PROVIDER_ERROR` — all surfaced as 401 `error.code` to the client.

## 4. Provider matrix for sign-off

| Provider | India DLT | Typical cost/OTP | Ease | Notes |
|---|---|---|---|---|
| **MSG91** | ✅ built-in | ~₹0.2 | Easy | SMS + WhatsApp OTP; our shipped adapter. |
| Textlocal | ✅ built-in | ~₹0.2 | Medium | Supabase dashboard option; old-school docs. |
| Exotel | ✅ built-in | ~₹0.2–0.3 | Medium | Strong WhatsApp + voice fallback. |
| Twilio Verify (via Supabase) | ⚠️ yes, add-on | ~₹0.3+ | Low | Best if project is Supabase-first; WhatsApp for auth. |
| Fast2SMS | ✅ | ~₹0.15–0.2 | Medium | Cheap but thinner docs. |

Recommendation: **MSG91 (SMS + WhatsApp)** for the cheapest reliable India delivery, or keep **Supabase +
Twilio Verify** if you want the OTP engine fully owned by Supabase Auth. Every option plugs into the same
`OtpProvider` seam.

## 5. Testing (all shipped)

```bash
node scripts/test-msg91.mjs            # 19/19 — offline, inline mock MSG91 server, ₹0
node scripts/test-otp.mjs              # 26/26 — hermetic (never fires live SMS)
node scripts/test-otp-live.mjs send nova +918825492600        # opt-in, real SMS
node scripts/test-otp-live.mjs verify nova +918825492600 123456
```

`test-otp-live.mjs` refuses to run unless `ALLOW_LIVE_SMS=true` and forces `DEMO_OTP_ENABLED=false` so an
allowlisted phone cannot mask a live call.

## 6. Cost control during trial/demo

- Keep `DEMO_OTP_ENABLED=true` for demos (₹0, on-screen code).
- Use live SMS only for real-number verification tests — each `signInWithOtp`/MSG91 send spends one OTP.
- Never put a live test number on the demo allowlist unless you want its OTP on-screen instead.