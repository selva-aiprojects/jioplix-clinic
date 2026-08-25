export interface RxTemplateItem {
  drugName: string
  genericName?: string
  strength?: string
  form?: string
  dosage: string
  frequency: string
  durationDays?: number
  instructions?: string
}

export interface RxTemplate {
  id: string
  name: string
  category: string
  items: RxTemplateItem[]
  updatedAt: string
}

const STORAGE_KEY = 'jioplix.rxTemplates.v1'

const SEED: RxTemplate[] = [
  {
    id: 'seed-uri',
    name: 'URTI / Common Cold',
    category: 'Acute',
    updatedAt: new Date().toISOString(),
    items: [
      { drugName: 'Paracetamol', genericName: 'Paracetamol', strength: '650 mg', form: 'Tablet', dosage: '650 mg', frequency: 'TDS', durationDays: 3, instructions: 'After food' },
      { drugName: 'Levocl', genericName: 'Levocetirizine', strength: '5 mg', form: 'Tablet', dosage: '5 mg', frequency: 'OD', durationDays: 5, instructions: 'Night' },
      { drugName: 'Cetirizine', genericName: 'Cetirizine', strength: '10 mg', form: 'Tablet', dosage: '10 mg', frequency: 'OD', durationDays: 5, instructions: 'Night' },
    ],
  },
  {
    id: 'seed-gastro',
    name: 'Acute Gastritis',
    category: 'Acute',
    updatedAt: new Date().toISOString(),
    items: [
      { drugName: 'Pan-D', genericName: 'Pantoprazole + Domperidone', strength: '40 mg', form: 'Capsule', dosage: '40 mg', frequency: 'OD', durationDays: 7, instructions: 'Empty stomach, morning' },
      { drugName: 'Ondem', genericName: 'Ondansetron', strength: '4 mg', form: 'Tablet', dosage: '4 mg', frequency: 'BD', durationDays: 3, instructions: 'SOS nausea' },
    ],
  },
  {
    id: 'seed-fever',
    name: 'Viral Fever',
    category: 'Acute',
    updatedAt: new Date().toISOString(),
    items: [
      { drugName: 'Dolo 650', genericName: 'Paracetamol', strength: '650 mg', form: 'Tablet', dosage: '650 mg', frequency: 'SOS', durationDays: 3, instructions: 'For fever > 100F' },
      { drugName: 'Cetirizine', genericName: 'Cetirizine', strength: '10 mg', form: 'Tablet', dosage: '10 mg', frequency: 'OD', durationDays: 5, instructions: 'Night' },
    ],
  },
  {
    id: 'seed-diabetes',
    name: 'T2DM Starter',
    category: 'Chronic',
    updatedAt: new Date().toISOString(),
    items: [
      { drugName: 'Metformin', genericName: 'Metformin', strength: '500 mg', form: 'Tablet', dosage: '500 mg', frequency: 'BD', durationDays: 30, instructions: 'After meals' },
    ],
  },
  {
    id: 'seed-htn',
    name: 'Hypertension',
    category: 'Chronic',
    updatedAt: new Date().toISOString(),
    items: [
      { drugName: 'Amlodipine', genericName: 'Amlodipine', strength: '5 mg', form: 'Tablet', dosage: '5 mg', frequency: 'OD', durationDays: 30, instructions: 'Morning' },
      { drugName: 'Ecosprin', genericName: 'Aspirin', strength: '75 mg', form: 'Tablet', dosage: '75 mg', frequency: 'OD', durationDays: 30, instructions: 'After food' },
    ],
  },
]

function read(): RxTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED))
      return SEED
    }
    const parsed = JSON.parse(raw) as RxTemplate[]
    if (!Array.isArray(parsed)) return SEED
    return parsed
  } catch {
    return SEED
  }
}

function write(templates: RxTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function listRxTemplates(): RxTemplate[] {
  return read()
}

export function saveRxTemplate(name: string, category: string, items: RxTemplateItem[]): RxTemplate {
  const templates = read()
  const tpl: RxTemplate = {
    id: `tpl-${Date.now()}`,
    name,
    category,
    items,
    updatedAt: new Date().toISOString(),
  }
  write([tpl, ...templates])
  return tpl
}

export function deleteRxTemplate(id: string): void {
  write(read().filter(t => t.id !== id))
}
