import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  address: jsonb('address').$type<Record<string, string>>().default({}),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  },
  (t) => [uniqueIndex('roles_key_uq').on(t.key)],
)

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    passwordHash: text('password_hash'),
    mfaSecret: text('mfa_secret'),
    specialty: text('specialty'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_phone_uq').on(t.phone)],
)

export const userBranchRoles = pgTable(
  'user_branch_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
  },
  (t) => [uniqueIndex('ubr_uq').on(t.userId, t.branchId, t.roleId)],
)

export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey(),
    mrn: text('mrn').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: text('gender', { enum: ['M', 'F', 'O'] }),
    phone: text('phone').notNull(),
    email: text('email'),
    address: jsonb('address').$type<Record<string, string>>().default({}),
    bloodGroup: text('blood_group'),
    abhaNumber: text('abha_number'),
    abhaAddress: text('abha_address'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('patients_mrn_uq').on(t.mrn),
    index('patients_phone_idx').on(t.phone),
  ],
)

export const patientAllergies = pgTable(
  'patient_allergies',
  {
    id: uuid('id').primaryKey(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    allergen: text('allergen').notNull(),
    severity: text('severity', { enum: ['mild', 'moderate', 'severe'] }),
    notes: text('notes'),
  },
  (t) => [index('patient_allergies_patient_idx').on(t.patientId)],
)

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => users.id),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').notNull().default(15),
    source: text('source', { enum: ['walk_in', 'online', 'whatsapp', 'phone'] })
      .notNull()
      .default('walk_in'),
    status: text('status', {
      enum: ['scheduled', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'],
    })
      .notNull()
      .default('scheduled'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('appointments_doctor_time_idx').on(t.doctorId, t.scheduledAt),
    index('appointments_patient_idx').on(t.patientId),
  ],
)

export const queueTokens = pgTable(
  'queue_tokens',
  {
    id: uuid('id').primaryKey(),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => users.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    queueDate: date('queue_date').notNull(),
    tokenNo: integer('token_no').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status', { enum: ['waiting', 'checked_in', 'consulting', 'completed', 'skipped'] })
      .notNull()
      .default('waiting'),
  },
  (t) => [
    uniqueIndex('queue_tokens_uq').on(t.branchId, t.doctorId, t.queueDate, t.tokenNo),
    index('queue_tokens_day_idx').on(t.branchId, t.doctorId, t.queueDate, t.status),
  ],
)

export const addonEntitlements = pgTable('addon_entitlements', {
  moduleCode: text('module_code').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('refresh_tokens_hash_uq').on(t.tokenHash), index('refresh_tokens_user_idx').on(t.userId)],
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),
    actorUserId: uuid('actor_user_id'),
    actorRole: text('actor_role'),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    action: text('action').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    reason: text('reason'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_entity_idx').on(t.entity, t.entityId), index('audit_logs_created_idx').on(t.createdAt)],
)

export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id').primaryKey(),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    doctorId: uuid('doctor_id').notNull().references(() => users.id),
    branchId: uuid('branch_id').notNull().references(() => branches.id),
    encounterDate: date('encounter_date').notNull().defaultNow(),
    chiefComplaint: text('chief_complaint'),
    historyPresentIllness: text('history_present_illness'),
    examinationFindings: text('examination_findings'),
    clinicalNotes: text('clinical_notes'),
    followUpDate: date('follow_up_date'),
    followUpNotes: text('follow_up_notes'),
    isLocked: boolean('is_locked').notNull().default(false),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: uuid('locked_by').references(() => users.id),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    updatedBy: uuid('updated_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('encounters_patient_idx').on(t.patientId),
    index('encounters_doctor_date_idx').on(t.doctorId, t.encounterDate),
    index('encounters_appointment_idx').on(t.appointmentId),
  ],
)

export const vitals = pgTable(
  'vitals',
  {
    id: uuid('id').primaryKey(),
    encounterId: uuid('encounter_id').notNull().references(() => encounters.id, { onDelete: 'cascade' }),
    bpSystolic: integer('bp_systolic'),
    bpDiastolic: integer('bp_diastolic'),
    pulse: integer('pulse'),
    temperatureC: numeric('temperature_c', { precision: 4, scale: 1, mode: 'number' }),
    spo2: integer('spo2'),
    weightKg: numeric('weight_kg', { precision: 5, scale: 1, mode: 'number' }),
    heightCm: numeric('height_cm', { precision: 5, scale: 1, mode: 'number' }),
    bmi: numeric('bmi', { precision: 4, scale: 1, mode: 'number' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    recordedBy: uuid('recorded_by').notNull().references(() => users.id),
  },
  (t) => [index('vitals_encounter_idx').on(t.encounterId)],
)

export const encounterDiagnoses = pgTable(
  'encounter_diagnoses',
  {
    id: uuid('id').primaryKey(),
    encounterId: uuid('encounter_id').notNull().references(() => encounters.id, { onDelete: 'cascade' }),
    icd10Code: text('icd10_code').notNull(),
    icd10Name: text('icd10_name').notNull(),
    type: text('type', { enum: ['primary', 'secondary', 'differential'] }).notNull().default('primary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('encounter_diagnoses_encounter_idx').on(t.encounterId)],
)

export const prescriptions = pgTable(
  'prescriptions',
  {
    id: uuid('id').primaryKey(),
    encounterId: uuid('encounter_id').notNull().references(() => encounters.id),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    doctorId: uuid('doctor_id').notNull().references(() => users.id),
    status: text('status', { enum: ['draft', 'issued', 'dispensed', 'cancelled'] }).notNull().default('draft'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('prescriptions_encounter_idx').on(t.encounterId),
    index('prescriptions_patient_idx').on(t.patientId),
  ],
)

export const prescriptionItems = pgTable(
  'prescription_items',
  {
    id: uuid('id').primaryKey(),
    prescriptionId: uuid('prescription_id').notNull().references(() => prescriptions.id, { onDelete: 'cascade' }),
    drugName: text('drug_name').notNull(),
    genericName: text('generic_name'),
    strength: text('strength'),
    form: text('form'),
    dosage: text('dosage').notNull(),
    frequency: text('frequency').notNull(),
    route: text('route'),
    durationDays: integer('duration_days'),
    quantity: integer('quantity'),
    instructions: text('instructions'),
    sequence: integer('sequence').notNull().default(0),
  },
  (t) => [index('prescription_items_prescription_idx').on(t.prescriptionId)],
)

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey(),
    invoiceNo: text('invoice_no').notNull().unique(),
    encounterId: uuid('encounter_id').references(() => encounters.id),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    branchId: uuid('branch_id').notNull().references(() => branches.id),
    subTotalPaise: bigint('sub_total_paise', { mode: 'number' }).notNull().default(0),
    discountPaise: bigint('discount_paise', { mode: 'number' }).notNull().default(0),
    cgstPaise: bigint('cgst_paise', { mode: 'number' }).notNull().default(0),
    sgstPaise: bigint('sgst_paise', { mode: 'number' }).notNull().default(0),
    igstPaise: bigint('igst_paise', { mode: 'number' }).notNull().default(0),
    roundOffPaise: bigint('round_off_paise', { mode: 'number' }).notNull().default(0),
    totalPaise: bigint('total_paise', { mode: 'number' }).notNull().default(0),
    paidPaise: bigint('paid_paise', { mode: 'number' }).notNull().default(0),
    balancePaise: bigint('balance_paise', { mode: 'number' }).notNull().default(0),
    status: text('status', { enum: ['draft', 'issued', 'partial', 'paid', 'void', 'refunded'] }).notNull().default('draft'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    updatedBy: uuid('updated_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invoices_patient_idx').on(t.patientId),
    index('invoices_branch_date_idx').on(t.branchId, t.createdAt),
  ],
)

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey(),
    invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
    itemType: text('item_type', { enum: ['consultation', 'procedure', 'pharmacy', 'lab', 'other'] }).notNull(),
    itemName: text('item_name').notNull(),
    hsnCode: text('hsn_code'),
    quantity: integer('quantity').notNull().default(1),
    unitPricePaise: bigint('unit_price_paise', { mode: 'number' }).notNull(),
    lineTotalPaise: bigint('line_total_paise', { mode: 'number' }).notNull(),
    cgstRate: numeric('cgst_rate', { precision: 5, scale: 2, mode: 'number' }).default(0),
    sgstRate: numeric('sgst_rate', { precision: 5, scale: 2, mode: 'number' }).default(0),
    igstRate: numeric('igst_rate', { precision: 5, scale: 2, mode: 'number' }).default(0),
    sequence: integer('sequence').notNull().default(0),
  },
  (t) => [index('invoice_lines_invoice_idx').on(t.invoiceId)],
)

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    mode: text('mode', { enum: ['cash', 'upi', 'card', 'online', 'credit'] }).notNull(),
    reference: text('reference'),
    receivedBy: uuid('received_by').notNull().references(() => users.id),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
  },
  (t) => [index('payments_invoice_idx').on(t.invoiceId)],
)

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category', {
      enum: ['medicines', 'consumables', 'lab_reagents', 'dental_materials', 'clinic_supplies', 'equipment'],
    }).notNull(),
    unit: text('unit').notNull().default('units'),
    quantity: integer('quantity').notNull().default(0),
    reorderLevel: integer('reorder_level').notNull().default(0),
    unitPricePaise: bigint('unit_price_paise', { mode: 'number' }).notNull().default(0),
    supplier: text('supplier'),
    batchNo: text('batch_no'),
    expiryDate: date('expiry_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('inventory_items_category_idx').on(t.category)],
)

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: text('reason', { enum: ['purchase', 'dispense', 'transfer', 'adjustment'] }).notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('stock_movements_item_idx').on(t.itemId),
    index('stock_movements_created_idx').on(t.createdAt),
  ],
)

export const labOrders = pgTable(
  'lab_orders',
  {
    id: uuid('id').primaryKey(),
    orderNo: text('order_no').notNull().unique(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => users.id),
    status: text('status', {
      enum: ['ordered', 'collected', 'processing', 'completed', 'reviewed', 'cancelled'],
    })
      .notNull()
      .default('ordered'),
    priority: text('priority', { enum: ['routine', 'urgent', 'stat'] }).notNull().default('routine'),
    investigations: jsonb('investigations')
      .$type<{ name: string; sampleType: string | null }[]>()
      .notNull()
      .default([]),
    results: jsonb('results').$type<{ name: string; value: string; unit?: string; flag?: string }[]>(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('lab_orders_patient_idx').on(t.patientId),
    index('lab_orders_created_idx').on(t.createdAt),
    index('lab_orders_status_idx').on(t.status),
  ],
)

export const procedureOrders = pgTable(
  'procedure_orders',
  {
    id: uuid('id').primaryKey(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    pricePaise: bigint('price_paise', { mode: 'number' }).notNull().default(0),
    room: text('room'),
    status: text('status', {
      enum: ['ordered', 'prepared', 'in_progress', 'completed', 'cancelled'],
    })
      .notNull()
      .default('ordered'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('procedure_orders_patient_idx').on(t.patientId),
    index('procedure_orders_created_idx').on(t.createdAt),
  ],
)

export const drugMaster = pgTable(
  'drug_master',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brand: text('brand').notNull(),
    generic: text('generic').notNull(),
    strength: text('strength'),
    form: text('form'),
    commonDosages: jsonb('common_dosages').$type<string[]>().notNull().default([]),
    commonFrequencies: jsonb('common_frequencies').$type<string[]>().notNull().default([]),
    commonDurations: jsonb('common_durations').$type<number[]>().notNull().default([]),
    category: text('category'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('drug_master_brand_idx').on(t.brand),
    index('drug_master_generic_idx').on(t.generic),
  ],
)

export const icd10Codes = pgTable(
  'icd10_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    isCommon: boolean('is_common').notNull().default(false),
  },
  (t) => [
    index('icd10_code_idx').on(t.code),
    index('icd10_common_idx').on(t.isCommon),
  ],
)

export const rxTemplates = pgTable(
  'rx_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    category: text('category').notNull().default('General'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rx_templates_owner_idx').on(t.createdBy)],
)

export const rxTemplateItems = pgTable(
  'rx_template_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => rxTemplates.id, { onDelete: 'cascade' }),
    drugName: text('drug_name').notNull(),
    genericName: text('generic_name'),
    strength: text('strength'),
    form: text('form'),
    dosage: text('dosage').notNull(),
    frequency: text('frequency').notNull(),
    durationDays: integer('duration_days'),
    instructions: text('instructions'),
    sequence: integer('sequence').notNull().default(0),
  },
  (t) => [index('rx_template_items_tpl_idx').on(t.templateId)],
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientUserId: uuid('recipient_user_id').references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull().default('system'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    href: text('href'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_recipient_idx').on(t.recipientUserId, t.isRead),
    index('notifications_created_idx').on(t.createdAt),
  ],
)

export const teleconsultationSessions = pgTable(
  'teleconsultation_sessions',
  {
    id: uuid('id').primaryKey(),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id),
    doctorId: uuid('doctor_id').notNull().references(() => users.id),
    status: text('status', {
      enum: ['scheduled', 'waiting', 'in_progress', 'completed', 'cancelled'],
    })
      .notNull()
      .default('scheduled'),
    roomUrl: text('room_url'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    recordingConsent: boolean('recording_consent').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('tc_sessions_patient_idx').on(t.patientId),
    index('tc_sessions_doctor_idx').on(t.doctorId),
    index('tc_sessions_status_idx').on(t.status),
    index('tc_sessions_scheduled_idx').on(t.scheduledAt),
  ],
)

export const aiJobs = pgTable(
  'ai_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['pending', 'processing', 'completed', 'failed'],
    })
      .notNull()
      .default('pending'),
    requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
    context: jsonb('context'),
    result: jsonb('result'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ai_jobs_encounter_idx').on(t.encounterId)],
)
