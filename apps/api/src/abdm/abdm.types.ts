export interface AbhaLinkRequest {
  patientId: string
  abhaNumber: string
  abhaAddress?: string
}

export interface ConsentRequest {
  patientId: string
  purpose: string
  hipIds?: string[]
  careContexts?: string[]
  expiry?: string
}

export interface HealthRecord {
  id: string
  patientId: string
  recordType: string
  source: string
  date: string
  summary: string
  fhirResource: Record<string, unknown>
}

export interface ConsentRecord {
  id: string
  patientId: string
  purpose: string
  status: 'requested' | 'granted' | 'denied' | 'revoked' | 'expired'
  hipIds: string[]
  careContexts: string[]
  expiry?: string
  createdAt: string
  grantedAt?: string
}

export interface AbdmActivityLogEntry {
  id: string
  action: string
  detail: string
  status: 'success' | 'error' | 'info'
  timestamp: string
}

// FHIR R4 resource shapes (subset)

export interface FhirPatient {
  resourceType: 'Patient'
  id: string
  identifier: Array<{ system: string; value: string }>
  name: Array<{ use: string; family: string; given: string[] }>
  gender: 'male' | 'female' | 'other' | 'unknown'
  birthDate: string
}

export interface FhirEncounter {
  resourceType: 'Encounter'
  id: string
  status: 'planned' | 'arrived' | 'in-progress' | 'onleave' | 'finished' | 'cancelled'
  class: { code: string; display: string }
  subject: { reference: string }
  period?: { start?: string; end?: string }
  type?: Array<{
    coding: Array<{ system: string; code: string; display: string }>
  }>
}

export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport'
  id: string
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled'
  category: Array<{
    coding: Array<{ system: string; code: string; display: string }>
  }>
  code: {
    coding: Array<{ system: string; code: string; display: string }>
  }
  subject: { reference: string }
  effectiveDateTime: string
  conclusion?: string
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest'
  id: string
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft'
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order'
  medicationCodeableConcept: {
    coding: Array<{ system: string; code: string; display: string }>
  }
  subject: { reference: string }
  authoredOn: string
  dosageInstruction?: Array<{ text: string }>
}
