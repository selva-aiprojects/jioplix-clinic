import { Injectable } from '@nestjs/common'

export interface Campaign {
  id: string
  name: string
  type: 'whatsapp' | 'sms' | 'email'
  status: 'draft' | 'active' | 'completed' | 'paused'
  recipients: number
  sent: number
  delivered: number
  read: number
  lastSent: string | null
  audience: string
  template?: string
  createdAt: string
}

export interface CampaignTemplate {
  id: string
  name: string
  category: string
  content: string
  channel: string
}

@Injectable()
export class EngagementService {
  private readonly campaigns: Campaign[] = [
    { id: '1', name: 'Welcome New Patients', type: 'whatsapp', status: 'active', recipients: 234, sent: 234, delivered: 228, read: 185, lastSent: '2026-08-24', audience: 'all', createdAt: '2026-08-01' },
    { id: '2', name: 'Monthly Health Checkup', type: 'sms', status: 'active', recipients: 1200, sent: 1200, delivered: 1156, read: 890, lastSent: '2026-08-20', audience: 'inactive', createdAt: '2026-07-15' },
    { id: '3', name: 'Diabetes Follow-up Series', type: 'whatsapp', status: 'completed', recipients: 89, sent: 89, delivered: 87, read: 72, lastSent: '2026-08-15', audience: 'followup', createdAt: '2026-07-20' },
    { id: '4', name: 'Winter Flu Vaccination', type: 'email', status: 'draft', recipients: 0, sent: 0, delivered: 0, read: 0, lastSent: null, audience: 'all', createdAt: '2026-08-22' },
    { id: '5', name: 'Appointment Slot Reminder', type: 'whatsapp', status: 'paused', recipients: 45, sent: 40, delivered: 38, read: 30, lastSent: '2026-08-10', audience: 'appointment', createdAt: '2026-08-05' },
  ]

  private readonly templates: CampaignTemplate[] = [
    { id: 't1', name: 'Appointment Confirmation', category: 'Appointments', content: 'Dear {patient_name}, your appointment with Dr. {doctor_name} is confirmed for {date} at {time}. Please arrive 10 minutes early.', channel: 'whatsapp' },
    { id: 't2', name: 'Prescription Delivery', category: 'Prescriptions', content: 'Hi {patient_name}, your prescription from Dr. {doctor_name} is ready. Medications: {medications}. Please collect from the pharmacy.', channel: 'whatsapp' },
    { id: 't3', name: 'Follow-up Reminder', category: 'Follow-up', content: 'Hi {patient_name}, it has been {days} days since your last visit. We recommend a follow-up consultation.', channel: 'whatsapp' },
    { id: 't4', name: 'Payment Reminder', category: 'Billing', content: 'Dear {patient_name}, your outstanding balance of ₹{amount} is due. Please make the payment at your convenience.', channel: 'sms' },
    { id: 't5', name: 'Health Checkup Reminder', category: 'Preventive', content: 'Dear {patient_name}, it is time for your annual health checkup. Regular checkups help detect issues early. Schedule yours today!', channel: 'email' },
  ]

  async listCampaigns(_schemaName: string): Promise<Campaign[]> {
    return this.campaigns
  }

  async createCampaign(_schemaName: string, data: Partial<Campaign>): Promise<Campaign> {
    const campaign: Campaign = {
      id: String(this.campaigns.length + 1),
      name: data.name ?? 'Untitled Campaign',
      type: data.type ?? 'whatsapp',
      status: 'draft',
      recipients: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      lastSent: null,
      audience: data.audience ?? 'all',
      template: data.template,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    this.campaigns.push(campaign)
    return campaign
  }

  async updateCampaignStatus(_schemaName: string, id: string, status: Campaign['status']): Promise<Campaign | null> {
    const campaign = this.campaigns.find(c => c.id === id)
    if (!campaign) return null
    campaign.status = status
    return campaign
  }

  async listTemplates(_schemaName: string): Promise<CampaignTemplate[]> {
    return this.templates
  }
}
