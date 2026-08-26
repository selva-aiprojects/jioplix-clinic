-- 0008_onboarding.sql — Persist onboarding wizard status per tenant
CREATE TABLE IF NOT EXISTS public.tenant_onboarding (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  clinic_profile JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
