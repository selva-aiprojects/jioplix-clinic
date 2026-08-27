import { useEffect, useState } from 'react'
import {
  AlertCircle, CheckCircle2, Headphones, Loader2,
  MessageSquare, Plus, Send, X,
} from 'lucide-react'
import { api } from '../lib/api'

interface Ticket {
  id: string; subject: string; category: string; priority: string;
  status: string; created_at: string; updated_at: string;
}
interface TicketResponse {
  id: string; responder_type: string; responder_name: string; message: string; created_at: string;
}

const CATEGORIES = [
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'onboarding', label: 'Onboarding Help' },
  { value: 'general', label: 'General' },
]
const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-surface-500 bg-surface-100' },
  { value: 'normal', label: 'Normal', color: 'text-primary-600 bg-primary-50' },
  { value: 'high', label: 'High', color: 'text-danger-600 bg-danger-50' },
]
const STATUS_COLORS: Record<string, string> = {
  open: 'text-warning-700 bg-warning-50 border-warning-200',
  'in-progress': 'text-info-700 bg-info-50 border-info-200',
  resolved: 'text-success-700 bg-success-50 border-success-200',
  closed: 'text-surface-500 bg-surface-100 border-surface-200',
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [responses, setResponses] = useState<TicketResponse[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // New ticket form
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  // Reply
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    setLoading(true)
    try {
      const data = await api<Ticket[]>('/support/tickets')
      setTickets(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSubmitErr(null)
    try {
      await api('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, category, priority, message }),
      })
      setSubmitOk(true)
      setTimeout(() => { setShowNew(false); setSubmitOk(false); loadTickets() }, 1500)
    } catch {
      setSubmitErr('Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function openTicket(ticketId: string) {
    setSelectedTicket(ticketId)
    setLoadingDetail(true)
    try {
      const data = await api(`/support/tickets/${ticketId}`)
      setResponses(data.responses ?? [])
    } catch { /* ignore */ }
    setLoadingDetail(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTicket || sendingReply || !reply.trim()) return
    setSendingReply(true)
    try {
      await api(`/support/tickets/${selectedTicket}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim() }),
      })
      setReply('')
      openTicket(selectedTicket)
    } catch { /* ignore */ }
    setSendingReply(false)
  }

  const selected = tickets.find(t => t.id === selectedTicket)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <Headphones className="w-6 h-6 text-primary-600" /> Support
          </h1>
          <p className="text-[13px] text-surface-500 mt-1">Get help from our team. Create a ticket or reply to an existing one.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold px-4 py-2.5 shadow-healthcare transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New ticket
        </button>
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-surface-900">Create support ticket</h3>
              <button onClick={() => setShowNew(false)} className="p-1 text-surface-400 hover:text-surface-600"><X className="w-5 h-5" /></button>
            </div>
            {submitOk ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-success-600 mx-auto mb-3" />
                <p className="text-[13px] text-surface-600">Ticket created! Our team will respond shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Subject</label>
                  <input
                    value={subject} onChange={e => setSubject(e.target.value)} required
                    placeholder="Brief description of your issue"
                    className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all">
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Message</label>
                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)} required rows={4}
                    placeholder="Describe your issue in detail..."
                    className="w-full px-3.5 py-2.5 text-[13px] font-medium bg-surface-50/50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 resize-none"
                  />
                </div>
                {submitErr && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-50 border border-danger-200">
                    <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                    <p className="text-[12px] text-danger-700">{submitErr}</p>
                  </div>
                )}
                <button type="submit" disabled={submitting || !subject.trim() || !message.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-semibold py-2.5 shadow-healthcare transition-all disabled:opacity-50 cursor-pointer">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Creating...' : 'Create ticket'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Ticket List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className={`${selectedTicket ? 'hidden lg:block lg:col-span-2' : 'col-span-full lg:col-span-2'} space-y-2`}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-surface-200">
              <Headphones className="w-8 h-8 text-surface-300 mx-auto mb-3" />
              <p className="text-[13px] text-surface-500">No tickets yet. Create one to get help.</p>
            </div>
          ) : (
            tickets.map(t => (
              <button key={t.id} onClick={() => openTicket(t.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTicket === t.id ? 'border-primary-300 bg-primary-50/50 shadow-sm' : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm'
                }`}>
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-[13px] font-semibold text-surface-900 truncate">{t.subject}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[t.status] ?? STATUS_COLORS.open}`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-surface-400 capitalize">{t.category.replace('_', ' ')}</span>
                  <span className="text-surface-300">·</span>
                  <span className="text-[11px] text-surface-400">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className={`${selectedTicket ? 'col-span-full lg:col-span-3' : 'hidden lg:block lg:col-span-3'}`}>
          {selectedTicket && selected ? (
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="p-5 border-b border-surface-100">
                <button onClick={() => setSelectedTicket(null)} className="lg:hidden text-[12px] text-primary-600 mb-2 cursor-pointer">
                  ← Back to tickets
                </button>
                <h3 className="text-lg font-bold text-surface-900">{selected.subject}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                  <span className="text-[11px] text-surface-400 capitalize">{selected.category.replace('_', ' ')}</span>
                  <span className="text-[11px] text-surface-400 capitalize">Priority: {selected.priority}</span>
                </div>
              </div>

              <div className="p-5 max-h-96 overflow-y-auto space-y-4">
                {loadingDetail ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
                ) : responses.length === 0 ? (
                  <p className="text-[12px] text-surface-400 text-center py-6">No responses yet.</p>
                ) : (
                  responses.map(r => (
                    <div key={r.id} className={`rounded-xl p-4 ${r.responder_type === 'platform' ? 'bg-primary-50/60 border border-primary-100' : 'bg-surface-50 border border-surface-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
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
