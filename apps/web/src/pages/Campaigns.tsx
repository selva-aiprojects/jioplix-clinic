// TODO: wire to backend engagement API when endpoints are available
import { useState } from 'react'
import {
  Send, CheckCircle2, Eye,
  MessageSquare, Bell, Plus,
  ChevronRight, Power, Zap, FileText,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

type CampaignType = 'whatsapp' | 'sms' | 'email'
type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused'
type Audience = 'all' | 'appointment' | 'followup' | 'inactive'

interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  recipients: number
  sent: number
  delivered: number
  read: number
  lastSent: string | null
  template?: string
  audience: Audience
}

interface MessageTemplate {
  id: string
  name: string
  category: string
  content: string
  channel: CampaignType
}

interface AutomationRule {
  id: string
  trigger: string
  action: string
  channel: CampaignType
  active: boolean
}

const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Welcome New Patients', type: 'whatsapp', status: 'active', recipients: 234, sent: 234, delivered: 228, read: 185, lastSent: '2026-08-24', audience: 'all' },
  { id: '2', name: 'Monthly Health Checkup', type: 'sms', status: 'active', recipients: 1200, sent: 1200, delivered: 1156, read: 890, lastSent: '2026-08-20', audience: 'inactive' },
  { id: '3', name: 'Diabetes Follow-up Series', type: 'whatsapp', status: 'completed', recipients: 89, sent: 89, delivered: 87, read: 72, lastSent: '2026-08-15', audience: 'followup' },
  { id: '4', name: 'Winter Flu Vaccination', type: 'email', status: 'draft', recipients: 0, sent: 0, delivered: 0, read: 0, lastSent: null, audience: 'all' },
  { id: '5', name: 'Appointment Slot Reminder', type: 'whatsapp', status: 'paused', recipients: 45, sent: 40, delivered: 38, read: 30, lastSent: '2026-08-10', audience: 'appointment' },
  { id: '6', name: 'Prescription Refill Alert', type: 'sms', status: 'active', recipients: 567, sent: 567, delivered: 540, read: 412, lastSent: '2026-08-24', audience: 'followup' },
]

const mockTemplates: MessageTemplate[] = [
  { id: 't1', name: 'Appointment Confirmation', category: 'Appointments', content: 'Dear {patient_name}, your appointment with Dr. {doctor_name} is confirmed for {date} at {time}. Please arrive 10 minutes early.', channel: 'whatsapp' },
  { id: 't2', name: 'Prescription Delivery', category: 'Prescriptions', content: 'Hi {patient_name}, your prescription from Dr. {doctor_name} is ready. Medications: {medications}. Please collect from the pharmacy or click {link} for delivery.', channel: 'whatsapp' },
  { id: 't3', name: 'Follow-up Reminder', category: 'Follow-up', content: 'Hi {patient_name}, it\'s been {days} days since your last visit. We recommend a follow-up consultation. Book now: {booking_link}', channel: 'whatsapp' },
  { id: 't4', name: 'Payment Reminder', category: 'Billing', content: 'Dear {patient_name}, your outstanding balance of ₹{amount} is due. Please make the payment at your convenience. UPI: {upi_id}', channel: 'sms' },
  { id: 't5', name: 'Health Checkup Reminder', category: 'Preventive', content: 'Dear {patient_name}, it\'s time for your annual health checkup. Regular checkups help detect issues early. Schedule yours today!', channel: 'email' },
]

const mockAutomationRules: AutomationRule[] = [
  { id: 'a1', trigger: 'Appointment Booked', action: 'Send confirmation via WhatsApp', channel: 'whatsapp', active: true },
  { id: 'a2', trigger: '1 Day Before Appointment', action: 'Send reminder via WhatsApp', channel: 'whatsapp', active: true },
  { id: 'a3', trigger: 'Consultation Complete', action: 'Send prescription + invoice', channel: 'whatsapp', active: true },
  { id: 'a4', trigger: '30 Days Since Last Visit', action: 'Send follow-up reminder', channel: 'sms', active: true },
]

const statusConfig: Record<CampaignStatus, { label: string; color: string; dot: string }> = {
  draft: { label: 'Draft', color: 'bg-surface-100 text-surface-500', dot: 'bg-surface-400' },
  active: { label: 'Active', color: 'bg-success-50 text-success-600', dot: 'bg-success-500' },
  completed: { label: 'Completed', color: 'bg-primary-50 text-primary-600', dot: 'bg-primary-500' },
  paused: { label: 'Paused', color: 'bg-warning-50 text-warning-600', dot: 'bg-warning-500' },
}

const typeConfig: Record<CampaignType, { label: string; icon: typeof Send; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-success-600' },
  sms: { label: 'SMS', icon: Send, color: 'text-info-600' },
  email: { label: 'Email', icon: Bell, color: 'text-primary-600' },
}

export default function Campaigns() {
  const [campaigns] = useState<Campaign[]>(mockCampaigns)
  const [templates] = useState<MessageTemplate[]>(mockTemplates)
  const [rules, setRules] = useState<AutomationRule[]>(mockAutomationRules)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: '', type: 'whatsapp' as CampaignType, template: '', audience: 'all' as Audience })

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0)
  const totalDelivered = campaigns.reduce((s, c) => s + c.delivered, 0)
  const totalRead = campaigns.reduce((s, c) => s + c.read, 0)
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0'
  const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0'

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Send}
        title="Campaigns"
        subtitle="Patient Engagement"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={String(campaigns.length)} icon={FileText} tone="teal" />
        <StatCard label="Messages Sent" value={totalSent.toLocaleString()} icon={Send} tone="green" />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} icon={CheckCircle2} tone="indigo" />
        <StatCard label="Read Rate" value={`${readRate}%`} icon={Eye} tone="sky" />
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-[14px] font-semibold text-surface-800">Campaign List</h3>
          <span className="text-[12px] text-surface-400">{campaigns.length} campaigns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Recipients</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Sent</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Last Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const tc = typeConfig[c.type]
                const sc = statusConfig[c.status]
                const TypeIcon = tc.icon
                return (
                  <tr key={c.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <span className="text-[13px] font-semibold text-surface-800">{c.name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${tc.color}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        {tc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-surface-600">{c.recipients.toLocaleString()}</td>
                    <td className="px-5 py-3 text-[13px] text-surface-600">{c.sent.toLocaleString()}</td>
                    <td className="px-5 py-3 text-[12px] text-surface-400">{c.lastSent ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary-600" />
            <h3 className="text-[14px] font-semibold text-surface-800">Template Library</h3>
          </div>
          <div className="space-y-2">
            {templates.map(t => {
              const tc = typeConfig[t.channel]
              const TypeIcon = tc.icon
              return (
                <button key={t.id} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-all text-left group">
                  <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-surface-700 block truncate">{t.name}</span>
                    <span className="text-[11px] text-surface-400">{t.category} · {tc.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-600" />
              <h3 className="text-[14px] font-semibold text-surface-800">Automation Rules</h3>
            </div>
          </div>
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50/50 border border-surface-100">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Power className={`w-4 h-4 ${rule.active ? 'text-success-500' : 'text-surface-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-surface-700">{rule.trigger}</p>
                  <p className="text-[12px] text-surface-500">{rule.action}</p>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    rule.active ? 'bg-success-500' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      rule.active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-surface-100 shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[16px] font-bold text-surface-800">Create Campaign</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-surface-600 text-[18px]">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-600 mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 text-[13px] text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  placeholder="e.g. Monthly Health Reminder"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-600 mb-1.5">Channel</label>
                <div className="flex gap-2">
                  {(['whatsapp', 'sms', 'email'] as CampaignType[]).map(t => {
                    const tc = typeConfig[t]
                    const TypeIcon = tc.icon
                    return (
                      <button
                        key={t}
                        onClick={() => setNewCampaign(p => ({ ...p, type: t }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${
                          newCampaign.type === t
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-surface-200 text-surface-500 hover:bg-surface-50'
                        }`}
                      >
                        <TypeIcon className="w-3.5 h-3.5" />
                        {tc.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-600 mb-1.5">Message Template</label>
                <textarea
                  value={newCampaign.template}
                  onChange={e => setNewCampaign(p => ({ ...p, template: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 text-[13px] text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
                  placeholder="Hi {patient_name}, this is a reminder..."
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-surface-600 mb-1.5">Target Audience</label>
                <select
                  value={newCampaign.audience}
                  onChange={e => setNewCampaign(p => ({ ...p, audience: e.target.value as Audience }))}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 text-[13px] text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 bg-white"
                >
                  <option value="all">All Patients</option>
                  <option value="appointment">With Appointment</option>
                  <option value="followup">Follow-up Due</option>
                  <option value="inactive">No Visit 90 Days</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={() => { setShowCreateModal(false) }}>Create Campaign</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
