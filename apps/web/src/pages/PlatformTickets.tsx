import { useEffect, useState } from 'react'
import {
  AlertCircle, CheckCircle2, ChevronDown, Clock, Headphones, Loader2,
  MessageSquare, Send, Tag, X, RefreshCw,
} from 'lucide-react'
import { platformApi } from '../lib/api'

interface Ticket {
  id: string; tenant_id: string; tenantName: string; subject: string;
  category: string; priority: string; status: string;
  created_at: string; updated_at: string;
}
interface TicketDetail extends Ticket {
  responses: Array<{
    id: string; responder_type: string; responder_name: string; message: string; created_at: string;
  }>;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]
const STATUS_COLORS: Record<string, string> = {
  open: 'text-warning-700 bg-warning-50 border-warning-200',
  'in-progress': 'text-info-700 bg-info-50 border-info-200',
  resolved: 'text-success-700 bg-success-50 border-success-200',
  closed: 'text-surface-500 bg-surface-100 border-surface-200',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-surface-500 bg-surface-100',
  normal: 'text-primary-600 bg-primary-50',
  high: 'text-danger-600 bg-danger-50',
}

export default function PlatformTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, closed: 0 })

  useEffect(() => { loadTickets(); loadStats() }, [statusFilter])

  async function loadTickets() {
    setLoading(true)
    try {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const data = await platformApi(`/support/platform/tickets${q}`)
      setTickets(data as Ticket[])
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function loadStats() {
    try {
      const data = await platformApi('/support/platform/stats')
      setStats(data as any)
    } catch { /* ignore */ }
  }

  async function openTicket(ticketId: string) {
    setSelectedId(ticketId)
    setLoadingDetail(true)
    try {
      const data = await platformApi(`/support/platform/tickets/${ticketId}`) as TicketDetail
      setDetail(data)
    } catch { /* ignore */ }
    setLoadingDetail(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || sendingReply || !reply.trim()) return
    setSendingReply(true)
    try {
      await platformApi(`/support/platform/tickets/${selectedId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim(), responderName: 'Support Team' }),
      })
      setReply('')
      openTicket(selectedId)
    } catch { /* ignore */ }
    setSendingReply(false)
  }

  async function changeStatus(ticketId: string, status: string) {
    try {
      await platformApi(`/support/platform/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      loadTickets()
      if (selectedId === ticketId) openTicket(ticketId)
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <Headphones className="w-6 h-6 text-primary-600" /> Support Tickets
          </h1>
          <p className="text-[13px] text-surface-500 mt-1">Manage and respond to tenant support requests.</p>
        </div>
        <button onClick={() => { loadTickets(); loadStats() }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-600 text-[12px] font-semibold px-3 py-2 transition-all cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open', value: stats.open, color: 'text-warning-600 bg-warning-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-info-600 bg-info-50' },
          { label: 'Resolved', value: stats.resolved, color: 'text-success-600 bg-success-50' },
          { label: 'Closed', value: stats.closed, color: 'text-surface-500 bg-surface-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setStatusFilter(o.value)}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === o.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Ticket List */}
        <div className={`${selectedId ? 'hidden lg:block lg:col-span-2' : 'col-span-full lg:col-span-2'} space-y-2`}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-surface-200">
              <Headphones className="w-8 h-8 text-surface-300 mx-auto mb-3" />
              <p className="text-[13px] text-surface-500">No tickets found.</p>
            </div>
          ) : (
            tickets.map(t => (
              <button key={t.id} onClick={() => openTicket(t.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedId === t.id ? 'border-primary-300 bg-primary-50/50 shadow-sm' : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm'
                }`}>
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-[13px] font-semibold text-surface-900 truncate">{t.subject}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[t.status] ?? STATUS_COLORS.open}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[11px] text-surface-500 mt-1">{t.tenantName}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal}`}>
                    {t.priority}
                  </span>
                  <span className="text-[11px] text-surface-400 capitalize">{t.category.replace('_', ' ')}</span>
                  <span className="text-[11px] text-surface-400">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className={`${selectedId ? 'col-span-full lg:col-span-3' : 'hidden lg:block lg:col-span-3'}`}>
          {selectedId && detail ? (
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="p-5 border-b border-surface-100">
                <button onClick={() => setSelectedId(null)} className="lg:hidden text-[12px] text-primary-600 mb-2 cursor-pointer">
                  ← Back to tickets
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-surface-900">{detail.subject}</h3>
                    <p className="text-[12px] text-surface-500 mt-1">Tenant: {detail.tenantName}</p>
                  </div>
                  <select
                    value={detail.status}
                    onChange={e => changeStatus(detail.id, e.target.value)}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
                    {STATUS_OPTIONS.filter(o => o.value !== 'all').map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[detail.status]}`}>{detail.status}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[detail.priority]}`}>{detail.priority}</span>
                  <span className="text-[11px] text-surface-400 capitalize">{detail.category.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="p-5 max-h-96 overflow-y-auto space-y-4">
                {loadingDetail ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
                ) : detail.responses?.length === 0 ? (
                  <p className="text-[12px] text-surface-400 text-center py-6">No responses yet.</p>
                ) : (
                  detail.responses?.map(r => (
                    <div key={r.id} className={`rounded-xl p-4 ${r.responder_type === 'platform' ? 'bg-primary-50/60 border border-primary-100 ml-4' : 'bg-surface-50 border border-surface-200 mr-4'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.responder_type === 'platform' ? 'bg-primary-100 text-primary-700' : 'bg-surface-200 text-surface-600'}`}>
                          {r.responder_type === 'platform' ? 'Support' : 'Tenant'}
                        </span>
                        <span className="text-[11px] font-bold text-surface-700">{r.responder_name}</span>
                        <span className="text-[10px] text-surface-400">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[13px] text-surface-700 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-surface-100">
                <form onSubmit={handleReply} className="flex gap-2">
                  <input
                    value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..."
                    className="flex-1 px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                  <button type="submit" disabled={sendingReply || !reply.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold px-4 py-2.5 shadow-healthcare transition-all disabled:opacity-50 cursor-pointer">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center h-64 bg-white rounded-2xl border border-surface-200 border-dashed">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-[13px] text-surface-400">Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
