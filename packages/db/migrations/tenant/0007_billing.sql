-- Jioplix tenant schema: billing + payments (M2 Core Clinical)

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  encounter_id UUID REFERENCES encounters(id),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sub_total_paise BIGINT NOT NULL DEFAULT 0,
  discount_paise BIGINT NOT NULL DEFAULT 0,
  cgst_paise BIGINT NOT NULL DEFAULT 0,
  sgst_paise BIGINT NOT NULL DEFAULT 0,
  igst_paise BIGINT NOT NULL DEFAULT 0,
  round_off_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL DEFAULT 0,
  paid_paise BIGINT NOT NULL DEFAULT 0,
  balance_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'void', 'refunded')),
  issued_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_patient_idx ON invoices (patient_id);
CREATE INDEX IF NOT EXISTS invoices_branch_date_idx ON invoices (branch_id, created_at);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('consultation', 'procedure', 'pharmacy', 'lab', 'other')),
  item_name TEXT NOT NULL,
  hsn_code TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price_paise BIGINT NOT NULL,
  line_total_paise BIGINT NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  sequence INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON invoice_lines (invoice_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount_paise BIGINT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'card', 'online', 'credit')),
  reference TEXT,
  received_by UUID NOT NULL REFERENCES users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);
