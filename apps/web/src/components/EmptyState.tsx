import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  illustration?: boolean
}

export default function EmptyState({ icon: Icon, title, description, action, illustration = true }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 bg-surface-50/50 px-6 py-12 text-center">
      {illustration && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 text-primary-500 shadow-healthcare">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-surface-800">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-surface-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
