-- Jioplix tenant schema: relax prescription_items form/route CHECKs
-- The app allows free-text forms (Tablet, Suspension, Inhaler, Ointment, ...) and
-- mixed case; the original CHECK whitelist was too strict and rejected valid entries.

ALTER TABLE prescription_items
  DROP CONSTRAINT IF EXISTS prescription_items_form_check;

ALTER TABLE prescription_items
  DROP CONSTRAINT IF EXISTS prescription_items_route_check;

UPDATE prescription_items
   SET form = lower(trim(form))
 WHERE form IS NOT NULL AND form <> lower(trim(form));

UPDATE prescription_items
   SET route = lower(trim(route))
 WHERE route IS NOT NULL AND route <> lower(trim(route));