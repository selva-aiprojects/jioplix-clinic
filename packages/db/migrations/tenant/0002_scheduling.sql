-- Jioplix tenant schema: scheduling & queue (Epic 3)

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 15,
  source TEXT NOT NULL DEFAULT 'walk_in'
    CHECK (source IN ('walk_in', 'online', 'whatsapp', 'phone')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_doctor_time_idx ON appointments (doctor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status) WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_consultation');

CREATE TABLE IF NOT EXISTS queue_tokens (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  queue_date DATE NOT NULL,
  token_no INT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'checked_in', 'consulting', 'completed', 'skipped')),
  CONSTRAINT queue_tokens_uq UNIQUE (branch_id, doctor_id, queue_date, token_no)
);

CREATE INDEX IF NOT EXISTS queue_tokens_day_idx ON queue_tokens (branch_id, doctor_id, queue_date, status);
