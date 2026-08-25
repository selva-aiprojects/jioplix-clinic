import { Menu, Search, Bell, ChevronDown, Sparkles, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { clinicTypeLabel } from '@jioplix/contracts'
import { useAuth } from '../auth/useAuth'
import { unreadCount } from '../lib/notifications'

interface TopBarProps {
  onMenuToggle: () => void
  onBellClick: () => void
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export default function TopBar({ onMenuToggle, onBellClick }: TopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellUnread, setBellUnread] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    setBellUnread(unreadCount())
    const onChanged = () => setBellUnread(unreadCount())
    window.addEventListener('jioplix:notifications-changed', onChanged)
    return () => window.removeEventListener('jioplix:notifications-changed', onChanged)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-xl border-b border-surface-200/80 flex items-center px-4 md:px-6 gap-3 md:gap-4 transition-all">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-xl hover:bg-surface-100 text-surface-600 transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Global Clinical Search */}
      <div className={`relative flex-1 max-w-md transition-all duration-200 ${searchFocused ? 'max-w-lg' : ''}`}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search patients, UHID, appointments, prescriptions..."
          className="w-full pl-10 pr-12 py-2 text-[13px] font-medium bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400 shadow-xs"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold text-surface-500 bg-surface-100 border border-surface-200 rounded shadow-xs">
          ⌘K
        </kbd>
      </div>

      {/* Center Clinic Status Indicator (Desktop) */}
      {user && (
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-50 border border-surface-200 text-surface-600 text-xs">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          <span className="font-semibold text-surface-800">{user.clinic.name}</span>
          <span className="text-surface-400">·</span>
          <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
            {clinicTypeLabel(user.clinic.clinicType)}
          </span>
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* AI Clinical Assistant */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('jioplix:open-assistant'))}
          className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary-50 via-primary-100/60 to-accent-50 border border-primary-200/70 text-primary-800 hover:from-primary-100 hover:to-accent-100 transition-all text-[12px] font-semibold shadow-xs cursor-pointer"
          title="Clinical AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary-600" />
          <span>AI Copilot</span>
        </button>

        {/* Notifications */}
        <button
          onClick={onBellClick}
          className="relative p-2.5 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors"
          aria-label={`Notifications${bellUnread ? `, ${bellUnread} unread` : ''}`}
        >
          <Bell className="w-4.5 h-4.5" />
          {bellUnread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {bellUnread > 9 ? '9+' : bellUnread}
            </span>
          )}
        </button>

        {/* User profile menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-xl hover:bg-surface-100/80 transition-colors border border-transparent hover:border-surface-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-[12px] font-bold shadow-healthcare">
              {user ? initialsOf(user.fullName) : '··'}
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-[13px] font-bold text-surface-800 leading-tight">
                {user?.fullName ?? '…'}
              </span>
              <span className="text-[11px] font-medium text-surface-400 leading-tight">
                {user?.specialty ?? user?.roles[0]}
              </span>
            </div>
            <ChevronDown
              className={`hidden md:block w-4 h-4 text-surface-400 transition-transform ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-surface-200 shadow-healthcare-lg overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-4 py-3.5 bg-surface-50/70 border-b border-surface-100">
                <p className="text-[13px] font-bold text-surface-900">{user?.fullName}</p>
                <p className="text-[11px] text-surface-500 mt-0.5">{user?.phone}</p>
                {user && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 border border-primary-200/70 text-[10px] font-bold uppercase tracking-wider text-primary-700">
                      <ShieldCheck className="w-3 h-3 text-primary-600" />
                      {clinicTypeLabel(user.clinic.clinicType)}
                    </span>
                    <span className="text-[10px] font-medium text-surface-400 bg-surface-200/60 px-1.5 py-0.5 rounded">
                      {user.roles.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 border-b border-surface-100">
                <p className="text-[12px] font-semibold text-surface-800">{user?.clinic.name}</p>
                <p className="text-[11px] text-surface-400 font-mono mt-0.5">ID: {user?.clinic.slug}</p>
              </div>

              <div className="p-1.5">
                <button
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-surface-400" />
                  Clinic Settings & Profile
                </button>
                <button
                  role="menuitem"
                  onClick={async () => {
                    setMenuOpen(false)
                    await logout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
