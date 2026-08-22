import { useMemo, useState } from 'react'
import { Check, MailPlus, MoreHorizontal, Search, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { PageHeader, Button } from '../components/ui'

interface TeamUser { name: string; email: string; role: string; department: string; status: 'Active' | 'Invited'; lastActive: string; initials: string; color: string }

const initialUsers: TeamUser[] = [
  { name: 'Dr. Priya Sharma', email: 'priya@nova.clinic', role: 'Doctor', department: 'General Medicine', status: 'Active', lastActive: 'Now', initials: 'PS', color: 'bg-primary-100 text-primary-700' },
  { name: 'Ramesh Gupta', email: 'ramesh@nova.clinic', role: 'Receptionist', department: 'Front Desk', status: 'Active', lastActive: '4 min ago', initials: 'RG', color: 'bg-accent-100 text-accent-700' },
  { name: 'Sunita Rao', email: 'sunita@nova.clinic', role: 'Pharmacist', department: 'Pharmacy', status: 'Active', lastActive: '18 min ago', initials: 'SR', color: 'bg-info-100 text-info-700' },
  { name: 'Vijay Kumar', email: 'vijay@nova.clinic', role: 'Lab Technician', department: 'Laboratory', status: 'Active', lastActive: '1 hr ago', initials: 'VK', color: 'bg-danger-100 text-danger-700' },
  { name: 'Meera Iyer', email: 'meera@nova.clinic', role: 'Nurse', department: 'Outpatient Care', status: 'Invited', lastActive: 'Pending invite', initials: 'MI', color: 'bg-warning-100 text-warning-700' },
]

const roles = ['All roles', 'Doctor', 'Receptionist', 'Nurse', 'Pharmacist', 'Lab Technician']

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('All roles')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Doctor')

  const filtered = useMemo(() => users.filter(user => {
    const query = search.toLowerCase()
    return (role === 'All roles' || user.role === role) && `${user.name} ${user.email} ${user.department}`.toLowerCase().includes(query)
  }), [users, search, role])

  function inviteUser() {
    if (!inviteName.trim() || !inviteEmail.trim()) return
    const initials = inviteName.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
    setUsers(prev => [...prev, { name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole, department: 'New team member', status: 'Invited', lastActive: 'Pending invite', initials, color: 'bg-surface-100 text-surface-700' }])
    setInviteName(''); setInviteEmail(''); setShowInvite(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={UserCog} title="User Management" subtitle="Control who can access each part of your hospital workspace" actions={<Button onClick={() => setShowInvite(true)}><MailPlus className="h-4 w-4" /> Invite team member</Button>} />

      <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-healthcare"><UsersRound className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-surface-900">{users.length}</p><p className="text-[12px] text-surface-500">Team members</p></div><div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-healthcare"><ShieldCheck className="h-5 w-5 text-success-600" /><p className="mt-3 text-2xl font-bold text-surface-900">5</p><p className="text-[12px] text-surface-500">Permission roles</p></div><div className="rounded-2xl border border-surface-100 bg-white p-4 shadow-healthcare"><Check className="h-5 w-5 text-accent-600" /><p className="mt-3 text-2xl font-bold text-surface-900">{users.filter(user => user.status === 'Active').length}</p><p className="text-[12px] text-surface-500">Active today</p></div></div>

      <section className="overflow-hidden rounded-2xl border border-surface-100 bg-white shadow-healthcare"><div className="flex flex-col gap-3 border-b border-surface-100 p-4 md:flex-row md:items-center md:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people or departments" className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20" /></div><select value={role} onChange={event => setRole(event.target.value)} className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-600 outline-none">{roles.map(item => <option key={item}>{item}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-surface-50 text-[11px] uppercase tracking-wider text-surface-400"><tr><th className="px-5 py-3 font-semibold">Team member</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Department</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Last active</th><th /></tr></thead><tbody className="divide-y divide-surface-100">{filtered.map(user => <tr key={user.email} className="hover:bg-surface-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold ${user.color}`}>{user.initials}</span><div><p className="text-[13px] font-semibold text-surface-800">{user.name}</p><p className="text-[11px] text-surface-400">{user.email}</p></div></div></td><td className="px-5 py-4 text-[12px] font-medium text-surface-700">{user.role}</td><td className="px-5 py-4 text-[12px] text-surface-500">{user.department}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${user.status === 'Active' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{user.status}</span></td><td className="px-5 py-4 text-[12px] text-surface-500">{user.lastActive}</td><td className="px-5 py-4 text-right"><button className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700" aria-label={`More options for ${user.name}`}><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-10 text-center text-[13px] text-surface-400">No team members match your filters.</p>}</div></section>

      {showInvite && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInvite(false)}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-healthcare-lg" onClick={event => event.stopPropagation()}><h2 className="text-lg font-bold text-surface-900">Invite team member</h2><p className="mt-1 text-[12px] text-surface-500">They will receive secure access to your hospital workspace.</p><div className="mt-5 space-y-3"><input value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Full name" className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none focus:border-primary-400" /><input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="Work email" className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none focus:border-primary-400" /><select value={inviteRole} onChange={event => setInviteRole(event.target.value)} className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] outline-none">{roles.slice(1).map(item => <option key={item}>{item}</option>)}</select></div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button><Button onClick={inviteUser}><MailPlus className="h-4 w-4" /> Send invite</Button></div></div></div>}
    </div>
  )
}
