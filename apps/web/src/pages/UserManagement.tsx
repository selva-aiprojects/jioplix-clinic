import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, MailPlus, Search, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { PageHeader, Button } from '../components/ui'
import { listTeam } from '../lib/api'
import { useAuth } from '../auth/useAuth'

interface TeamRow {
  key: string
  name: string
  email: string
  roles: string[]
  department: string
  status: 'Active' | 'Invited'
  initials: string
  color: string
}

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-accent-100 text-accent-700',
  'bg-info-100 text-info-700',
  'bg-danger-100 text-danger-700',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
]

function avatarColorFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

const roles = ['All roles', 'Doctor', 'Receptionist', 'Nurse', 'Pharmacist', 'Lab Technician']

const roleOf = (userRoles: string[]) => userRoles[0] ?? 'Staff'

export default function UserManagement() {
  const { hasPermission } = useAuth()
  const canManageUsers = hasPermission('users:read')

  const [rows, setRows] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('All roles')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Doctor')

  useEffect(() => {
    let cancelled = false
    listTeam()
      .then(team => {
        if (cancelled) return
        setRows(team.map(t => ({
          key: t.id,
          name: t.fullName,
          email: t.email ?? t.phone,
          roles: t.roles,
          department: t.specialty ?? '—',
          status: t.status === 'active' ? 'Active' : 'Invited',
          initials: initialsOf(t.fullName),
          color: avatarColorFor(t.fullName),
        })))
        setLoadError(null)
      })
      .catch(() => { if (!cancelled) setLoadError('Unable to load your team.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return rows.filter(row =>
      (role === 'All roles' || row.roles.includes(role) || roleOf(row.roles) === role)
      && `${row.name} ${row.email} ${row.department}`.toLowerCase().includes(query),
    )
  }, [rows, search, role])

  const activeCount = rows.filter(r => r.status === 'Active').length

  function inviteUser() {
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setRows(prev => [{
      key: `invite-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      roles: [inviteRole],
      department: '—',
      status: 'Invited',
      initials: initialsOf(inviteName.trim()),
      color: avatarColorFor(inviteName.trim()),
    }, ...prev])
    setInviteName(''); setInviteEmail(''); setShowInvite(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={UserCog} title="User Management" subtitle="Control who can access each part of your hospital workspace" actions={canManageUsers ? <Button onClick={() => setShowInvite(true)}><MailPlus className="h-4 w-4" /> Invite team member</Button> : undefined} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-healthcare">
          <UsersRound className="h-5 w-5 text-primary-600" />
          <p className="mt-3 text-2xl font-bold text-surface-900">{rows.length}</p>
          <p className="text-[12px] text-surface-500">Team members</p>
        </div>
        <div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-healthcare">
          <ShieldCheck className="h-5 w-5 text-success-600" />
          <p className="mt-3 text-2xl font-bold text-surface-900">{new Set(rows.flatMap(r => r.roles)).size || rows.length}</p>
          <p className="text-[12px] text-surface-500">Permission roles</p>
        </div>
        <div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-healthcare">
          <Check className="h-5 w-5 text-accent-600" />
          <p className="mt-3 text-2xl font-bold text-surface-900">{activeCount}</p>
          <p className="text-[12px] text-surface-500">Active</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-100 bg-white shadow-healthcare">
        <div className="flex flex-col gap-3 border-b border-surface-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search people or departments"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select value={role} onChange={event => setRole(event.target.value)} className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-600 outline-none">
            {roles.map(item => <option key={item}>{item}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-surface-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your team…
          </div>
        ) : loadError || rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px] font-medium text-surface-700">{loadError ?? 'No team members yet'}</p>
            <p className="mx-auto mt-1 max-w-md text-[12px] text-surface-400">
              {canManageUsers
                ? 'Your team will appear here as members are invited and activated in your clinic.'
                : 'Only members of your clinic who are granted access appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-surface-50 text-[11px] uppercase tracking-wider text-surface-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Team member</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] text-surface-400">No matching team members.</td></tr>
                ) : filtered.map(user => (
                  <tr key={user.key} className="hover:bg-surface-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold ${user.color}`}>{user.initials}</span>
                        <div>
                          <p className="text-[13px] font-semibold text-surface-800">{user.name}</p>
                          <p className="text-[11px] text-surface-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[12px] font-medium text-surface-700">{user.roles.join(', ')}</td>
                    <td className="px-5 py-4 text-[12px] text-surface-500">{user.department}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-semibold ${user.status === 'Active' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-healthcare-lg" onClick={event => event.stopPropagation()}>
            <h2 className="text-lg font-bold text-surface-900">Invite team member</h2>
            <p className="mt-1 text-[12px] text-surface-500">They will receive secure access to your hospital workspace.</p>
            <div className="mt-5 space-y-3">
              <input value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Full name" className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none focus:border-primary-400" />
              <input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="Work email" className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none focus:border-primary-400" />
              <select value={inviteRole} onChange={event => setInviteRole(event.target.value)} className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none">
                {roles.slice(1).map(item => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={inviteUser}><MailPlus className="h-4 w-4" /> Send invite</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
