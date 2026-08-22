import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, ClipboardPlus,
  FlaskConical, LockKeyhole, Pill, ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

const capabilities = [
  { icon: CalendarDays, title: 'Fill more appointment slots', text: 'Smart scheduling, queue visibility, and faster front-desk handoffs keep every visit moving.' },
  { icon: ClipboardPlus, title: 'Give clinicians their time back', text: 'One connected chart for encounters, prescriptions, labs, procedures, and follow-ups.' },
  { icon: BarChart3, title: 'Run the business with clarity', text: 'See revenue, no-shows, utilization, stock, and outstanding payments without spreadsheet hunting.' },
]

const workflows = [
  { icon: UsersRound, label: 'Patient journey', value: 'Registration to follow-up' },
  { icon: Pill, label: 'Pharmacy', value: 'Prescription to dispense' },
  { icon: FlaskConical, label: 'Laboratory', value: 'Order to reviewed result' },
  { icon: ShieldCheck, label: 'Governance', value: 'Roles, audit, and access' },
]

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-surface-800">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <BrandLogo size="md" />
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden px-3 py-2 text-[13px] font-semibold text-surface-600 hover:text-primary-700 sm:block">Sign in</Link>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-healthcare hover:bg-primary-700">
            See the demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-28 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-accent-700">
            <Sparkles className="h-3.5 w-3.5" /> The operating system for modern care
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-surface-900 sm:text-6xl lg:text-7xl">
            Make every patient interaction feel <span className="text-primary-600">effortless.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-surface-600">
            Jioplix brings your hospital front desk, clinical teams, pharmacy, lab, billing, and leadership onto one calm, intelligent workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-[14px] font-bold text-white shadow-healthcare hover:bg-primary-700">
              Explore the live demo <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#why-jioplix" className="inline-flex items-center gap-1 rounded-xl px-4 py-3 text-[14px] font-bold text-surface-600 hover:bg-white">Why Jioplix <ChevronRight className="h-4 w-4" /></a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold text-surface-500">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success-600" /> Setup without disruption</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success-600" /> Permission-first by design</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-accent-100/70 blur-3xl" />
          <div className="relative rounded-[2rem] border border-primary-100 bg-white p-3 shadow-[0_24px_70px_rgba(15,84,198,.16)]">
            <div className="rounded-[1.5rem] bg-surface-900 p-5 text-white sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-accent-300">Hospital command center</p><h2 className="mt-2 text-2xl font-bold">Good morning, Dr. Priya</h2></div><div className="rounded-xl bg-white/10 p-2.5"><ShieldCheck className="h-5 w-5 text-accent-300" /></div></div>
              <div className="grid grid-cols-2 gap-3 py-5"><div className="rounded-xl bg-white/10 p-4"><p className="text-2xl font-bold">94%</p><p className="mt-1 text-[11px] text-white/60">On-time starts</p></div><div className="rounded-xl bg-white/10 p-4"><p className="text-2xl font-bold">₹2.4L</p><p className="mt-1 text-[11px] text-white/60">Collected this week</p></div></div>
              <div className="rounded-xl bg-white p-4 text-surface-800"><div className="flex items-center justify-between"><span className="text-[12px] font-bold">Today&apos;s care flow</span><span className="text-[11px] font-semibold text-success-600">Live</span></div><div className="mt-4 space-y-3">{['Appointments · 38 scheduled', 'Lab results · 12 to review', 'Pharmacy · 7 prescriptions ready'].map((item, i) => <div key={item} className="flex items-center gap-3 text-[12px] font-medium"><span className={`h-2 w-2 rounded-full ${i === 1 ? 'bg-warning-500' : 'bg-accent-500'}`} />{item}<ChevronRight className="ml-auto h-3.5 w-3.5 text-surface-300" /></div>)}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="why-jioplix" className="border-y border-surface-100 bg-white"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">Built for outcomes, not busywork</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">One platform. Fewer handoffs. Better care.</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="border-l-2 border-accent-300 pl-5"><Icon className="h-6 w-6 text-primary-600" /><h3 className="mt-5 text-[16px] font-bold text-surface-900">{title}</h3><p className="mt-2 text-[13px] leading-6 text-surface-500">{text}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-accent-700">Connected by default</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900">Every team sees the next right action.</h2><p className="mt-4 max-w-md text-[14px] leading-7 text-surface-600">From the first call to the final invoice, your teams work from the same patient story and the same source of truth.</p></div><div className="grid gap-3 sm:grid-cols-2">{workflows.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm"><div className="rounded-xl bg-primary-50 p-3"><Icon className="h-5 w-5 text-primary-600" /></div><div><p className="text-[12px] font-bold text-surface-900">{label}</p><p className="mt-1 text-[12px] text-surface-500">{value}</p></div></div>)}</div></div></section>

      <section className="mx-5 mb-8 overflow-hidden rounded-[2rem] bg-primary-700 px-6 py-12 text-white sm:px-12 lg:mx-auto lg:max-w-7xl"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><LockKeyhole className="h-6 w-6 text-accent-300" /><h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight">Give your hospital a system it can grow into.</h2><p className="mt-3 max-w-xl text-[14px] leading-6 text-white/75">Start with the workflows you need today. Add pharmacy, laboratory, procedures, inventory, and intelligent automation as your operation grows.</p></div><Link to="/login" className="inline-flex h-fit items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-bold text-primary-700 hover:bg-primary-50">Open the demo <ArrowRight className="h-4 w-4" /></Link></div></section>
      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 text-[11px] text-surface-400 lg:px-8"><BrandLogo size="sm" /><span>Care operations, thoughtfully connected.</span></footer>
    </main>
  )
}
