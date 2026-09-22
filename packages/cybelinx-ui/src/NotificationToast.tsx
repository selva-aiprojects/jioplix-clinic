import { useEffect } from 'react'

export interface NotificationToastProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  onDismiss: () => void
  autoDismissMs?: number
}

export function NotificationToast({
  type = 'info',
  title,
  message,
  onDismiss,
  autoDismissMs = 4000,
}: NotificationToastProps) {
  useEffect(() => {
    if (autoDismissMs <= 0) return
    const timer = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [onDismiss, autoDismissMs])

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-sky-50 border-sky-200 text-sky-900',
  }

  const dotColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
  }

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm transition-all ${colors[type]}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${dotColors[type]}`} />
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-bold leading-snug">{title}</h4>
        <p className="text-[12px] opacity-90 mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-700 text-[14px] font-bold px-1"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  )
}
