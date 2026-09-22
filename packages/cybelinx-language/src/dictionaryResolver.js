// Tier 1: Common Base English & Clinical Workflows Vocabulary
const DEFAULT_COMMON_WORDS = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'patient', 'doctor', 'report', 'appointment', 'visit', 'record', 'clinical',
    'consultation', 'hospital', 'clinic', 'nurse', 'receptionist', 'history',
    'present', 'presents', 'presented', 'complaint', 'duration', 'symptoms',
    'examination', 'findings', 'notes', 'assessment', 'plan', 'advice',
    'follow', 'date', 'review', 'normal', 'abnormal', 'stable', 'critical',
    'acute', 'chronic', 'mild', 'moderate', 'severe', 'pain', 'fever',
    'cough', 'cold', 'headache', 'weakness', 'fatigue', 'vomiting', 'nausea',
    'diarrhea', 'constipation', 'swelling', 'rash', 'allergy', 'itching',
    'chest', 'abdomen', 'throat', 'eye', 'ear', 'nose', 'skin', 'head',
    'back', 'neck', 'arm', 'leg', 'foot', 'hand', 'joint', 'muscle',
    'morning', 'evening', 'night', 'daily', 'weekly', 'meals', 'food',
    'empty', 'stomach', 'water', 'tablet', 'capsule', 'syrup', 'injection',
    'drops', 'cream', 'ointment', 'dosage', 'frequency', 'duration', 'days',
    'weeks', 'months', 'years', 'age', 'gender', 'male', 'female', 'weight',
    'height', 'temperature', 'pulse', 'pressure', 'status', 'verified',
    'signed', 'closed', 'active', 'pending', 'completed', 'scheduled', 'cancelled'
];
// Tier 2: Domain-specific Vocabularies
const HEALTHCARE_DOMAIN_WORDS = [
    // Common medications & generics
    'paracetamol', 'metformin', 'amlodipine', 'pantoprazole', 'domperidone',
    'atorvastatin', 'azithromycin', 'levocetirizine', 'diclofenac', 'amoxicillin',
    'ceftriaxone', 'ciprofloxacin', 'losartan', 'telmisartan', 'metoprolol',
    'omeprazole', 'rabeprazole', 'montelukast', 'salbutamol', 'budesonide',
    'doxycycline', 'clarithromycin', 'ibuprofen', 'aceclofenac', 'tramadol',
    'ondansetron', 'ranitidine', 'famotidine', 'insulin', 'glimepiride',
    'vildagliptin', 'dapagliflozin', 'empagliflozin', 'clopidogrel', 'aspirin',
    // Common clinical descriptors & findings
    'elevated', 'reduced', 'decreased', 'increased', 'normal', 'positive', 'negative',
    'bilateral', 'unilateral', 'anterior', 'posterior', 'proximal', 'distal',
    'supine', 'prone', 'benign', 'malignant', 'palpable', 'tenderness', 'edema',
    'murmur', 'wheeze', 'crackles', 'rales', 'crepitations', 'cyanosis', 'pallor',
    'icterus', 'clubbing', 'lymphadenopathy', 'febrile', 'afebrile',
    'hypertension', 'diabetes', 'mellitus', 'dyspnea', 'tachycardia', 'bradycardia',
    'erythema', 'leukocytosis', 'thrombocytopenia', 'anemia', 'gastritis',
    'gastroenteritis', 'pharyngitis', 'tonsillitis', 'bronchitis', 'pneumonia',
    'asthma', 'copd', 'neuropathy', 'nephropathy', 'retinopathy', 'arthritis',
    'osteoarthritis', 'spondylosis', 'dermatitis', 'eczema', 'psoriasis',
    'migraine', 'vertigo', 'hypothyroidism', 'hyperthyroidism', 'uti',
    // Lab Tests, Biomarkers & Diagnostics
    'hba1c', 'cbc', 'esr', 'crp', 'troponin', 'creatinine', 'urea', 'bilirubin',
    'sgot', 'sgpt', 'alt', 'ast', 'alp', 'electrolytes', 'sodium', 'potassium',
    'calcium', 'tsh', 't3', 't4', 'lipid', 'cholesterol', 'triglycerides',
    'hdl', 'ldl', 'vldl', 'ecg', 'eeg', 'xray', 'ultrasound', 'mri', 'ct',
    'biopsy', 'culture', 'sensitivity', 'pap', 'smear', 'endoscopy',
    // Identifiers, Clinical abbreviations & EMR acronyms
    'mrn', 'uhid', 'abha', 'abdm', 'fhir', 'soap', 'hpi', 'vitals',
    'bp', 'spo2', 'hr', 'rr', 'bmi', 'bsa', 'od', 'bd', 'tds', 'qid',
    'sos', 'stat', 'prn', 'hs', 'po', 'iv', 'im', 'sc', 'sl',
    'rx', 'dx', 'hx', 'tx', 'sx', 'fx'
];
const FINANCE_DOMAIN_WORDS = [
    'gstin', 'gst', 'cgst', 'sgst', 'igst', 'pan', 'tan', 'tds', 'tcs',
    'hsn', 'sac', 'invoice', 'e-invoice', 'waybill', 'taxable', 'exempted',
    'ledger', 'reconciliation', 'debit', 'credit', 'voucher', 'receivable',
    'payable', 'depreciation', 'amortization', 'accrual', 'balance', 'turnover',
    'ebitda', 'pat', 'pbt', 'input', 'contra', 'audit', 'rbi', 'neft', 'rtgs', 'imps', 'upi'
];
const HRMS_DOMAIN_WORDS = [
    'ctc', 'kra', 'kpi', 'appraisal', 'attrition', 'probation', 'pip',
    'gratuity', 'pf', 'epf', 'esi', 'allowance', 'reimbursement', 'payroll',
    'arrears', 'leave', 'cl', 'sl', 'el', 'maternity', 'paternity', 'notice',
    'severance', 'onboarding', 'offboarding', 'timesheet', 'attendance', 'bio'
];
export class DictionaryResolver {
    commonDictionary;
    domainDictionaries;
    tenantDictionaries;
    constructor() {
        this.commonDictionary = new Set(DEFAULT_COMMON_WORDS.map(w => w.toLowerCase()));
        this.domainDictionaries = new Map();
        this.domainDictionaries.set('healthcare', new Set(HEALTHCARE_DOMAIN_WORDS.map(w => w.toLowerCase())));
        this.domainDictionaries.set('finance', new Set(FINANCE_DOMAIN_WORDS.map(w => w.toLowerCase())));
        this.domainDictionaries.set('hrms', new Set(HRMS_DOMAIN_WORDS.map(w => w.toLowerCase())));
        this.tenantDictionaries = new Map();
    }
    loadCommonDictionary(words) {
        for (const w of words) {
            this.commonDictionary.add(w.toLowerCase().trim());
        }
    }
    loadDomainDictionary(domain, words) {
        const existing = this.domainDictionaries.get(domain.toLowerCase()) ?? new Set();
        for (const w of words) {
            existing.add(w.toLowerCase().trim());
        }
        this.domainDictionaries.set(domain.toLowerCase(), existing);
    }
    addTenantTerms(tenantId, words) {
        const key = tenantId.toLowerCase().trim();
        const existing = this.tenantDictionaries.get(key) ?? new Set();
        for (const w of words) {
            existing.add(w.toLowerCase().trim());
        }
        this.tenantDictionaries.set(key, existing);
    }
    resolveEffectiveTerms(options) {
        const terms = new Set(this.commonDictionary);
        if (options?.domain) {
            const domainTerms = this.domainDictionaries.get(options.domain.toLowerCase());
            if (domainTerms) {
                for (const t of domainTerms) {
                    terms.add(t);
                }
            }
        }
        if (options?.tenantId) {
            const tenantTerms = this.tenantDictionaries.get(options.tenantId.toLowerCase());
            if (tenantTerms) {
                for (const t of tenantTerms) {
                    terms.add(t);
                }
            }
        }
        return terms;
    }
}
