-- OTP requests table (global, not tenant-specific)
-- Used for phone-based passwordless login

CREATE TABLE IF NOT EXISTS public.otp_requests (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone       TEXT NOT NULL,
  clinic_slug TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT false,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_clinic ON public.otp_requests (phone, clinic_slug, verified, created_at DESC);

-- Cleanup old OTP records (older than 24 hours)
-- Run periodically: DELETE FROM public.otp_requests WHERE created_at < now() - interval '24 hours';
