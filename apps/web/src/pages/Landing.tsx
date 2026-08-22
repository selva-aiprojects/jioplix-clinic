import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, ClipboardPlus,
  FlaskConical, LockKeyhole, Pill, ShieldCheck, Sparkles, UsersRound, ReceiptText,
  Baby, ScanFace, Fingerprint, HeartHandshake, Stethoscope,
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

const careModules = [
  { icon: ReceiptText, name: 'e-Prescriptions', accent: 'bg-primary-50 text-primary-600', text: 'Create signed prescriptions from the encounter, keep every medication legible, and give patients a clear next step.' },
  { icon: Pill, name: 'Pharmacy operations', accent: 'bg-info-50 text-info-600', text: 'Move from prescription queue to dispense with stock visibility, pharmacist actions, and a complete audit trail.' },
  { icon: FlaskConical, name: 'Laboratory workflows', accent: 'bg-danger-50 text-danger-600', text: 'Track lab orders, sample progress, results, and clinical review without chasing paper or messages.' },
]

const plans = [
  { name: 'Starter', price: '₹999', fit: 'For focused practices', features: ['Patient records', 'Appointments & queue', 'Clinical EMR', 'Billing & payments'] },
  { name: 'Professional', price: '₹1,999', fit: 'For growing care teams', features: ['Everything in Starter', 'Pharmacy + laboratory', 'Inventory workflows', 'Advanced team access'], featured: true },
  { name: 'Clinic', price: '₹3,999', fit: 'For multi-team operations', features: ['Everything in Professional', 'Procedures & room tracking', 'Expanded staff workflows', 'Multi-branch ready'] },
]

const specialties = [
  { icon: Stethoscope, name: 'General Practice', text: 'Flexible consultations, chronic care, prescriptions, and follow-ups for everyday clinical volume.', tone: 'bg-primary-50 text-primary-600' },
  { icon: Baby, name: 'Pediatrics', text: 'Keep vaccination schedules, growth conversations, and family communication close to the patient story.', tone: 'bg-accent-50 text-accent-600' },
  { icon: ScanFace, name: 'Dental', text: 'Give teams a focused workflow for treatment planning, procedures, and repeat visits.', tone: 'bg-info-50 text-info-600' },
  { icon: Fingerprint, name: 'Dermatology', text: 'Organize image-led consultations, lesion tracking, treatment notes, and review timelines.', tone: 'bg-danger-50 text-danger-600' },
  { icon: HeartHandshake, name: 'Gynecology', text: 'Support sensitive, longitudinal care with structured history, follow-ups, and privacy-aware access.', tone: 'bg-warning-50 text-warning-600' },
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

      <section className="border-y border-surface-100 bg-white"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">One clinical thread</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">From consultation to care completion.</h2><p className="mt-4 text-[14px] leading-7 text-surface-600">The details that matter do not disappear between departments. Jioplix keeps the prescription, pharmacy, and laboratory loop visible to the right people.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{careModules.map(({ icon: Icon, name, accent, text }, index) => <article key={name} className="relative rounded-2xl border border-surface-200 bg-surface-50 p-5"><span className="absolute right-5 top-5 text-[11px] font-bold text-surface-300">0{index + 1}</span><div className={`inline-flex rounded-xl p-3 ${accent}`}><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-[16px] font-bold text-surface-900">{name}</h3><p className="mt-2 text-[13px] leading-6 text-surface-500">{text}</p></article>)}</div></div></section>

      <section id="plans" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-accent-700">Plans that scale with care</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Start lean. Add capability when you need it.</h2></div><p className="max-w-xs text-[12px] leading-5 text-surface-500">Every plan includes secure core workflows. Choose the operating depth your team needs today.</p></div><div className="mt-10 grid gap-4 lg:grid-cols-3">{plans.map(plan => <article key={plan.name} className={`relative rounded-2xl border p-6 ${plan.featured ? 'border-primary-400 bg-primary-700 text-white shadow-[0_20px_50px_rgba(15,84,198,.2)]' : 'border-surface-200 bg-white'}`}>{plan.featured && <span className="absolute right-5 top-5 rounded-full bg-accent-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-surface-900">Most chosen</span>}<p className={`text-[12px] font-bold uppercase tracking-wider ${plan.featured ? 'text-accent-200' : 'text-primary-600'}`}>{plan.name}</p><p className={`mt-1 text-[12px] ${plan.featured ? 'text-white/70' : 'text-surface-500'}`}>{plan.fit}</p><p className="mt-6 text-4xl font-bold">{plan.price}<span className={`text-[12px] font-medium ${plan.featured ? 'text-white/60' : 'text-surface-400'}`}> / month</span></p><div className={`my-6 border-t ${plan.featured ? 'border-white/15' : 'border-surface-100'}`} />{plan.features.map(feature => <p key={feature} className={`mb-3 flex items-center gap-2 text-[12px] ${plan.featured ? 'text-white/85' : 'text-surface-600'}`}><Check className={`h-4 w-4 ${plan.featured ? 'text-accent-300' : 'text-success-600'}`} />{feature}</p>)}<Link to="/login" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold ${plan.featured ? 'bg-white text-primary-700 hover:bg-primary-50' : 'bg-surface-900 text-white hover:bg-primary-700'}`}>See this in the demo <ArrowRight className="h-4 w-4" /></Link></article>)}</div></section>

      <section className="border-y border-surface-100 bg-surface-50"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">Built around your specialty</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">One platform. A more personal clinical fit.</h2><p className="mt-4 max-w-md text-[14px] leading-7 text-surface-600">Your specialty should shape the workflow, not force your team into a generic template. Start with a shared foundation and make the care experience feel like your own.</p><Link to="/login" className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-primary-700 hover:text-primary-800">Explore specialty workflows <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-3 sm:grid-cols-2">{specialties.map(({ icon: Icon, name, text, tone }) => <article key={name} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div><h3 className="mt-4 text-[15px] font-bold text-surface-900">{name}</h3><p className="mt-2 text-[12px] leading-5 text-surface-500">{text}</p></article>)}</div></div></div></section>

      <section className="mx-5 mb-8 overflow-hidden rounded-[2rem] bg-primary-700 px-6 py-12 text-white sm:px-12 lg:mx-auto lg:max-w-7xl"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><LockKeyhole className="h-6 w-6 text-accent-300" /><h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight">Give your hospital a system it can grow into.</h2><p className="mt-3 max-w-xl text-[14px] leading-6 text-white/75">Start with the workflows you need today. Add pharmacy, laboratory, procedures, inventory, and intelligent automation as your operation grows.</p></div><Link to="/login" className="inline-flex h-fit items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-bold text-primary-700 hover:bg-primary-50">Open the demo <ArrowRight className="h-4 w-4" /></Link></div></section>
      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 text-[11px] text-surface-400 lg:px-8"><BrandLogo size="sm" /><span>Care operations, thoughtfully connected.</span></footer>
    </main>
  )
}
