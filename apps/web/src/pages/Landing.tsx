import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, ClipboardPlus,
  FlaskConical, LockKeyhole, Pill, ShieldCheck, Sparkles, UsersRound, ReceiptText,
  Baby, ScanFace, Fingerprint, HeartHandshake, Stethoscope, Boxes, FileSpreadsheet,
  Video, Globe2, Wifi, FileText, CalendarClock, BrainCircuit,
  Shield, Link2, Send, Clock, Smartphone,
} from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import { RAZORPAY_PAYMENT_LINK } from '../lib/api'

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

const aiWorkflowPoints = [
  'Workflow guidance for appointments, patients, prescriptions, Pharmacy, Laboratory, and User Management',
  'Clinician-led e-prescriptions with structured dosage, frequency, duration, issue, and print steps',
  'A foundation ready for AI-generated summaries and prescription suggestions with human approval',
]

const inventoryHighlights = [
  { icon: FileSpreadsheet, title: 'Import and reconcile', text: 'Bring in Excel-compatible stock counts, review quantity differences, and apply tracked adjustments only after approval.' },
  { icon: Boxes, title: 'Expiry-aware inventory', text: 'See clean Valid, Expiring Soon, and Expired badges across medicine, reagent, consumable, and supply batches.' },
  { icon: ReceiptText, title: 'Documents when teams need them', text: 'Print stock invoice copies and delivery challans for receiving, handoff, audit, and supplier reconciliation.' },
]

const newFeatures = [
  {
    icon: BrainCircuit,
    title: 'AI Scribe with OpenAI',
    description: 'Real-time consultation summaries powered by GPT. Generate structured SOAP notes, prescription drafts, and patient insights with one click.',
    color: 'from-primary-500 to-accent-500',
    badge: 'New in v1.2',
  },
  {
    icon: Video,
    title: 'Teleconsultation',
    description: 'Video consultations with session recording, patient history access, and integrated billing — all from the same clinical workspace.',
    color: 'from-success-500 to-info-500',
    badge: 'New in v1.2',
  },
  {
    icon: Globe2,
    title: 'ABDM / ABHA Integration',
    description: 'Link patient ABHA numbers, fetch health records via FHIR R4, manage consent, and push clinical data to India\'s national health stack.',
    color: 'from-info-500 to-primary-500',
    badge: 'New in v1.2',
  },
  {
    icon: Send,
    title: 'Campaign Builder',
    description: 'Design and automate patient engagement campaigns — appointment reminders, health tips, follow-up nudges — via WhatsApp and SMS.',
    color: 'from-accent-500 to-success-500',
    badge: 'New in v1.2',
  },
  {
    icon: Link2,
    title: 'Online Booking',
    description: 'Share a branded booking link or QR code. Patients self-schedule appointments that appear instantly in your queue.',
    color: 'from-warning-500 to-danger-500',
    badge: 'New in v1.2',
  },
  {
    icon: FileText,
    title: 'PDF Export',
    description: 'Download patient health summaries, GST-compliant invoices, and formatted prescriptions as clean, shareable PDFs.',
    color: 'from-danger-500 to-warning-500',
    badge: 'New in v1.3',
  },
  {
    icon: Smartphone,
    title: 'Progressive Web App',
    description: 'Install Jioplix on any device. Service workers cache static assets for lightning-fast loads and offline access to critical data.',
    color: 'from-primary-600 to-info-500',
    badge: 'New in v1.3',
  },
  {
    icon: Globe2,
    title: '14 Indian Languages',
    description: 'Full UI localization via react-i18next — Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati, Malayalam, Odia, Punjabi, Assamese, Urdu, Nepali, and English.',
    color: 'from-accent-600 to-primary-500',
    badge: 'New in v1.3',
  },
]

const dashboardHighlights = [
  { icon: CalendarClock, title: 'Date range filtering', text: 'Filter dashboard metrics by Today, 7 days, 30 days, 90 days, or a custom range to spot trends at a glance.' },
  { icon: BarChart3, title: 'Revenue trend charts', text: 'Interactive area charts showing daily revenue and patient visits over time — with period selectors for quick analysis.' },
  { icon: Clock, title: 'Real-time queue', text: 'See waiting patients, in-progress consultations, and completed visits updated live across all departments.' },
]

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-surface-800">
      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <BrandLogo variant="pure" size="3xl" className="origin-left scale-[1.35] sm:scale-100" />
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden px-3 py-2 text-[13px] font-semibold text-surface-600 hover:text-primary-700 sm:block">Sign in</Link>
          <Link to="/register" className="hidden px-3 py-2 text-[13px] font-semibold text-surface-600 hover:text-primary-700 sm:block">Register clinic</Link>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-healthcare hover:bg-primary-700">
            See the demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
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
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-[14px] font-bold text-white shadow-healthcare hover:bg-primary-700">
              Register your clinic <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#new-features" className="inline-flex items-center gap-1 rounded-xl px-4 py-3 text-[14px] font-bold text-surface-600 hover:bg-white">What&apos;s new <ChevronRight className="h-4 w-4" /></a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold text-surface-500">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success-600" /> Setup without disruption</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success-600" /> Permission-first by design</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success-600" /> 14 Indian languages</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-accent-100/70 blur-3xl" />
          <div className="relative rounded-[2rem] border border-primary-100 bg-white p-3 shadow-[0_24px_70px_rgba(15,84,198,.16)]">
            <div className="rounded-[1.5rem] bg-surface-900 p-5 text-white sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-accent-300">Hospital command center</p>
                  <h2 className="mt-2 text-2xl font-bold">Good morning, Doctor</h2>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5"><ShieldCheck className="h-5 w-5 text-accent-300" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5">
                <div className="rounded-xl bg-white/10 p-4"><p className="text-2xl font-bold">94%</p><p className="mt-1 text-[11px] text-white/60">On-time starts</p></div>
                <div className="rounded-xl bg-white/10 p-4"><p className="text-2xl font-bold">₹2.4L</p><p className="mt-1 text-[11px] text-white/60">Collected this week</p></div>
              </div>
              <div className="rounded-xl bg-white p-4 text-surface-800">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold">Today&apos;s care flow</span>
                  <span className="text-[11px] font-semibold text-success-600">Live</span>
                </div>
                <div className="mt-4 space-y-3">
                  {['Appointments · 38 scheduled', 'Lab results · 12 to review', 'Pharmacy · 7 prescriptions ready'].map((item, i) => (
                    <div key={item} className="flex items-center gap-3 text-[12px] font-medium">
                      <span className={`h-2 w-2 rounded-full ${i === 1 ? 'bg-warning-500' : 'bg-accent-500'}`} />
                      {item}
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-surface-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── What's New — Feature Grid ───────────────────────────────────── */}
      <section id="new-features" className="border-y border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-accent-700">
                <Sparkles className="h-3.5 w-3.5" /> What&apos;s new
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                Intelligence, engagement, and compliance — built in.
              </h2>
            </div>
            <p className="max-w-xs text-[12px] leading-5 text-surface-500">
              Every feature below ships with the platform. No bolt-ons, no separate vendors, no integration tax.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newFeatures.map(({ icon: Icon, title, description, color, badge }) => (
              <article key={title} className="group relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-50 p-5 transition-all hover:border-primary-200 hover:shadow-lg">
                <span className="absolute right-4 top-4 rounded-full bg-accent-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-700">
                  {badge}
                </span>
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${color} p-3 shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-surface-900">{title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-surface-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Jioplix ─────────────────────────────────────────────────── */}
      <section id="why-jioplix" className="border-y border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">Built for outcomes, not busywork</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">One platform. Fewer handoffs. Better care.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <article key={title} className="border-l-2 border-accent-300 pl-5">
                <Icon className="h-6 w-6 text-primary-600" />
                <h3 className="mt-5 text-[16px] font-bold text-surface-900">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-surface-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Connected by Default ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-accent-700">Connected by default</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900">Every team sees the next right action.</h2>
            <p className="mt-4 max-w-md text-[14px] leading-7 text-surface-600">From the first call to the final invoice, your teams work from the same patient story and the same source of truth.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workflows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                <div className="rounded-xl bg-primary-50 p-3"><Icon className="h-5 w-5 text-primary-600" /></div>
                <div>
                  <p className="text-[12px] font-bold text-surface-900">{label}</p>
                  <p className="mt-1 text-[12px] text-surface-500">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Scribe Deep-Dive ─────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-xl bg-accent-400/15 p-3"><BrainCircuit className="h-6 w-6 text-accent-300" /></div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[.18em] text-accent-300">AI-assisted, clinician-led</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Less searching. More confident care.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-7 text-white/65">
                Jioplix puts practical intelligence around your team&apos;s work today, while keeping clinical judgment and prescription decisions with qualified professionals.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              {aiWorkflowPoints.map(point => (
                <div key={point} className="flex gap-3 border-b border-white/10 py-4 first:pt-0 last:border-0 last:pb-0">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-300" />
                  <p className="text-[13px] leading-6 text-white/80">{point}</p>
                </div>
              ))}
              <div className="mt-5 rounded-xl bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-300">Powered by</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-bold">OpenAI GPT</span>
                  <span className="text-[12px] text-white/50">+ keyword fallback</span>
                </div>
                <p className="mt-2 text-[11px] text-white/45">Generates consultation summaries, prescription drafts, and patient insights with automatic fallback to local keyword engine.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Teleconsultation ────────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div className="relative overflow-hidden rounded-2xl bg-surface-900 p-8 text-white">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-success-500/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                  <div className="rounded-xl bg-success-500/20 p-2.5"><Video className="h-5 w-5 text-success-400" /></div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-success-300">Teleconsultation</p>
                    <h3 className="text-lg font-bold">Live video session</h3>
                  </div>
                  <span className="ml-auto rounded-full bg-success-500/20 px-3 py-1 text-[10px] font-bold text-success-300">Connected</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/10 p-4 text-center"><p className="text-xl font-bold">12</p><p className="mt-1 text-[10px] text-white/50">Today&apos;s sessions</p></div>
                  <div className="rounded-xl bg-white/10 p-4 text-center"><p className="text-xl font-bold">34m</p><p className="mt-1 text-[10px] text-white/50">Avg. duration</p></div>
                  <div className="rounded-xl bg-white/10 p-4 text-center"><p className="text-xl font-bold">98%</p><p className="mt-1 text-[10px] text-white/50">Connected</p></div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { name: 'Priya Sharma', time: '10:30 AM', status: 'In progress' },
                    { name: 'Amit Patel', time: '11:00 AM', status: 'Scheduled' },
                    { name: 'Sneha Reddy', time: '9:45 AM', status: 'Completed' },
                  ].map(({ name, time, status }) => (
                    <div key={name} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-[11px] font-bold">{name[0]}</div>
                        <div>
                          <p className="text-[12px] font-semibold">{name}</p>
                          <p className="text-[10px] text-white/50">{time}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        status === 'In progress' ? 'bg-success-500/20 text-success-300' :
                        status === 'Scheduled' ? 'bg-warning-500/20 text-warning-300' :
                        'bg-white/10 text-white/50'
                      }`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">Remote care, fully integrated</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900">Video consultations from the same clinical workspace.</h2>
              <p className="mt-4 text-[14px] leading-7 text-surface-600">
                No separate video platform. Patients join from a booking link, clinicians access the full EMR during the call, and sessions are recorded for future reference.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  'One-click session launch from the appointment queue',
                  'Patient history, vitals, and prescriptions visible during call',
                  'Session recording and clinical notes saved automatically',
                  'Integrated billing — invoice generated from consultation',
                ].map(point => (
                  <div key={point} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
                    <p className="text-[13px] leading-5 text-surface-600">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Patient Engagement ──────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-50">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-accent-700">Patient engagement</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Reach patients between visits.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-7 text-surface-600">
                Automated campaigns, booking links, and reminders keep your clinic top-of-mind — and keep patients coming back on schedule.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Campaign Builder Card */}
              <article className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-accent-500 to-success-500 p-5 text-white">
                  <Send className="h-6 w-6" />
                  <h3 className="mt-3 text-lg font-bold">Campaign Builder</h3>
                  <p className="mt-1 text-[12px] text-white/75">Automated patient outreach</p>
                </div>
                <div className="p-5">
                  <div className="space-y-3">
                    {[
                      { name: 'Birthday wishes', status: 'Active', sends: '24 patients' },
                      { name: 'Follow-up reminders', status: 'Active', sends: '12 patients' },
                      { name: 'Health tips weekly', status: 'Paused', sends: '156 patients' },
                    ].map(({ name, status, sends }) => (
                      <div key={name} className="flex items-center justify-between rounded-xl bg-surface-50 px-3 py-2.5">
                        <div>
                          <p className="text-[12px] font-semibold text-surface-900">{name}</p>
                          <p className="text-[10px] text-surface-500">{sends}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          status === 'Active' ? 'bg-success-50 text-success-600' : 'bg-surface-100 text-surface-500'
                        }`}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              {/* Online Booking Card */}
              <article className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-warning-500 to-danger-500 p-5 text-white">
                  <Link2 className="h-6 w-6" />
                  <h3 className="mt-3 text-lg font-bold">Online Booking</h3>
                  <p className="mt-1 text-[12px] text-white/75">Self-scheduling for patients</p>
                </div>
                <div className="p-5">
                  <div className="rounded-xl bg-surface-50 p-4 text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-surface-200 shadow-sm">
                      <Link2 className="h-7 w-7 text-primary-600" />
                    </div>
                    <p className="text-[11px] font-bold text-surface-900">clinic.jioplix.com/book/dr-priya</p>
                    <p className="mt-1 text-[10px] text-surface-500">Share via link, QR code, or WhatsApp</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      { patient: 'Rahul M.', time: 'Tomorrow, 10:00 AM' },
                      { patient: 'Anita K.', time: 'Tomorrow, 2:30 PM' },
                    ].map(({ patient, time }) => (
                      <div key={patient} className="flex items-center justify-between rounded-xl bg-surface-50 px-3 py-2">
                        <span className="text-[12px] font-semibold text-surface-900">{patient}</span>
                        <span className="text-[10px] text-surface-500">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABDM / ABHA ─────────────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-xl bg-info-50 p-3"><Shield className="h-6 w-6 text-info-600" /></div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[.18em] text-info-600">ABDM / FHIR R4</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900">Connected to India&apos;s health stack.</h2>
              <p className="mt-4 text-[14px] leading-7 text-surface-600">
                Link patient ABHA numbers, fetch health records from any ABDM-registered provider, manage consent workflows, and push clinical data — all compliant with India&apos;s Ayushman Bharat Digital Mission.
              </p>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-primary-700 hover:text-primary-800">
                Explore ABDM integration <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'ABHA Linked', value: '1,247', icon: Shield, color: 'text-info-600 bg-info-50' },
                  { label: 'Records Fetched', value: '3,891', icon: FileText, color: 'text-primary-600 bg-primary-50' },
                  { label: 'Consents Active', value: '892', icon: Check, color: 'text-success-600 bg-success-50' },
                  { label: 'Pushed to ABDM', value: '2,156', icon: ArrowRight, color: 'text-accent-600 bg-accent-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl bg-white p-4 border border-surface-100">
                    <div className={`inline-flex rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></div>
                    <p className="mt-3 text-2xl font-bold text-surface-900">{value}</p>
                    <p className="mt-1 text-[11px] text-surface-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-white border border-surface-100 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400">FHIR R4 Resources</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Patient', 'Encounter', 'DiagnosticReport', 'MedicationRequest', 'Consent'].map(r => (
                    <span key={r} className="rounded-lg bg-info-50 px-2.5 py-1 text-[10px] font-bold text-info-700 border border-info-100">{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dashboard Intelligence ──────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-50">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">Data-driven decisions</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900">Your clinic, in real time.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-7 text-surface-600">
                The dashboard filters by date range, shows revenue trends over time, and surfaces the metrics that matter — so you can spot issues before they become problems.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {dashboardHighlights.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                  <div className="inline-flex rounded-xl bg-primary-50 p-3"><Icon className="h-5 w-5 text-primary-600" /></div>
                  <h3 className="mt-4 text-[14px] font-bold text-surface-900">{title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-surface-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Inventory Control ───────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-accent-300">Inventory control for care teams</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Know what is on the shelf, what is expiring, and what needs proof.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-7 text-white/65">
                Keep Pharmacy, Laboratory, and clinical supplies reconciled with a single stock register, clear expiry signals, and documents ready for every handoff.
              </p>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-accent-300 hover:text-white">
                See inventory in the demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {inventoryHighlights.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Icon className="h-5 w-5 text-accent-300" />
                  <h3 className="mt-5 text-[14px] font-bold">{title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-white/55">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Clinical Thread ─────────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">One clinical thread</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">From consultation to care completion.</h2>
            <p className="mt-4 text-[14px] leading-7 text-surface-600">
              The details that matter do not disappear between departments. Jioplix keeps the prescription, pharmacy, and laboratory loop visible to the right people.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {careModules.map(({ icon: Icon, name, accent, text }, index) => (
              <article key={name} className="relative rounded-2xl border border-surface-200 bg-surface-50 p-5">
                <span className="absolute right-5 top-5 text-[11px] font-bold text-surface-300">0{index + 1}</span>
                <div className={`inline-flex rounded-xl p-3 ${accent}`}><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-[16px] font-bold text-surface-900">{name}</h3>
                <p className="mt-2 text-[13px] leading-6 text-surface-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PDF Export & Offline ────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-50">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-xl bg-danger-50 p-3"><FileText className="h-5 w-5 text-danger-600" /></div>
              <h3 className="mt-4 text-lg font-bold text-surface-900">PDF Export</h3>
              <p className="mt-2 text-[13px] leading-6 text-surface-500">
                Download patient health summaries, GST-compliant invoices, and formatted prescriptions — ready to share, print, or archive.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Patient Summary', 'GST Invoice', 'Prescription'].map(label => (
                  <span key={label} className="rounded-lg bg-surface-100 px-3 py-1.5 text-[11px] font-bold text-surface-600">{label}</span>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-xl bg-primary-50 p-3"><Wifi className="h-5 w-5 text-primary-600" /></div>
              <h3 className="mt-4 text-lg font-bold text-surface-900">Progressive Web App</h3>
              <p className="mt-2 text-[13px] leading-6 text-surface-500">
                Install Jioplix on any device. Service workers cache static assets for lightning-fast loads and provide offline access to critical clinic data.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-50 p-3 text-center">
                  <p className="text-xl font-bold text-primary-600">1.2s</p>
                  <p className="mt-1 text-[10px] text-surface-500">First load (cached)</p>
                </div>
                <div className="rounded-xl bg-surface-50 p-3 text-center">
                  <p className="text-xl font-bold text-success-600">100%</p>
                  <p className="mt-1 text-[10px] text-surface-500">Offline data access</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── Plans ───────────────────────────────────────────────────────── */}
      <section id="plans" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-accent-700">Plans that scale with care</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Start lean. Add capability when you need it.</h2>
          </div>
          <p className="max-w-xs text-[12px] leading-5 text-surface-500">Every plan includes secure core workflows. Choose the operating depth your team needs today.</p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map(plan => (
            <article key={plan.name} className={`relative rounded-2xl border p-6 ${plan.featured ? 'border-primary-400 bg-primary-700 text-white shadow-[0_20px_50px_rgba(15,84,198,.2)]' : 'border-surface-200 bg-white'}`}>
              {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-accent-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-surface-900">Most chosen</span>}
              <p className={`text-[12px] font-bold uppercase tracking-wider ${plan.featured ? 'text-accent-200' : 'text-primary-600'}`}>{plan.name}</p>
              <p className={`mt-1 text-[12px] ${plan.featured ? 'text-white/70' : 'text-surface-500'}`}>{plan.fit}</p>
              <p className="mt-6 text-4xl font-bold">{plan.price}<span className={`text-[12px] font-medium ${plan.featured ? 'text-white/60' : 'text-surface-400'}`}> / month</span></p>
              <div className={`my-6 border-t ${plan.featured ? 'border-white/15' : 'border-surface-100'}`} />
              {plan.features.map(feature => (
                <p key={feature} className={`mb-3 flex items-center gap-2 text-[12px] ${plan.featured ? 'text-white/85' : 'text-surface-600'}`}>
                  <Check className={`h-4 w-4 ${plan.featured ? 'text-accent-300' : 'text-success-600'}`} />{feature}
                </p>
              ))}
              <Link to="/login" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold ${plan.featured ? 'bg-white text-primary-700 hover:bg-primary-50' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={RAZORPAY_PAYMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold border ${plan.featured ? 'border-white/20 text-white/80 hover:bg-white/10' : 'border-surface-200 text-surface-500 hover:border-primary-200 hover:bg-primary-50/40'}`}
              >
                Pay now via Razorpay
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* ─── Specialties ─────────────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-50">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary-600">Built around your specialty</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">One platform. A more personal clinical fit.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-7 text-surface-600">
                Your specialty should shape the workflow, not force your team into a generic template. Start with a shared foundation and make the care experience feel like your own.
              </p>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-primary-700 hover:text-primary-800">
                Explore specialty workflows <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {specialties.map(({ icon: Icon, name, text, tone }) => (
                <article key={name} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                  <div className={`inline-flex rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-4 text-[14px] font-bold text-surface-900">{name}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-surface-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Download Android App ──────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-accent-700">
              <Smartphone className="h-3.5 w-3.5" /> Android App
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Take Jioplix everywhere.</h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] leading-7 text-surface-600">
              Download the app built for your role. Same clinical workspace, optimized for your device.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {/* Patient APK */}
            <article className="relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-50 p-6 text-center transition-all hover:border-primary-200 hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success-500 to-info-500 shadow-sm">
                <HeartHandshake className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-surface-900">Jioplix Patient</h3>
              <p className="mt-2 text-[12px] leading-5 text-surface-500">
                Book appointments, join teleconsultations, view prescriptions, and access your health records.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {['Booking', 'Teleconsult', 'Records', 'Prescriptions'].map(f => (
                  <span key={f} className="rounded-md bg-success-50 px-2 py-0.5 text-[9px] font-bold text-success-700 border border-success-100">{f}</span>
                ))}
              </div>
              <a
                href="/android/jioplix-patient.apk"
                download
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-[13px] font-bold text-white shadow-healthcare hover:bg-primary-700"
              >
                <Smartphone className="h-4 w-4" /> Download APK
              </a>
              <p className="mt-2 text-[10px] text-surface-400">v1.0.0 · 5.4 MB · Android 7+</p>
            </article>

            {/* Doctor APK */}
            <article className="relative overflow-hidden rounded-2xl border-2 border-primary-300 bg-primary-50 p-6 text-center shadow-[0_8px_30px_rgba(15,84,198,.12)]">
              <span className="absolute right-4 top-4 rounded-full bg-primary-600 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Most Popular</span>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
                <Stethoscope className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-surface-900">Jioplix Doctor</h3>
              <p className="mt-2 text-[12px] leading-5 text-surface-500">
                Full EMR access — consultations, prescriptions, diagnoses, vitals, lab orders, and clinical analytics.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {['EMR', 'Prescriptions', 'Analytics', 'Lab Orders'].map(f => (
                  <span key={f} className="rounded-md bg-primary-100 px-2 py-0.5 text-[9px] font-bold text-primary-700 border border-primary-200">{f}</span>
                ))}
              </div>
              <a
                href="/android/jioplix-doctor.apk"
                download
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-3 text-[13px] font-bold text-white shadow-healthcare hover:bg-primary-800"
              >
                <Smartphone className="h-4 w-4" /> Download APK
              </a>
              <p className="mt-2 text-[10px] text-primary-400">v1.0.0 · 5.4 MB · Android 7+</p>
            </article>

            {/* Staff APK */}
            <article className="relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-50 p-6 text-center transition-all hover:border-primary-200 hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning-500 to-danger-500 shadow-sm">
                <UsersRound className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-surface-900">Jioplix Staff</h3>
              <p className="mt-2 text-[12px] leading-5 text-surface-500">
                Reception, queue management, billing, pharmacy dispensing, lab tracking, and inventory control.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {['Billing', 'Pharmacy', 'Queue', 'Inventory'].map(f => (
                  <span key={f} className="rounded-md bg-warning-50 px-2 py-0.5 text-[9px] font-bold text-warning-700 border border-warning-100">{f}</span>
                ))}
              </div>
              <a
                href="/android/jioplix-staff.apk"
                download
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-[13px] font-bold text-white shadow-healthcare hover:bg-primary-700"
              >
                <Smartphone className="h-4 w-4" /> Download APK
              </a>
              <p className="mt-2 text-[10px] text-surface-400">v1.0.0 · 5.4 MB · Android 7+</p>
            </article>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[12px] text-surface-500">
              All apps connect to your Jioplix clinic workspace. Sign in with your clinic credentials.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────── */}
      <section className="mx-5 mb-8 overflow-hidden rounded-[2rem] bg-primary-700 px-6 py-12 text-white sm:px-12 lg:mx-auto lg:max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <LockKeyhole className="h-6 w-6 text-accent-300" />
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight">Give your hospital a system it can grow into.</h2>
            <p className="mt-3 max-w-xl text-[14px] leading-6 text-white/75">
              Start with the workflows you need today. Add pharmacy, laboratory, procedures, inventory, teleconsultation, ABDM, and intelligent automation as your operation grows.
            </p>
          </div>
          <Link to="/login" className="inline-flex h-fit items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-bold text-primary-700 hover:bg-primary-50">
            Open the demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 text-[11px] text-surface-400 lg:px-8">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-4">
          <Link to="/admin" className="hover:text-primary-600 transition-colors">Admin</Link>
          <span>Care operations, thoughtfully connected.</span>
        </div>
      </footer>
    </main>
  )
}
