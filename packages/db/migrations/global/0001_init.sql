-- Jioplix global (platform-wide) schema
-- Applied once per database by the migrator CLI.

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_paise BIGINT NOT NULL,
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning', 'active', 'suspended', 'offboarded')),
  tier TEXT NOT NULL DEFAULT 'shared_schema'
    CHECK (tier IN ('shared_schema', 'dedicated_db')),
  db_conn TEXT,
  plan_code TEXT NOT NULL REFERENCES public.plans(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenants_status_idx ON public.tenants (status);

CREATE TABLE IF NOT EXISTS public.platform_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.plans (code, name, monthly_price_paise, addons) VALUES
  ('starter', 'Starter', 69900, '[]'::jsonb),
  ('professional', 'Professional', 199900, '["pharmacy","laboratory","inventory"]'::jsonb),
  ('clinic', 'Clinic', 399900, '["pharmacy","laboratory","inventory","procedures"]'::jsonb),
  ('enterprise', 'Enterprise', 0, '["pharmacy","laboratory","inventory","procedures","multi_branch"]'::jsonb)
ON CONFLICT (code) DO NOTHING;
