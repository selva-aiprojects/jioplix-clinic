-- Jioplix tenant schema: encounter diagnoses (M2 Core Clinical)

CREATE TABLE IF NOT EXISTS encounter_diagnoses (
  id UUID PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  icd10_code TEXT NOT NULL,
  icd10_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'primary' CHECK (type IN ('primary', 'secondary', 'differential')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS encounter_diagnoses_encounter_idx ON encounter_diagnoses (encounter_id);
