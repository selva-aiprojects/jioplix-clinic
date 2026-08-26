import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { HealthController } from './health/health.controller.js'
import { DbModule } from './db/db.module.js'
import { TenantGuard } from './tenancy/tenant.guard.js'
import { PatientsController } from './patients/patients.controller.js'
import { PatientsService } from './patients/patients.service.js'
import { AppointmentsController } from './appointments/appointments.controller.js'
import { AppointmentsService } from './appointments/appointments.service.js'
import { AuthController } from './auth/auth.controller.js'
import { AuthService } from './auth/auth.service.js'
import { OtpService } from './auth/otp.service.js'
import { JwtAuthGuard } from './auth/jwt-auth.guard.js'
import { PermissionsGuard } from './auth/permissions.guard.js'
import { EncountersModule } from './encounters/encounters.module.js'
import { PrescriptionsModule } from './prescriptions/prescriptions.module.js'
import { BillingModule } from './billing/billing.module.js'
import { AuditModule } from './common/audit.module.js'
import { InventoryController } from './inventory/inventory.controller.js'
import { InventoryService } from './inventory/inventory.service.js'
import { LabsController } from './labs/labs.controller.js'
import { LabsService } from './labs/labs.service.js'
import { ProceduresController } from './procedures/procedures.controller.js'
import { ProceduresService } from './procedures/procedures.service.js'
import { PharmacyController } from './pharmacy/pharmacy.controller.js'
import { PharmacyService } from './pharmacy/pharmacy.service.js'
import { DrugMasterModule } from './drug-master/drug-master.module.js'
import { Icd10Module } from './icd10/icd10.module.js'
import { RxTemplatesModule } from './rx-templates/rx-templates.module.js'
import { NotificationsModule } from './notifications/notifications.module.js'
import { AiJobsModule } from './ai-jobs/ai-jobs.module.js'
import { AnalyticsModule } from './analytics/analytics.module.js'
import { EngagementModule } from './engagement/engagement.module.js'
import { TeleconsultationModule } from './teleconsultation/teleconsultation.module.js'
import { OnboardingModule } from './onboarding/onboarding.module.js'
import { AbdmModule } from './abdm/abdm.module.js'
import { BookingModule } from './booking/booking.module.js'
import { WhatsAppModule } from './whatsapp/whatsapp.module.js'
import { RegistrationModule } from './registration/registration.module.js'
import { SubscriptionModule } from './subscription/subscription.module.js'
import { PlatformAdminModule } from './platform-admin/platform-admin.module.js'
import { MailerModule } from './mailer/mailer.module.js'
import { PaymentModule } from './payment/payment.module.js'
import { PasswordResetModule } from './password-reset/password-reset.module.js'
import { SupportTicketModule } from './support-ticket/support-ticket.module.js'
import { UpgradeModule } from './upgrade/upgrade.module.js'

@Module({
  controllers: [
    HealthController,
    PatientsController,
    AppointmentsController,
    AuthController,
    InventoryController,
    LabsController,
    ProceduresController,
    PharmacyController,
  ],
  providers: [
    TenantGuard,
    PatientsService,
    AppointmentsService,
    AuthService,
    OtpService,
    InventoryService,
    LabsService,
    ProceduresService,
    PharmacyService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  imports: [
    DbModule,
    EncountersModule,
    PrescriptionsModule,
    BillingModule,
    AuditModule,
    DrugMasterModule,
    Icd10Module,
    RxTemplatesModule,
    NotificationsModule,
    AiJobsModule,
    AnalyticsModule,
    EngagementModule,
    TeleconsultationModule,
    AbdmModule,
    WhatsAppModule,
    BookingModule,
    OnboardingModule,
    RegistrationModule,
    SubscriptionModule,
    PlatformAdminModule,
    MailerModule,
    PaymentModule,
    PasswordResetModule,
    SupportTicketModule,
    UpgradeModule,
  ],
})
export class AppModule {}
