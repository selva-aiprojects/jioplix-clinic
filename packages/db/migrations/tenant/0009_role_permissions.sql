-- Jioplix tenant schema: align role permissions with M2 clinical/billing modules
UPDATE roles SET permissions = '["patients:read","patients:create","appointments:read","appointments:update","queue:read","encounters:*","vitals:*","diagnoses:*","prescriptions:*","lab_orders:*","procedures:*"]'::jsonb
WHERE key = 'doctor';

UPDATE roles SET permissions = '["patients:*","appointments:*","queue:*","encounters:create","encounters:read","vitals:create","invoices:*","payments:*"]'::jsonb
WHERE key = 'receptionist';

UPDATE roles SET permissions = '["patients:*","appointments:*","invoices:*","payments:*","reports:read","users:*"]'::jsonb
WHERE key = 'clinic_admin';

UPDATE roles SET permissions = '["patients:read","queue:*","procedures:execute","vitals:*","encounters:read","vitals:create"]'::jsonb
WHERE key = 'nurse';

UPDATE roles SET permissions = '["invoices:*","payments:*","reports:read"]'::jsonb
WHERE key = 'accountant';
