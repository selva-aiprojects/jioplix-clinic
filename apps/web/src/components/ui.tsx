import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type Tint = 'teal' | 'indigo' | 'sky' | 'green' | 'amber' | 'rose' | 'slate'

const tileGradient: Record<Tint, string> = {
  teal: 'from-primary-400 to-primary-600',
  indigo: 'from-accent-400 to-accent-600',
  sky: 'from-info-400 to-info-600',
  green: 'from-success-400 to-success-600',
  amber: 'from-warning-400 to-warning-600',
  rose: 'from-danger-400 to-danger-600',
  slate: 'from-surface-400 to-surface-600',
}

const statTone: Record<Tint, { light: string; text: string }> = {
  teal: { light: 'bg-primary-50', text: 'text-primary-700' },
  indigo: { light: 'bg-accent-50', text: 'text-accent-700' },
  sky: { light: 'bg-info-50', text: 'text-info-700' },
  green: { light: 'bg-success-50', text: 'text-success-700' },
  amber: { light: 'bg-warning-50', text: 'text-warning-700' },
  rose: { light: 'bg-danger-50', text: 'text-danger-600' },
  slate: { light: 'bg-surface-100', text: 'text-surface-600' },
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-accent-50 text-accent-600 text-[10px] font-bold uppercase tracking-wider border border-accent-100">
      {children}
    </span>
  )
}

interface PageHeaderProps {
  icon?: LucideIcon
  tint?: Tint
  badge?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ icon: Icon, tint = 'teal', badge, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tileGradient[tint]} flex items-center justify-center shadow-healthcare flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-900">{title}</h1>
            {badge && <Badge>{badge}</Badge>}
          </div>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  tone?: Tint
  change?: string
  up?: boolean
}

export function StatCard({ label, value, icon: Icon, tone = 'teal', change, up }: StatCardProps) {
  const t = statTone[tone]
  return (
    <div className="bg-white rounded-2xl p-4 border border-surface-100 shadow-healthcare">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${t.light} flex items-center justify-center`}>
          {Icon && <Icon className={`w-4.5 h-4.5 ${t.text}`} />}
        </div>
        {change && (
          <span className={`text-[11px] font-semibold ${up ? 'text-success-600' : 'text-danger-500'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-surface-900">{value}</p>
      <p className="text-[12px] text-surface-500 mt-0.5">{label}</p>
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-healthcare',
    secondary: 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-4 py-2 text-[13px]',
  }
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />
}
