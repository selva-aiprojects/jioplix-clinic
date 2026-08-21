-- 0004_doctor_scheduling_perms.sql — doctors see their schedule & queue (Epic 3)
UPDATE roles
SET permissions = permissions || '["appointments:read", "queue:read"]'::jsonb
WHERE key = 'doctor'
  AND NOT permissions @> '["appointments:read"]';
