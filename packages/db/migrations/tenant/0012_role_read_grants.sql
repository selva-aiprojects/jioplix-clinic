-- 0012_role_read_grants.sql
-- Grant front-line roles read access to the add-on modules they legitimately track,
-- so no visible page errors with PERMISSION_DENIED after the sidebar permission gating.

-- Doctors: check stock of meds they prescribe + view invoices tied to their encounters
UPDATE roles SET permissions = permissions || '["inventory:read"]'::jsonb
WHERE key = 'doctor' AND NOT permissions @> '["inventory:read"]'::jsonb;

UPDATE roles SET permissions = permissions || '["invoices:read"]'::jsonb
WHERE key = 'doctor' AND NOT permissions @> '["invoices:read"]'::jsonb;

-- Receptionists: front desk tracks Rx/lab/procedure status for walk-ins and calls
UPDATE roles SET permissions = permissions || '["prescriptions:read"]'::jsonb
WHERE key = 'receptionist' AND NOT permissions @> '["prescriptions:read"]'::jsonb;

UPDATE roles SET permissions = permissions || '["lab_orders:read"]'::jsonb
WHERE key = 'receptionist' AND NOT permissions @> '["lab_orders:read"]'::jsonb;

UPDATE roles SET permissions = permissions || '["procedures:read"]'::jsonb
WHERE key = 'receptionist' AND NOT permissions @> '["procedures:read"]'::jsonb;
