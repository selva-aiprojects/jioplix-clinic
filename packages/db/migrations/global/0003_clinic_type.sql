-- 0003_clinic_type.sql — PRD §4.3/§7.2: clinic type (specialty positioning) on the tenant registry
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS clinic_type TEXT NOT NULL DEFAULT 'general';
