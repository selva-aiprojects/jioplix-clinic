import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { HealthController } from './health/health.controller.js'
import { DbService } from './db/db.service.js'
import { TenantGuard } from './tenancy/tenant.guard.js'
import { PatientsController } from './patients/patients.controller.js'
import { PatientsService } from './patients/patients.service.js'
import { AppointmentsController } from './appointments/appointments.controller.js'
import { AppointmentsService } from './appointments/appointments.service.js'
import { AuthController } from './auth/auth.controller.js'
import { AuthService } from './auth/auth.service.js'
import { JwtAuthGuard } from './auth/jwt-auth.guard.js'
import { PermissionsGuard } from './auth/permissions.guard.js'

@Module({
  controllers: [HealthController, PatientsController, AppointmentsController, AuthController],
  providers: [
    DbService,
    TenantGuard,
    PatientsService,
    AppointmentsService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
