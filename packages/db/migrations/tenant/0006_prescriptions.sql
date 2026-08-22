-- Jioplix tenant schema: prescriptions (M2 Core Clinical)

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'dispensed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prescriptions_encounter_idx ON prescriptions (encounter_id);
CREATE INDEX IF NOT EXISTS prescriptions_patient_idx ON prescriptions (patient_id);

CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  strength TEXT,
  form TEXT CHECK (form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other')),
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT CHECK (route IN ('oral', 'topical', 'injection', 'inhaled', 'other')),
  duration_days INT,
  quantity INT,
  instructions TEXT,
  sequence INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS prescription_items_prescription_idx ON prescription_items (prescription_id);
