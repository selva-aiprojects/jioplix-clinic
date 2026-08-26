-- 0007_platform_auth.sql — Platform admin password authentication
ALTER TABLE public.platform_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
