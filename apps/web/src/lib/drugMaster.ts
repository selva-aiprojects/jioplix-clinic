export interface DrugMasterEntry {
  brand: string
  generic: string
  strength: string
  form: string
  commonDosages: string[]
  commonFrequencies: string[]
  commonDurations: number[]
  category: string
}

const DRUGS: DrugMasterEntry[] = [
  { brand: 'Dolo 650', generic: 'Paracetamol', strength: '650 mg', form: 'Tablet', commonDosages: ['650 mg'], commonFrequencies: ['TDS', 'BD', 'SOS'], commonDurations: [3, 5], category: 'Antipyretic / Analgesic' },
  { brand: 'Crocin', generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', commonDosages: ['500 mg'], commonFrequencies: ['TDS', 'BD'], commonDurations: [3, 5], category: 'Antipyretic / Analgesic' },
  { brand: 'Augmentin', generic: 'Amoxicillin + Clavulanate', strength: '625 mg', form: 'Tablet', commonDosages: ['625 mg'], commonFrequencies: ['BD', 'TDS'], commonDurations: [5, 7], category: 'Antibiotic' },
  { brand: 'Azithral', generic: 'Azithromycin', strength: '500 mg', form: 'Tablet', commonDosages: ['500 mg'], commonFrequencies: ['OD'], commonDurations: [3, 5], category: 'Antibiotic' },
  { brand: 'Cifran', generic: 'Ciprofloxacin', strength: '500 mg', form: 'Tablet', commonDosages: ['500 mg'], commonFrequencies: ['BD'], commonDurations: [5, 7], category: 'Antibiotic' },
  { brand: 'Metformin', generic: 'Metformin', strength: '500 mg', form: 'Tablet', commonDosages: ['500 mg', '1000 mg'], commonFrequencies: ['BD', 'OD'], commonDurations: [30, 60], category: 'Antidiabetic' },
  { brand: 'Glycomet', generic: 'Metformin', strength: '500 mg', form: 'Tablet', commonDosages: ['500 mg'], commonFrequencies: ['BD'], commonDurations: [30, 60], category: 'Antidiabetic' },
  { brand: 'Amlodipine', generic: 'Amlodipine', strength: '5 mg', form: 'Tablet', commonDosages: ['5 mg', '10 mg'], commonFrequencies: ['OD'], commonDurations: [30, 60], category: 'Antihypertensive' },
  { brand: 'Telma', generic: 'Telmisartan', strength: '40 mg', form: 'Tablet', commonDosages: ['40 mg', '80 mg'], commonFrequencies: ['OD'], commonDurations: [30, 60], category: 'Antihypertensive' },
  { brand: 'Ecosprin', generic: 'Aspirin', strength: '75 mg', form: 'Tablet', commonDosages: ['75 mg'], commonFrequencies: ['OD'], commonDurations: [30, 60], category: 'Antiplatelet' },
  { brand: 'Pantoprazole', generic: 'Pantoprazole', strength: '40 mg', form: 'Tablet', commonDosages: ['40 mg'], commonFrequencies: ['OD', 'BD'], commonDurations: [7, 14], category: 'PPI' },
  { brand: 'Pan-D', generic: 'Pantoprazole + Domperidone', strength: '40 mg', form: 'Capsule', commonDosages: ['40 mg'], commonFrequencies: ['OD'], commonDurations: [7, 14], category: 'PPI' },
  { brand: 'Ondem', generic: 'Ondansetron', strength: '4 mg', form: 'Tablet', commonDosages: ['4 mg'], commonFrequencies: ['BD', 'SOS'], commonDurations: [3, 5], category: 'Antiemetic' },
  { brand: 'Levocet', generic: 'Levocetirizine', strength: '5 mg', form: 'Tablet', commonDosages: ['5 mg'], commonFrequencies: ['OD', 'BD'], commonDurations: [5, 7], category: 'Antiallergic' },
  { brand: 'Allegra', generic: 'Fexofenadine', strength: '120 mg', form: 'Tablet', commonDosages: ['120 mg'], commonFrequencies: ['OD'], commonDurations: [5, 7], category: 'Antiallergic' },
  { brand: 'Becosules', generic: 'Multivitamin', strength: '1 cap', form: 'Capsule', commonDosages: ['1 cap'], commonFrequencies: ['OD'], commonDurations: [30], category: 'Supplement' },
  { brand: 'Iron + Folic', generic: 'Ferrous + Folic Acid', strength: '1 tab', form: 'Tablet', commonDosages: ['1 tab'], commonFrequencies: ['OD'], commonDurations: [30, 60], category: 'Supplement' },
  { brand: 'Calpol', generic: 'Paracetamol Suspension', strength: '250 mg/5ml', form: 'Suspension', commonDosages: ['5 ml', '10 ml'], commonFrequencies: ['TDS', 'BD', 'SOS'], commonDurations: [3, 5], category: 'Antipyretic / Analgesic' },
  { brand: 'Salbutamol', generic: 'Salbutamol', strength: '100 mcg', form: 'Inhaler', commonDosages: ['2 puffs'], commonFrequencies: ['BD', 'SOS'], commonDurations: [14, 30], category: 'Bronchodilator' },
  { brand: 'Montelukast', generic: 'Montelukast', strength: '10 mg', form: 'Tablet', commonDosages: ['10 mg'], commonFrequencies: ['OD'], commonDurations: [14, 30], category: 'Anti-asthmatic' },
  { brand: 'Diclofenac', generic: 'Diclofenac', strength: '50 mg', form: 'Tablet', commonDosages: ['50 mg'], commonFrequencies: ['BD', 'TDS'], commonDurations: [3, 5], category: 'NSAID' },
  { brand: 'Rabi', generic: 'Rabeprazole', strength: '20 mg', form: 'Tablet', commonDosages: ['20 mg'], commonFrequencies: ['OD'], commonDurations: [7, 14], category: 'PPI' },
  { brand: 'Cetirizine', generic: 'Cetirizine', strength: '10 mg', form: 'Tablet', commonDosages: ['10 mg'], commonFrequencies: ['OD', 'BD'], commonDurations: [5, 7], category: 'Antiallergic' },
  { brand: 'Cetaphil', generic: 'Moisturizing Cream', strength: '1 apply', form: 'Cream', commonDosages: ['Apply'], commonFrequencies: ['BD'], commonDurations: [14, 30], category: 'Dermatology' },
  { brand: 'Amoxyclav', generic: 'Amoxicillin + Clavulanate', strength: '875 mg', form: 'Tablet', commonDosages: ['875 mg'], commonFrequencies: ['BD'], commonDurations: [5, 7], category: 'Antibiotic' },
  { brand: 'Oflox', generic: 'Ofloxacin', strength: '200 mg', form: 'Tablet', commonDosages: ['200 mg'], commonFrequencies: ['BD'], commonDurations: [5, 7], category: 'Antibiotic' },
  { brand: 'Zincovit', generic: 'Multivitamin + Zinc', strength: '1 tab', form: 'Tablet', commonDosages: ['1 tab'], commonFrequencies: ['OD'], commonDurations: [30], category: 'Supplement' },
  { brand: 'Thyronorm', generic: 'Levothyroxine', strength: '50 mcg', form: 'Tablet', commonDosages: ['50 mcg', '100 mcg'], commonFrequencies: ['OD'], commonDurations: [60, 90], category: 'Thyroid' },
]

export function searchDrugs(query: string, limit = 8): DrugMasterEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return DRUGS.slice(0, limit)
  return DRUGS.filter(d =>
    d.brand.toLowerCase().includes(q) ||
    d.generic.toLowerCase().includes(q) ||
    d.category.toLowerCase().includes(q),
  ).slice(0, limit)
}

export const COMMON_FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS', 'Alternate day', 'Weekly']
export const COMMON_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Inhaler', 'Drops']
