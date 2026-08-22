-- Jioplix tenant schema: clinical encounters (M2 Core Clinical)

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  history_present_illness TEXT,
  examination_findings TEXT,
  clinical_notes TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS encounters_patient_idx ON encounters (patient_id);
CREATE INDEX IF NOT EXISTS encounters_doctor_date_idx ON encounters (doctor_id, encounter_date);
CREATE INDEX IF NOT EXISTS encounters_appointment_idx ON encounters (appointment_id);
