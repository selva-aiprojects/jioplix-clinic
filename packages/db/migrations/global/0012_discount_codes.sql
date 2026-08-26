-- 0012_discount_codes.sql — Discount codes for upgrades and renewals
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value INTEGER NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all',
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes (code);

-- Seed a welcome discount
INSERT INTO public.discount_codes (id, code, description, discount_type, discount_value, applies_to, max_uses, valid_until)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'WELCOME20',
  '20% off first 3 months for new clinics',
  'percentage',
  20,
  'all',
  100,
  '2026-12-31T23:59:59Z'
) ON CONFLICT (code) DO NOTHING;
