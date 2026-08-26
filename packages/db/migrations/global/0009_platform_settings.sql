-- 0009_platform_settings.sql — Key-value platform configuration for admin
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('payment_enabled', to_jsonb(true)),
  ('registration_enabled', to_jsonb(true)),
  ('trial_days', to_jsonb(14)),
  ('grace_period_days', to_jsonb(7)),
  ('platform_name', to_jsonb('Jioplix Clinic OS')),
  ('support_email', to_jsonb('sales@jioplix.com')),
  ('support_phone', to_jsonb('+91 1800-123-4567'))
ON CONFLICT (key) DO NOTHING;
