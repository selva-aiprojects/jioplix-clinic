import { useEffect, useState } from 'react'
import { X, Bell, Trash2, CheckCheck } from 'lucide-react'
import {
  getNotifications, markAllRead, markRead, categoryStyles,
} from '../lib/notifications'
import type { AppNotification } from '../lib/notifications'

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'clinical', label: 'Clinical' },
  { key: 'billing', label: 'Billing' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'system', label: 'System' },
]

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (open) setItems(getNotifications())
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleOpen(n: AppNotification) {
    markRead(n.id)
    setItems(getNotifications())
    if (n.href) {
      onClose()
      window.location.assign(n.href)
    }
  }

  const shown = filter === 'all' ? items : items.filter(i => i.category === filter)
  const unread = items.filter(i => !i.read).length

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-surface-900/20" onClick={onClose} />}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(390px,100vw)] flex-col bg-white shadow-healthcare-lg transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-surface-800">Notifications</h2>
              <p className="text-[11px] text-surface-400">{unread} unread</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                onClick={() => { markAllRead(); setItems(getNotifications()) }}
                className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-primary-600 hover:bg-primary-50 transition-colors inline-flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600" aria-label="Close notifications">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-surface-100 px-4 py-2.5 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${filter === f.key ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-surface-400">
              <Bell className="mb-3 h-8 w-8 text-surface-300" />
              <p className="text-[13px] font-medium text-surface-600">You’re all caught up</p>
              <p className="mt-1 text-[12px]">No {filter !== 'all' ? filter : ''} notifications right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map(n => {
                const cs = categoryStyles[n.category]
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpen(n)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${n.read ? 'border-surface-100 bg-white' : 'border-primary-100 bg-primary-50/40 hover:bg-primary-50'}`}
                  >
                    <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${cs.dot}`} />
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-surface-800">{n.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-surface-500">{n.body}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cs.bg} ${cs.text}`}>{cs.label}</span>
                        <span className="text-[11px] text-surface-400">{n.time}</span>
                      </div>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-surface-100 px-4 py-3 text-center">
          <p className="text-[11px] text-surface-400 inline-flex items-center gap-1.5"><Trash2 className="h-3 w-3" /> Notifications are stored on this device</p>
        </div>
      </aside>
    </>
  )
}
