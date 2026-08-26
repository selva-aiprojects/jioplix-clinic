import { Injectable, Logger } from '@nestjs/common'
import type {
  AbhaLinkRequest,
  ConsentRequest,
  HealthRecord,
  FhirPatient,
  FhirEncounter,
  FhirDiagnosticReport,
  FhirMedicationRequest,
  ConsentRecord,
  AbdmActivityLogEntry,
} from './abdm.types.js'

@Injectable()
export class AbdmService {
  private readonly logger = new Logger(AbdmService.name)
  private readonly apiUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly sandboxMode: boolean

  private readonly activityLog: AbdmActivityLogEntry[] = []

  constructor() {
    this.apiUrl = process.env.ABDM_API_URL ?? 'https://abhasbx.abdm.gov.in'
    this.clientId = process.env.ABDM_CLIENT_ID ?? ''
    this.clientSecret = process.env.ABDM_CLIENT_SECRET ?? ''
    this.sandboxMode = process.env.ABDM_SANDBOX_MODE === 'true'

    this.logger.log(
      `ABDM service initialized — sandbox: ${this.sandboxMode}, url: ${this.apiUrl}`,
    )
  }

  // ---------------------------------------------------------------------------
  // Gateway auth stub
  // ---------------------------------------------------------------------------

  private logActivity(
    action: string,
    detail: string,
    status: 'success' | 'error' | 'info' = 'info',
  ) {
    const entry: AbdmActivityLogEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      detail,
      status,
      timestamp: new Date().toISOString(),
    }
    this.activityLog.unshift(entry)
    if (this.activityLog.length > 100) this.activityLog.length = 100
    this.logger.log(`[ABDM] ${action}: ${detail}`)
  }

  // ---------------------------------------------------------------------------
  // HIU — Health Information User endpoints
  // ---------------------------------------------------------------------------

  async linkAbha(request: AbhaLinkRequest) {
    this.logger.log(
      `linkAbha called — patientId: ${request.patientId}, abhaNumber: ${request.abhaNumber}`,
    )

    // TODO: call ABDM Gateway — /v0.5/abha/link
    // await this.gatewayPost('/v0.5/abha/link', { ... })

    this.logActivity(
      'ABHA_LINK',
      `Linked ABHA ${request.abhaNumber} to patient ${request.patientId}`,
      'success',
    )

    return {
      success: true,
      patientId: request.patientId,
      abhaNumber: request.abhaNumber,
      linkedAt: new Date().toISOString(),
      sandbox: this.sandboxMode,
    }
  }

  async fetchHealthRecords(patientId: string): Promise<HealthRecord[]> {
    this.logger.log(`fetchHealthRecords called — patientId: ${patientId}`)

    // TODO: call ABDM Gateway — /v0.5/health-records/fetch
    // 1. Discover linked ABHA addresses
    // 2. Request care-contexts
    // 3. Fetch records via HIP

    const mockRecords: HealthRecord[] = [
      {
        id: `hr-${Date.now()}-1`,
        patientId,
        recordType: 'Encounter',
        source: 'ABDM Sandbox',
        date: new Date().toISOString(),
        summary: 'Routine checkup — blood pressure normal',
        fhirResource: this.formatFhirEncounter({
          id: `enc-${Date.now()}`,
          patientId,
          date: new Date().toISOString(),
          status: 'finished',
          type: 'Checkup',
        }) as unknown as Record<string, unknown>,
      },
      {
        id: `hr-${Date.now()}-2`,
        patientId,
        recordType: 'DiagnosticReport',
        source: 'ABDM Sandbox',
        date: new Date().toISOString(),
        summary: 'Complete Blood Count — within normal limits',
        fhirResource: this.formatFhirDiagnosticReport({
          id: `dr-${Date.now()}`,
          patientId,
          date: new Date().toISOString(),
          status: 'final',
          code: 'CBC',
        }) as unknown as Record<string, unknown>,
      },
    ]

    this.logActivity(
      'FETCH_RECORDS',
      `Fetched ${mockRecords.length} records for patient ${patientId}`,
      'success',
    )

    return mockRecords
  }

  // ---------------------------------------------------------------------------
  // Consent management
  // ---------------------------------------------------------------------------

  async requestConsent(request: ConsentRequest) {
    this.logger.log(
      `requestConsent called — patientId: ${request.patientId}, purpose: ${request.purpose}`,
    )

    // TODO: call ABDM Gateway — /v0.5/consent/init
    const consentId = `consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const record: ConsentRecord = {
      id: consentId,
      patientId: request.patientId,
      purpose: request.purpose,
      status: 'requested',
      hipIds: request.hipIds ?? [],
      careContexts: request.careContexts ?? [],
      expiry: request.expiry,
      createdAt: new Date().toISOString(),
    }

    this.logActivity(
      'CONSENT_REQUEST',
      `Consent requested for patient ${request.purpose} — id: ${consentId}`,
      'info',
    )

    return record
  }

  async getConsentStatus(id: string): Promise<ConsentRecord> {
    this.logger.log(`getConsentStatus called — id: ${id}`)

    // TODO: call ABDM Gateway — /v0.5/consent/{id}
    this.logActivity('CONSENT_STATUS', `Checked consent ${id}`, 'info')

    return {
      id,
      patientId: 'patient-mock',
      purpose: 'Clinical care',
      status: 'granted',
      hipIds: ['hip-1'],
      careContexts: [],
      createdAt: new Date().toISOString(),
      grantedAt: new Date().toISOString(),
    }
  }

  // ---------------------------------------------------------------------------
  // HIP — Health Information Provider endpoints
  // ---------------------------------------------------------------------------

  async pushRecords(payload: {
    patientId: string
    records: Array<{ type: string; data: Record<string, unknown> }>
  }) {
    this.logger.log(
      `pushRecords called — patientId: ${payload.patientId}, count: ${payload.records.length}`,
    )

    // TODO: call ABDM Gateway — /v0.5/health-records/push
    // Format each record as FHIR R4 resource and push via HIP API

    const results = payload.records.map((r, idx) => ({
      index: idx,
      type: r.type,
      pushed: true,
      reference: `abdm-ref-${Date.now()}-${idx}`,
    }))

    this.logActivity(
      'PUSH_RECORDS',
      `Pushed ${results.length} records for patient ${payload.patientId}`,
      'success',
    )

    return {
      success: true,
      patientId: payload.patientId,
      recordsPushed: results.length,
      references: results,
      sandbox: this.sandboxMode,
    }
  }

  // ---------------------------------------------------------------------------
  // FHIR R4 resource formatting
  // ---------------------------------------------------------------------------

  formatFhirPatient(params: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth?: string
    gender?: string
    abhaNumber?: string
  }): FhirPatient {
    return {
      resourceType: 'Patient',
      id: params.id,
      identifier: params.abhaNumber
        ? [
            {
              system: 'https://healthid.abdm.gov.in',
              value: params.abhaNumber,
            },
          ]
        : [],
      name: [
        {
          use: 'official',
          family: params.lastName,
          given: [params.firstName],
        },
      ],
      gender: (params.gender as 'male' | 'female' | 'other') ?? 'unknown',
      birthDate: params.dateOfBirth ?? '',
    }
  }

  formatFhirEncounter(params: {
    id: string
    patientId: string
    date: string
    status: string
    type: string
  }): FhirEncounter {
    return {
      resourceType: 'Encounter',
      id: params.id,
      status: params.status as FhirEncounter['status'],
      class: { code: 'AMB', display: 'Ambulatory' },
      subject: { reference: `Patient/${params.patientId}` },
      period: { start: params.date },
      type: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '270427003',
              display: params.type,
            },
          ],
        },
      ],
    }
  }

  formatFhirDiagnosticReport(params: {
    id: string
    patientId: string
    date: string
    status: string
    code: string
    conclusion?: string
  }): FhirDiagnosticReport {
    return {
      resourceType: 'DiagnosticReport',
      id: params.id,
      status: params.status as FhirDiagnosticReport['status'],
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
              code: 'LAB',
              display: 'Laboratory',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: params.code,
            display: params.code,
          },
        ],
      },
      subject: { reference: `Patient/${params.patientId}` },
      effectiveDateTime: params.date,
      conclusion: params.conclusion ?? '',
    }
  }

  formatFhirMedicationRequest(params: {
    id: string
    patientId: string
    medicationCode: string
    medicationName: string
    dosageInstruction?: string
    authoredOn: string
  }): FhirMedicationRequest {
    return {
      resourceType: 'MedicationRequest',
      id: params.id,
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: params.medicationCode,
            display: params.medicationName,
          },
        ],
      },
      subject: { reference: `Patient/${params.patientId}` },
      authoredOn: params.authoredOn,
      dosageInstruction: params.dosageInstruction
        ? [{ text: params.dosageInstruction }]
        : [],
    }
  }

  // ---------------------------------------------------------------------------
  // Activity log
  // ---------------------------------------------------------------------------

  getActivityLog(limit = 50): AbdmActivityLogEntry[] {
    return this.activityLog.slice(0, limit)
  }

  // ---------------------------------------------------------------------------
  // Connection status
  // ---------------------------------------------------------------------------

  getConnectionStatus() {
    return {
      connected: Boolean(this.clientId && this.clientSecret),
      sandbox: this.sandboxMode,
      apiUrl: this.apiUrl,
      clientId: this.clientId ? '***configured***' : '',
      lastChecked: new Date().toISOString(),
    }
  }
}
