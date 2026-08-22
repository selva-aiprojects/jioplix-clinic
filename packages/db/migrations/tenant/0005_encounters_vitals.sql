-- Jioplix tenant schema: encounter vitals (M2 Core Clinical)

CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  bp_systolic INT,
  bp_diastolic INT,
  pulse INT,
  temperature_c DECIMAL(4,1),
  spo2 INT,
  weight_kg DECIMAL(5,1),
  height_cm DECIMAL(5,1),
  bmi DECIMAL(4,1),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS vitals_encounter_idx ON vitals (encounter_id);
