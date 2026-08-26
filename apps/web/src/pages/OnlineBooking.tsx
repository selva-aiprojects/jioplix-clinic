import { useState } from 'react'
import {
  Link2, Copy, CheckCircle2, QrCode,
  MessageCircle, Mail, Phone, Settings, Clock,
  CalendarDays, ChevronDown,
} from 'lucide-react'
import { PageHeader, StatCard, Button } from '../components/ui'

// TODO: Replace with real API calls
const MOCK_BOOKING_URL = 'https://jioplix.app/book/clinic-jio-01'

const MOCK_RECENT_BOOKINGS = [
  { id: '1', patientName: 'Riya Sharma', phone: '+91 98765 43210', date: '2026-08-25', timeSlot: '10:00 AM', status: 'confirmed' as const },
  { id: '2', patientName: 'Amit Patel', phone: '+91 87654 32109', date: '2026-08-25', timeSlot: '11:30 AM', status: 'pending' as const },
  { id: '3', patientName: 'Neha Gupta', phone: '+91 76543 21098', date: '2026-08-26', timeSlot: '02:00 PM', status: 'confirmed' as const },
  { id: '4', patientName: 'Vikram Singh', phone: '+91 65432 10987', date: '2026-08-26', timeSlot: '04:30 PM', status: 'cancelled' as const },
  { id: '5', patientName: 'Priya Nair', phone: '+91 54321 09876', date: '2026-08-27', timeSlot: '09:00 AM', status: 'pending' as const },
]

const ALL_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
]

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const statusStyles: Record<string, string> = {
  confirmed: 'bg-success-50 border-success-200 text-success-700',
  pending: 'bg-warning-50 border-warning-200 text-warning-700',
  cancelled: 'bg-danger-50 border-danger-200 text-danger-600',
}

export default function OnlineBooking() {
  const [copied, setCopied] = useState(false)
  const [allowedDays, setAllowedDays] = useState<Record<string, boolean>>({
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false,
  })
  const [maxPatients, setMaxPatients] = useState(20)
  const [advanceDays, setAdvanceDays] = useState(7)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    ALL_SLOTS.forEach(s => { map[s] = true })
    return map
  })
  const [saved, setSaved] = useState(false)

  const stats = {
    total: MOCK_RECENT_BOOKINGS.length,
    confirmed: MOCK_RECENT_BOOKINGS.filter(b => b.status === 'confirmed').length,
    pending: MOCK_RECENT_BOOKINGS.filter(b => b.status === 'pending').length,
    cancelled: MOCK_RECENT_BOOKINGS.filter(b => b.status === 'cancelled').length,
  }

  function copyUrl() {
    navigator.clipboard.writeText(MOCK_BOOKING_URL).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleDay(key: string) {
    setAllowedDays(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function toggleSlot(slot: string) {
    setSelectedSlots(prev => ({ ...prev, [slot]: !prev[slot] }))
    setSaved(false)
  }

  function saveConfig() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Link2}
        tint="indigo"
        title="Online Booking"
        subtitle="Generate and manage your clinic's public booking link"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Bookings" value={stats.total} icon={CalendarDays} tone="slate" />
        <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} tone="green" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="amber" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={CalendarDays} tone="rose" />
      </div>

      {/* Booking Link & Share */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info-400 to-info-600 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-surface-800">Generate Booking Link</h3>
            <p className="text-[12px] text-surface-400">Share this link with patients to book appointments online</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-[13px] font-mono text-surface-600 truncate">
            {MOCK_BOOKING_URL}
          </div>
          <Button onClick={copyUrl} variant="secondary">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-5">
          {/* QR Code placeholder */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-40 h-40 rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 flex flex-col items-center justify-center gap-2">
              <QrCode className="w-12 h-12 text-surface-300" />
              <span className="text-[11px] text-surface-400 font-medium">QR Code</span>
            </div>
            <span className="text-[11px] text-surface-400">Scan to open booking page</span>
          </div>

          {/* Share buttons */}
          <div className="flex-1 space-y-3">
            <p className="text-[12px] font-semibold text-surface-600">Share via</p>
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-2.5 text-[13px] font-medium text-success-700 hover:bg-success-100 transition-colors">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button className="flex items-center gap-2 rounded-xl border border-info-200 bg-info-50 px-4 py-2.5 text-[13px] font-medium text-info-700 hover:bg-info-100 transition-colors">
                <Phone className="w-4 h-4" />
                SMS
              </button>
              <button className="flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-2.5 text-[13px] font-medium text-accent-700 hover:bg-accent-100 transition-colors">
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Configuration */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-surface-800">Booking Configuration</h3>
            <p className="text-[12px] text-surface-400">Configure available slots and booking rules</p>
          </div>
        </div>

        {/* Allowed Days */}
        <div>
          <p className="text-[12px] font-medium text-surface-600 mb-2">Allowed Days</p>
          <div className="flex gap-2">
            {DAYS.map(d => (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                className={`w-11 h-11 rounded-xl text-[12px] font-semibold transition-all border ${
                  allowedDays[d.key]
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-surface-50 border-surface-200 text-surface-400 hover:bg-surface-100'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max Patients & Advance Booking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-surface-600">Max Patients Per Day</span>
            <input
              type="number"
              min={1}
              max={200}
              value={maxPatients}
              onChange={e => { setMaxPatients(Number(e.target.value)); setSaved(false) }}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-surface-600">Advance Booking Limit</span>
            <div className="relative">
              <select
                value={advanceDays}
                onChange={e => { setAdvanceDays(Number(e.target.value)); setSaved(false) }}
                className="w-full appearance-none rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 pr-8 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            </div>
          </label>
        </div>

        {/* Available Time Slots */}
        <div>
          <p className="text-[12px] font-medium text-surface-600 mb-2">Available Time Slots (30-min intervals)</p>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {ALL_SLOTS.map(slot => (
              <button
                key={slot}
                onClick={() => toggleSlot(slot)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${
                  selectedSlots[slot]
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-surface-50 border-surface-200 text-surface-400 hover:bg-surface-100'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-success-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Configuration saved
            </span>
          )}
          <Button onClick={saveConfig} className="ml-auto">
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="text-[15px] font-semibold text-surface-800">Recent Online Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Patient Name</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Time Slot</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_BOOKINGS.map(b => (
                <tr key={b.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50 transition-colors">
                  <td className="px-6 py-3 text-[13px] font-semibold text-surface-800">{b.patientName}</td>
                  <td className="px-6 py-3 text-[13px] text-surface-600">{b.phone}</td>
                  <td className="px-6 py-3 text-[13px] text-surface-600">{b.date}</td>
                  <td className="px-6 py-3 text-[13px] text-surface-600">{b.timeSlot}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusStyles[b.status]}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
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
