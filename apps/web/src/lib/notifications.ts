export type NotificationCategory = 'clinical' | 'billing' | 'system' | 'engagement'

export interface AppNotification {
  id: string
  category: NotificationCategory
  title: string
  body: string
  time: string
  read: boolean
  href?: string
}

const STORAGE_KEY = 'jioplix.notifications.v1'

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('jioplix:notifications-changed'))
}

const SEED: AppNotification[] = [
  { id: 'n1', category: 'clinical', title: 'Follow-up due', body: 'Meera Patel is due for a follow-up consultation this week.', time: '2h ago', read: false, href: '/patients' },
  { id: 'n2', category: 'billing', title: 'Payment received', body: '₹800 received from Rajesh Kumar via UPI.', time: '3h ago', read: false, href: '/billing' },
  { id: 'n3', category: 'engagement', title: 'WhatsApp reminder sent', body: 'Appointment reminder delivered to Ananya Sharma.', time: '5h ago', read: true, href: '/engagement' },
  { id: 'n4', category: 'system', title: 'Backup completed', body: 'Nightly clinic data backup finished successfully.', time: 'Yesterday', read: true },
]

export function getNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED))
      return SEED
    }
    const parsed = JSON.parse(raw) as AppNotification[]
    return Array.isArray(parsed) ? parsed : SEED
  } catch {
    return SEED
  }
}

export function unreadCount(): number {
  return getNotifications().filter(n => !n.read).length
}

export function markAllRead(): void {
  const items = getNotifications().map(n => ({ ...n, read: true }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  emit()
}

export function markRead(id: string): void {
  const items = getNotifications().map(n => (n.id === id ? { ...n, read: true } : n))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  emit()
}

export function pushNotification(n: Omit<AppNotification, 'id' | 'read'>): void {
  const items = getNotifications()
  const next: AppNotification = { ...n, id: `n-${Date.now()}`, read: false }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...items].slice(0, 50)))
  emit()
}

export const categoryStyles: Record<NotificationCategory, { dot: string; bg: string; text: string; label: string }> = {
  clinical: { dot: 'bg-primary-500', bg: 'bg-primary-50', text: 'text-primary-700', label: 'Clinical' },
  billing: { dot: 'bg-success-500', bg: 'bg-success-50', text: 'text-success-700', label: 'Billing' },
  engagement: { dot: 'bg-accent-500', bg: 'bg-accent-50', text: 'text-accent-700', label: 'Engagement' },
  system: { dot: 'bg-surface-400', bg: 'bg-surface-100', text: 'text-surface-600', label: 'System' },
}
