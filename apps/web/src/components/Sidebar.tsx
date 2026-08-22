import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Pill,
  FlaskConical,
  Warehouse,
  Bandage,
  Puzzle,
  UserCog,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import BrandLogo from './BrandLogo'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
}

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
  color: string
  addon?: boolean
  permission?: string
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-primary-600' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-danger-500' },
    ],
  },
  {
    title: 'Patient Journey',
    items: [
      { to: '/patients', icon: Users, label: 'Patients', color: 'text-accent-600' },
      { to: '/appointments', icon: Calendar, label: 'Appointments', color: 'text-info-600' },
      { to: '/consultation', icon: Stethoscope, label: 'Consultation', color: 'text-success-600' },
      { to: '/billing', icon: CreditCard, label: 'Billing', color: 'text-warning-600' },
      { to: '/engagement', icon: MessageSquare, label: 'Engagement', color: 'text-primary-500' },
    ],
  },
  {
    title: 'Add-ons',
    items: [
      { to: '/pharmacy', icon: Pill, label: 'Pharmacy', color: 'text-info-600', addon: true },
      { to: '/laboratory', icon: FlaskConical, label: 'Laboratory', color: 'text-danger-500', addon: true },
      { to: '/inventory', icon: Warehouse, label: 'Inventory', color: 'text-accent-600', addon: true },
      { to: '/procedures', icon: Bandage, label: 'Procedures', color: 'text-success-600', addon: true },
      { to: '/addons', icon: Puzzle, label: 'Plans & Add-ons', color: 'text-primary-600' },
      { to: '/users', icon: UserCog, label: 'User Management', color: 'text-primary-600' },
    ],
  },
]

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { hasPermission } = useAuth()

  const renderNav = (isMobile = false) =>
    navGroups
      .map((group) => ({
        group,
        items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
      }))
      .filter(({ items }) => items.length > 0)
      .map(({ group, items }) => (
        <div key={group.title} className={collapsed && !isMobile ? 'pt-4 border-t border-surface-100 first:pt-0 first:border-0' : ''}>
          {!collapsed && (
            <p className={`px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest ${isMobile ? 'first:pt-1' : 'first:pt-1'} text-surface-400`}>
              {group.title}
            </p>
          )}
          {collapsed && !isMobile && group.title === 'Add-ons' && <div className="my-3 border-t border-surface-200" />}
          <div className="space-y-1">
            {items.map((item) => {
              const isActive =
                item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={isMobile ? onMobileClose : undefined}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={`group flex items-center gap-3 rounded-xl transition-all duration-200 ${
                    collapsed && !isMobile ? 'justify-center px-2 py-3' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm font-semibold'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? item.color : 'text-surface-400 group-hover:text-surface-600'}`} />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className={`text-[13px] flex-1 ${isActive ? 'font-semibold text-primary-800' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      {item.addon ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-accent-50 text-accent-600 text-[9px] font-bold uppercase tracking-wider border border-accent-100/80">
                          Add-on
                        </span>
                      ) : (
                        isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-screen flex-col bg-white border-r border-surface-200 z-40 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className={`flex items-center h-16 border-b border-surface-100 shrink-0 bg-white/50 backdrop-blur-sm ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          <BrandLogo collapsed={collapsed} size="md" />
        </div>

        <nav className={`flex-1 py-3 px-3 overflow-y-auto scrollbar-thin ${collapsed ? 'space-y-0' : ''}`}>
          {renderNav()}
        </nav>

        {!collapsed && (
          <div className="mx-3 mb-3 p-3 rounded-xl gradient-healthcare-soft border border-primary-200/50 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-primary-800">AI Copilot</span>
            </div>
            <p className="text-[11px] text-primary-700/80 leading-relaxed">
              18 patients due for follow-up this week
            </p>
          </div>
        )}

        <button
          onClick={onToggle}
          className="hidden md:flex items-center justify-center h-12 border-t border-surface-100 text-surface-400 hover:text-surface-600 hover:bg-surface-50 transition-colors shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-screen flex flex-col bg-white border-r border-surface-200 z-50 transition-transform duration-300 w-[270px] shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-100 shrink-0 bg-white">
          <BrandLogo size="md" />
          <button onClick={onMobileClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors" aria-label="Close navigation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">{renderNav(true)}</nav>
      </aside>
    </>
  )
}
