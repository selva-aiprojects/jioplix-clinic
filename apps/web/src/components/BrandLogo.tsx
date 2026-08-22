import { useAuth } from '../auth/useAuth'
import { clinicTypeLabel } from '@jioplix/contracts'

export interface BrandLogoProps {
  collapsed?: boolean
  subtitle?: string
  showClinicType?: boolean
  showBadge?: boolean
  variant?: 'default' | 'on-dark' | 'card' | 'pure'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
}

export default function BrandLogo({
  collapsed = false,
  subtitle,
  showClinicType = true,
  showBadge = true,
  variant = 'default',
  size = 'md',
  className = '',
}: BrandLogoProps) {
  const { user } = useAuth()
  const clinicType = user ? clinicTypeLabel(user.clinic.clinicType) : null

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`} title="Jioplix">
        <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 shadow-sm flex items-center justify-center p-2.5 transition-all hover:scale-105 hover:border-primary-300 hover:shadow-healthcare">
          <img src="/favicon.png" alt="Jioplix" className="w-full h-full object-contain" />
        </div>
      </div>
    )
  }

  // Pure logo only without any attached text or container
  if (variant === 'pure') {
    const pureHeight =
      size === '3xl'
        ? 'h-24 sm:h-28'
        : size === '2xl'
        ? 'h-18 sm:h-22'
        : size === 'xl'
        ? 'h-14 sm:h-16'
        : size === 'lg'
        ? 'h-10'
        : size === 'sm'
        ? 'h-6'
        : 'h-8'

    return (
      <div className={`flex items-center ${className}`}>
        <img src="/logo.png" alt="Jioplix" className={`${pureHeight} w-auto object-contain`} />
      </div>
    )
  }

  if (variant === 'on-dark') {
    // 3x larger size for hero presentation
    const logoHeight =
      size === '3xl'
        ? 'h-20 sm:h-24 md:h-28'
        : size === '2xl'
        ? 'h-16 sm:h-20'
        : size === 'xl'
        ? 'h-12 sm:h-14'
        : size === 'lg'
        ? 'h-10'
        : 'h-8'

    return (
      <div className={`flex items-center ${className}`}>
        <div className="px-7 py-4 sm:px-9 sm:py-5 rounded-3xl bg-white shadow-2xl flex items-center justify-center border border-white/50 transition-transform hover:scale-[1.02]">
          <img src="/logo.png" alt="Jioplix" className={`${logoHeight} w-auto object-contain`} />
        </div>
      </div>
    )
  }

  // default / light variant
  const imgHeight =
    size === '3xl'
      ? 'h-20 sm:h-24'
      : size === '2xl'
      ? 'h-16 sm:h-18'
      : size === 'xl'
      ? 'h-12'
      : size === 'lg'
      ? 'h-10'
      : size === 'sm'
      ? 'h-6'
      : 'h-8'

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="Jioplix" className={`${imgHeight} w-auto object-contain shrink-0`} />
      </div>
      {showBadge && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary-50 text-[10px] font-bold text-primary-700 tracking-wider uppercase border border-primary-200/60 shadow-xs">
            Clinic OS
          </span>
          {showClinicType && clinicType && (
            <span className="text-[11px] font-semibold text-surface-600 truncate">
              · {clinicType}
            </span>
          )}
          {subtitle && !clinicType && (
            <span className="text-[11px] font-medium text-surface-500 truncate">
              · {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
