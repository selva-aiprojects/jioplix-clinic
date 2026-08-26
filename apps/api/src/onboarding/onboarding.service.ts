import { Injectable } from '@nestjs/common'

export interface ClinicProfileInput {
  clinicName: string
  clinicType: string
  address: string
  phone: string
  email: string
}

export interface DoctorInput {
  name: string
  specialty: string
  phone: string
  email: string
}

export interface ReceptionistInput {
  name: string
  phone: string
}

export interface OnboardingCompleteInput {
  clinicProfile: ClinicProfileInput
  doctor: DoctorInput
  receptionist: ReceptionistInput
  addons: string[]
}

@Injectable()
export class OnboardingService {
  private readonly onboardingStatus = new Map<string, boolean>()

  async getStatus(tenantId: string): Promise<{ completed: boolean }> {
    return { completed: this.onboardingStatus.get(tenantId) === true }
  }

  async complete(tenantId: string, _input: OnboardingCompleteInput): Promise<{ completed: boolean }> {
    this.onboardingStatus.set(tenantId, true)
    return { completed: true }
  }

  async saveClinicProfile(
    tenantId: string,
    profile: ClinicProfileInput,
  ): Promise<{ saved: boolean }> {
    void tenantId
    void profile
    return { saved: true }
  }

  async inviteUser(
    tenantId: string,
    user: { name: string; phone: string; role: string },
  ): Promise<{ invited: boolean }> {
    void tenantId
    void user
    return { invited: true }
  }
}
