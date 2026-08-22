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
    InventoryService,
    LabsService,
    ProceduresService,
    PharmacyService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  imports: [DbModule, EncountersModule, PrescriptionsModule, BillingModule, AuditModule],
})
export class AppModule {}
