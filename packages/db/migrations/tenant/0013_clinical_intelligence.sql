-- Jioplix tenant schema: Clinical Intelligence (M3) — drug master, ICD-10, Rx templates, notifications, AI jobs

CREATE TABLE IF NOT EXISTS drug_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  generic TEXT NOT NULL,
  strength TEXT,
  form TEXT,
  common_dosages JSONB NOT NULL DEFAULT '[]',
  common_frequencies JSONB NOT NULL DEFAULT '[]',
  common_durations JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drug_master_brand_idx ON drug_master (lower(brand));
CREATE INDEX IF NOT EXISTS drug_master_generic_idx ON drug_master (lower(generic));

CREATE TABLE IF NOT EXISTS icd10_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_common BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS icd10_code_idx ON icd10_codes (code);
CREATE INDEX IF NOT EXISTS icd10_common_idx ON icd10_codes (is_common) WHERE is_common = true;

CREATE TABLE IF NOT EXISTS rx_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rx_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES rx_templates(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  strength TEXT,
  form TEXT,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INT,
  instructions TEXT,
  sequence INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS rx_template_items_tpl_idx ON rx_template_items (template_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications (recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  context JSONB,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_jobs_encounter_idx ON ai_jobs (encounter_id);

-- Seed: common Indian drug master ------------------------------------------------
INSERT INTO drug_master (brand, generic, strength, form, common_dosages, common_frequencies, common_durations, category) VALUES
  ('Dolo 650', 'Paracetamol', '650 mg', 'Tablet', '["650 mg"]', '["TDS","BD","SOS"]', '[3,5]', 'Antipyretic / Analgesic'),
  ('Crocin', 'Paracetamol', '500 mg', 'Tablet', '["500 mg"]', '["TDS","BD"]', '[3,5]', 'Antipyretic / Analgesic'),
  ('Calpol', 'Paracetamol Suspension', '250 mg/5ml', 'Suspension', '["5 ml","10 ml"]', '["TDS","BD","SOS"]', '[3,5]', 'Antipyretic / Analgesic'),
  ('Augmentin', 'Amoxicillin + Clavulanate', '625 mg', 'Tablet', '["625 mg"]', '["BD","TDS"]', '[5,7]', 'Antibiotic'),
  ('Amoxyclav', 'Amoxicillin + Clavulanate', '875 mg', 'Tablet', '["875 mg"]', '["BD"]', '[5,7]', 'Antibiotic'),
  ('Azithral', 'Azithromycin', '500 mg', 'Tablet', '["500 mg"]', '["OD"]', '[3,5]', 'Antibiotic'),
  ('Cifran', 'Ciprofloxacin', '500 mg', 'Tablet', '["500 mg"]', '["BD"]', '[5,7]', 'Antibiotic'),
  ('Oflox', 'Ofloxacin', '200 mg', 'Tablet', '["200 mg"]', '["BD"]', '[5,7]', 'Antibiotic'),
  ('Metformin', 'Metformin', '500 mg', 'Tablet', '["500 mg","1000 mg"]', '["BD","OD"]', '[30,60]', 'Antidiabetic'),
  ('Glycomet', 'Metformin', '500 mg', 'Tablet', '["500 mg"]', '["BD"]', '[30,60]', 'Antidiabetic'),
  ('Amlodipine', 'Amlodipine', '5 mg', 'Tablet', '["5 mg","10 mg"]', '["OD"]', '[30,60]', 'Antihypertensive'),
  ('Telma', 'Telmisartan', '40 mg', 'Tablet', '["40 mg","80 mg"]', '["OD"]', '[30,60]', 'Antihypertensive'),
  ('Ecosprin', 'Aspirin', '75 mg', 'Tablet', '["75 mg"]', '["OD"]', '[30,60]', 'Antiplatelet'),
  ('Pantoprazole', 'Pantoprazole', '40 mg', 'Tablet', '["40 mg"]', '["OD","BD"]', '[7,14]', 'PPI'),
  ('Rabi', 'Rabeprazole', '20 mg', 'Tablet', '["20 mg"]', '["OD"]', '[7,14]', 'PPI'),
  ('Pan-D', 'Pantoprazole + Domperidone', '40 mg', 'Capsule', '["40 mg"]', '["OD"]', '[7,14]', 'PPI'),
  ('Ondem', 'Ondansetron', '4 mg', 'Tablet', '["4 mg"]', '["BD","SOS"]', '[3,5]', 'Antiemetic'),
  ('Levocet', 'Levocetirizine', '5 mg', 'Tablet', '["5 mg"]', '["OD","BD"]', '[5,7]', 'Antiallergic'),
  ('Cetirizine', 'Cetirizine', '10 mg', 'Tablet', '["10 mg"]', '["OD","BD"]', '[5,7]', 'Antiallergic'),
  ('Allegra', 'Fexofenadine', '120 mg', 'Tablet', '["120 mg"]', '["OD"]', '[5,7]', 'Antiallergic'),
  ('Montelukast', 'Montelukast', '10 mg', 'Tablet', '["10 mg"]', '["OD"]', '[14,30]', 'Anti-asthmatic'),
  ('Salbutamol', 'Salbutamol', '100 mcg', 'Inhaler', '["2 puffs"]', '["BD","SOS"]', '[14,30]', 'Bronchodilator'),
  ('Diclofenac', 'Diclofenac', '50 mg', 'Tablet', '["50 mg"]', '["BD","TDS"]', '[3,5]', 'NSAID'),
  ('Becosules', 'Multivitamin', '1 cap', 'Capsule', '["1 cap"]', '["OD"]', '[30]', 'Supplement'),
  ('Zincovit', 'Multivitamin + Zinc', '1 tab', 'Tablet', '["1 tab"]', '["OD"]', '[30]', 'Supplement'),
  ('Iron + Folic', 'Ferrous + Folic Acid', '1 tab', 'Tablet', '["1 tab"]', '["OD"]', '[30,60]', 'Supplement'),
  ('Thyronorm', 'Levothyroxine', '50 mcg', 'Tablet', '["50 mcg","100 mcg"]', '["OD"]', '[60,90]', 'Thyroid'),
  ('Cetaphil', 'Moisturizing Cream', '1 apply', 'Cream', '["Apply"]', '["BD"]', '[14,30]', 'Dermatology');

-- Seed: common ICD-10 codes -------------------------------------------------------
INSERT INTO icd10_codes (code, name, is_common) VALUES
  ('J00', 'Acute nasopharyngitis (common cold)', true),
  ('J02.9', 'Acute pharyngitis, unspecified', true),
  ('J03.9', 'Acute tonsillitis, unspecified', true),
  ('J06.9', 'Acute upper respiratory infection, unspecified', true),
  ('J11', 'Influenza, virus not identified', true),
  ('J18.9', 'Pneumonia, unspecified organism', true),
  ('J20.9', 'Acute bronchitis, unspecified', true),
  ('J45.909', 'Unspecified asthma, uncomplicated', true),
  ('A09', 'Infectious gastroenteritis and colitis, unspecified', true),
  ('K21.9', 'Gastro-esophageal reflux disease without esophagitis', true),
  ('K29.70', 'Gastritis, unspecified, without bleeding', true),
  ('K59.00', 'Constipation, unspecified', true),
  ('E11.9', 'Type 2 diabetes mellitus without complications', true),
  ('I10', 'Essential (primary) hypertension', true),
  ('N39.0', 'Urinary tract infection, site not specified', true),
  ('L20.9', 'Atopic dermatitis, unspecified', true),
  ('L30.9', 'Dermatitis, unspecified', true),
  ('L70.0', 'Acne vulgaris', true),
  ('H66.90', 'Otitis media, unspecified, unspecified ear', true),
  ('H10.9', 'Unspecified conjunctivitis', true),
  ('M54.50', 'Low back pain, unspecified', true),
  ('M25.50', 'Pain in unspecified joint', true),
  ('F41.9', 'Anxiety disorder, unspecified', true),
  ('D50.9', 'Iron deficiency anaemia, unspecified', true),
  ('R51', 'Headache', true),
  ('R10.4', 'Other and unspecified abdominal pain', true),
  ('R05', 'Cough', true),
  ('R50.9', 'Fever, unspecified', true),
  ('R07.4', 'Chest pain, unspecified', true),
  ('R42', 'Dizziness and giddiness', false),
  ('J44.9', 'Chronic obstructive pulmonary disease, unspecified', false),
  ('J44.1', 'COPD with (acute) exacerbation', false),
  ('I20.9', 'Angina pectoris, unspecified', false),
  ('A46', 'Erysipelas', false),
  ('B34.4', 'Adenovirus infection, unspecified', false),
  ('L02.9', 'Cutaneous abscess, furuncle and carbuncle, unspecified', false),
  ('K35.80', 'Unspecified acute appendicitis', false),
  ('N17.9', 'Acute kidney failure, unspecified', false),
  ('E63.9', 'Nutritional deficiency, unspecified', false),
  ('Z00.0', 'General adult examination, well person', false),
  ('Z34.9', 'Encounter for supervision of normal pregnancy', false);
