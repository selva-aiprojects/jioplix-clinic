-- 0009_platform_settings.sql — Key-value platform configuration for admin
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('payment_enabled', '{"value": true}'::jsonb),
  ('registration_enabled', '{"value": true}'::jsonb),
  ('trial_days', '{"value": 14}'::jsonb),
  ('grace_period_days', '{"value": 7}'::jsonb),
  ('platform_name', '{"value": "Jioplix Clinic OS"}'::jsonb),
  ('support_email', '{"value": "sales@jioplix.com"}'::jsonb),
  ('support_phone', '{"value": "+91 1800-123-4567"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
