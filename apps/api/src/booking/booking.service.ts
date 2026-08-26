import { Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service.js'

export interface BookingLink {
  clinicSlug: string
  url: string
}

export interface BookingConfig {
  allowedDays: string[]
  timeSlots: string[]
  maxPatientsPerDay: number
  advanceBookingDays: number
}

export interface AvailableSlot {
  time: string
  available: boolean
}

export interface BookingReservation {
  id: string
  clinicSlug: string
  patientName: string
  phone: string
  date: string
  timeSlot: string
  status: string
}

@Injectable()
export class BookingService {
  constructor(private readonly db: DbService) {}

  async getBookingLink(schemaName: string): Promise<BookingLink> {
    // TODO: Store and retrieve from DB
    const slug = `clinic-${schemaName.replace('tenant_', '')}`
    return {
      clinicSlug: slug,
      url: `https://jioplix.app/book/${slug}`,
    }
  }

  async getConfig(_schemaName: string): Promise<BookingConfig> {
    // TODO: Store and retrieve from DB
    return {
      allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      timeSlots: [
        '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
        '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
        '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
      ],
      maxPatientsPerDay: 20,
      advanceBookingDays: 7,
    }
  }

  async saveConfig(_schemaName: string, _config: Partial<BookingConfig>): Promise<{ success: boolean }> {
    // TODO: Persist to DB
    return { success: true }
  }

  async getAvailableSlots(_schemaName: string, _date: string): Promise<AvailableSlot[]> {
    // TODO: Check existing bookings against config to determine availability
    const config = await this.getConfig(_schemaName)
    return config.timeSlots.map(time => ({ time, available: true }))
  }

  async reserveSlot(
    _schemaName: string,
    input: { clinicSlug: string; patientName: string; phone: string; date: string; timeSlot: string },
  ): Promise<BookingReservation> {
    // TODO: Validate slot availability, create booking record
    return {
      id: crypto.randomUUID(),
      clinicSlug: input.clinicSlug,
      patientName: input.patientName,
      phone: input.phone,
      date: input.date,
      timeSlot: input.timeSlot,
      status: 'pending',
    }
  }
}
