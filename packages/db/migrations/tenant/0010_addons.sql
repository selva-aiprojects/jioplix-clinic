-- Jioplix tenant schema: add-on operations modules (inventory, lab orders, procedures)

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('medicines','consumables','lab_reagents','dental_materials','clinic_supplies','equipment')),
  unit TEXT NOT NULL DEFAULT 'units',
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  unit_price_paise BIGINT NOT NULL DEFAULT 0,
  supplier TEXT,
  batch_no TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_qty_nonnegative CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items (category);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('purchase','dispense','transfer','adjustment')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_item_idx ON stock_movements (item_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON stock_movements (created_at);

CREATE TABLE IF NOT EXISTS lab_orders (
  id UUID PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','collected','processing','completed','reviewed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  investigations JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_orders_patient_idx ON lab_orders (patient_id);
CREATE INDEX IF NOT EXISTS lab_orders_created_idx ON lab_orders (created_at);
CREATE INDEX IF NOT EXISTS lab_orders_status_idx ON lab_orders (status);

CREATE TABLE IF NOT EXISTS procedure_orders (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  price_paise BIGINT NOT NULL DEFAULT 0,
  room TEXT,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','prepared','in_progress','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS procedure_orders_patient_idx ON procedure_orders (patient_id);
CREATE INDEX IF NOT EXISTS procedure_orders_created_idx ON procedure_orders (created_at);

UPDATE roles SET permissions = '["patients:*","appointments:*","invoices:*","payments:*","reports:read","users:*","inventory:read"]'::jsonb
WHERE key = 'clinic_admin';

UPDATE roles SET permissions = '["pharmacy:*","prescriptions:read","prescriptions:update","inventory:read","inventory:create","inventory:adjust","invoices:read"]'::jsonb
WHERE key = 'pharmacist';

UPDATE roles SET permissions = '["lab:*","lab_orders:read","lab_orders:create","lab_orders:update","inventory:read"]'::jsonb
WHERE key = 'lab_technician';

UPDATE roles SET permissions = '["patients:*","appointments:*","queue:*","encounters:create","encounters:read","vitals:create","invoices:*","payments:*","inventory:read","procedures:create"]'::jsonb
WHERE key = 'receptionist';
