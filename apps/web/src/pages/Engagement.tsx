// TODO: wire to backend engagement API when endpoints are available
import {
  MessageSquare, Send, Bell, CheckCircle2, Clock,
  AlertCircle, Sparkles, MessageCircle, Calendar,
  Eye, ChevronRight,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

const messages = [
  { id: 1, patient: 'Ananya Sharma', avatar: 'AS', color: 'from-primary-400 to-primary-600', type: 'Appointment Reminder', message: 'Hi Ananya, this is a reminder for your appointment tomorrow at 11:00 AM with Dr. Priya. Please arrive 10 minutes early.', status: 'delivered', time: '10:00 AM', channel: 'WhatsApp' },
  { id: 2, patient: 'Rajesh Kumar', avatar: 'RK', color: 'from-accent-400 to-accent-600', type: 'Prescription', message: 'Your prescription from Dr. Priya is ready. Medications: Metformin 500mg, Amlodipine 5mg. Please collect from pharmacy.', status: 'read', time: '09:30 AM', channel: 'WhatsApp' },
  { id: 3, patient: 'Vikram Singh', avatar: 'VS', color: 'from-success-400 to-success-600', type: 'Follow-up', message: 'Hi Vikram, it\'s been 30 days since your last visit. We recommend a follow-up consultation. Would you like to book an appointment?', status: 'sent', time: '09:15 AM', channel: 'WhatsApp' },
  { id: 4, patient: 'Meera Patel', avatar: 'MP', color: 'from-info-400 to-info-600', type: 'Lab Report', message: 'Your lab results are ready. Please review them during your next consultation or download from the patient portal.', status: 'delivered', time: 'Yesterday', channel: 'SMS' },
  { id: 5, patient: 'Suresh Reddy', avatar: 'SR', color: 'from-warning-400 to-warning-600', type: 'Payment Reminder', message: 'Your outstanding balance of ₹1,400 is due. Please make the payment at your convenience. UPI: jio@clinic', status: 'sent', time: 'Yesterday', channel: 'WhatsApp' },
]

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  'delivered': { icon: CheckCircle2, color: 'text-success-500', label: 'Delivered' },
  'read': { icon: Eye, color: 'text-primary-500', label: 'Read' },
  'sent': { icon: Send, color: 'text-surface-400', label: 'Sent' },
  'failed': { icon: AlertCircle, color: 'text-danger-500', label: 'Failed' },
}

const messageTypes = [
  { label: 'Appointment Confirmation', icon: Calendar, color: 'bg-primary-500' },
  { label: 'Appointment Reminder', icon: Bell, color: 'bg-info-500' },
  { label: 'Prescription Delivery', icon: MessageSquare, color: 'bg-success-500' },
  { label: 'Follow-up Reminder', icon: Clock, color: 'bg-warning-500' },
  { label: 'Payment Link', icon: Send, color: 'bg-accent-500' },
  { label: 'Lab Notification', icon: AlertCircle, color: 'bg-danger-500' },
]

const automationRules = [
  { trigger: 'Appointment Booked', action: 'Send confirmation via WhatsApp', status: 'active', color: 'bg-success-500' },
  { trigger: '1 day before appointment', action: 'Send reminder via WhatsApp', status: 'active', color: 'bg-success-500' },
  { trigger: 'Consultation completed', action: 'Send prescription + invoice', status: 'active', color: 'bg-success-500' },
  { trigger: '30 days since last visit', action: 'Send follow-up reminder', status: 'active', color: 'bg-success-500' },
  { trigger: 'Payment overdue 7 days', action: 'Send payment reminder', status: 'paused', color: 'bg-surface-400' },
]

export default function Engagement() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageCircle}
        title="Patient Engagement Hub"
        subtitle="WhatsApp-driven patient communication"
        actions={
          <Button>
            <Send className="w-4 h-4" />
            Send Message
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Messages Sent', value: '142', change: '+18%', icon: Send, tone: 'green' as const },
          { label: 'Delivery Rate', value: '96.5%', change: '+2%', icon: CheckCircle2, tone: 'teal' as const },
          { label: 'Read Rate', value: '82%', change: '+5%', icon: Eye, tone: 'indigo' as const },
          { label: 'Response Rate', value: '45%', change: '+8%', icon: MessageCircle, tone: 'sky' as const },
        ].map(s => (
          <StatCard key={s.label} {...s} up />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Message Types */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
          <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Message Templates</h3>
          <div className="space-y-2">
            {messageTypes.map(m => (
              <button key={m.label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-all text-left group">
                <div className={`w-9 h-9 rounded-xl ${m.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                  <m.icon className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-medium text-surface-700 flex-1">{m.label}</span>
                <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-[15px] font-semibold text-surface-800">Recent Messages</h3>
            <span className="text-[12px] text-primary-600 font-medium cursor-pointer hover:text-primary-700">View All →</span>
          </div>
          <div className="divide-y divide-surface-50">
            {messages.map(msg => {
              const sc = statusConfig[msg.status]
              return (
                <div key={msg.id} className="px-5 py-4 hover:bg-surface-50/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${msg.color} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm`}>
                      {msg.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-surface-800">{msg.patient}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-100 text-[10px] font-medium text-surface-500">{msg.channel}</span>
                        <sc.icon className={`w-3 h-3 ${sc.color} ml-auto flex-shrink-0`} />
                      </div>
                      <p className="text-[12px] font-medium text-surface-600 mb-1">{msg.type}</p>
                      <p className="text-[12px] text-surface-500 line-clamp-2">{msg.message}</p>
                      <p className="text-[11px] text-surface-400 mt-1">{msg.time}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Automation Rules */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <h3 className="text-[14px] font-semibold text-surface-800">Automation Rules</h3>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-[12px] font-medium hover:bg-primary-100 transition-colors">
            + Add Rule
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Trigger</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {automationRules.map((rule, i) => (
                <tr key={i} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                  <td className="px-4 py-3 text-[13px] font-medium text-surface-700">{rule.trigger}</td>
                  <td className="px-4 py-3 text-[13px] text-surface-600">{rule.action}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      rule.status === 'active' ? 'bg-success-50 text-success-600' : 'bg-surface-100 text-surface-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${rule.color}`} />
                      {rule.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
