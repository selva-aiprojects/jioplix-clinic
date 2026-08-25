export interface Icd10Entry {
  code: string
  name: string
  common: boolean
}

const ICD10: Icd10Entry[] = [
  { code: 'J00', name: 'Acute nasopharyngitis (common cold)', common: true },
  { code: 'J02.9', name: 'Acute pharyngitis, unspecified', common: true },
  { code: 'J03.9', name: 'Acute tonsillitis, unspecified', common: true },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified', common: true },
  { code: 'J11', name: 'Influenza, virus not identified', common: true },
  { code: 'J18.9', name: 'Pneumonia, unspecified organism', common: true },
  { code: 'J20.9', name: 'Acute bronchitis, unspecified', common: true },
  { code: 'J45.909', name: 'Unspecified asthma, uncomplicated', common: true },
  { code: 'A09', name: 'Infectious gastroenteritis and colitis, unspecified', common: true },
  { code: 'K21.9', name: 'Gastro-esophageal reflux disease without esophagitis', common: true },
  { code: 'K29.70', name: 'Gastritis, unspecified, without bleeding', common: true },
  { code: 'K59.00', name: 'Constipation, unspecified', common: true },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications', common: true },
  { code: 'E11.65', name: 'Type 2 diabetes mellitus with hyperglycemia', common: false },
  { code: 'I10', name: 'Essential (primary) hypertension', common: true },
  { code: 'I20.9', name: 'Angina pectoris, unspecified', common: false },
  { code: 'J44.9', name: 'Chronic obstructive pulmonary disease, unspecified', common: false },
  { code: 'J44.1', name: 'COPD with (acute) exacerbation', common: false },
  { code: 'N39.0', name: 'Urinary tract infection, site not specified', common: true },
  { code: 'A46', name: 'Erysipelas', common: false },
  { code: 'L20.9', name: 'Atopic dermatitis, unspecified', common: true },
  { code: 'L30.9', name: 'Dermatitis, unspecified', common: true },
  { code: 'B34.4', name: 'Adenovirus infection, unspecified', common: false },
  { code: 'H66.90', name: 'Otitis media, unspecified, unspecified ear', common: true },
  { code: 'H10.9', name: 'Unspecified conjunctivitis', common: true },
  { code: 'M54.50', name: 'Low back pain, unspecified', common: true },
  { code: 'M25.50', name: 'Pain in unspecified joint', common: true },
  { code: 'F41.9', name: 'Anxiety disorder, unspecified', common: true },
  { code: 'F32.9', name: 'Major depressive disorder, single episode, unspecified', common: false },
  { code: 'D50.9', name: 'Iron deficiency anaemia, unspecified', common: true },
  { code: 'E63.9', name: 'Nutritional deficiency, unspecified', common: false },
  { code: 'L70.0', name: 'Acne vulgaris', common: true },
  { code: 'B02.9', name: 'Zoster without complications', common: false },
  { code: 'A63.0', name: 'Anogenital (venereal) warts', common: false },
  { code: 'R51', name: 'Headache', common: true },
  { code: 'R10.4', name: 'Other and unspecified abdominal pain', common: true },
  { code: 'R05', name: 'Cough', common: true },
  { code: 'R50.9', name: 'Fever, unspecified', common: true },
  { code: 'R07.4', name: 'Chest pain, unspecified', common: true },
  { code: 'R42', name: 'Dizziness and giddiness', common: false },
  { code: 'Z00.0', name: 'General adult examination, well person', common: false },
  { code: 'Z34.9', name: 'Encounter for supervision of normal pregnancy', common: false },
]

export function searchIcd10(query: string, limit = 8): Icd10Entry[] {
  const q = query.trim().toLowerCase()
  if (!q) return ICD10.filter(d => d.common).slice(0, limit)
  const exact = ICD10.filter(d => d.code.toLowerCase() === q)
  const contains = ICD10.filter(d =>
    d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q),
  )
  return [...exact, ...contains.filter(c => !exact.includes(c))].slice(0, limit)
}
