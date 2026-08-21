import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
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
