-- Jioplix tenant schema DDL
-- Applied inside each tenant schema with search_path set to that schema.
-- Every table lives entirely within the tenant boundary.

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address JSONB DEFAULT '{}'::jsonb,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT,
  mfa_secret TEXT,
  specialty TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_branch_roles (
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  CONSTRAINT user_branch_roles_uq UNIQUE (user_id, branch_id, role_id)
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  mrn TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'O')),
  phone TEXT NOT NULL,
  email TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  blood_group TEXT,
  abha_number TEXT,
  abha_address TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients (phone);
CREATE INDEX IF NOT EXISTS patients_name_trgm_idx ON patients
  USING gin ((first_name || ' ' || last_name) public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS patients_abha_idx ON patients (abha_number)
  WHERE abha_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  allergen TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS patient_allergies_patient_idx ON patient_allergies (patient_id);

CREATE TABLE IF NOT EXISTS addon_entitlements (
  module_code TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  valid_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  actor_user_id UUID,
  actor_role TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
