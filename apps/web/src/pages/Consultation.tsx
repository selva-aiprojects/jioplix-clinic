import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Stethoscope, ClipboardList, Pill, FileText,
  ArrowRight, CheckCircle2, Sparkles, AlertTriangle,
  Plus, Activity, Lock, Save, Ban, CalendarClock, Printer,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'
import {
  getEncounter, getPatient, updateEncounter, addVitals, addDiagnosis,
  lockEncounter, createPrescription, listPrescriptionsByEncounter,
  addPrescriptionItem, updatePrescriptionStatus, listPatientEncounters,
} from '../lib/api'
import type { Encounter, Patient, Prescription, PatientEncounterSummary } from '../lib/api'

const genderLabel: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' }

function ageOf(dob?: string): number | null {
  if (!dob) return null
  return Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
}

interface VitalsDraft {
  bpSystolic: string
  bpDiastolic: string
  pulse: string
  temperatureC: string
  spo2: string
  weightKg: string
  heightCm: string
}

const emptyVitals: VitalsDraft = { bpSystolic: '', bpDiastolic: '', pulse: '', temperatureC: '', spo2: '', weightKg: '', heightCm: '' }

export default function Consultation() {
  const { id } = useParams()
  const encounterId = id

  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [history, setHistory] = useState<PatientEncounterSummary[]>([])
  const [rxList, setRxList] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [chiefComplaint, setChiefComplaint] = useState('')
  const [hpi, setHpi] = useState('')
  const [examination, setExamination] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showVitalsForm, setShowVitalsForm] = useState(false)
  const [vitalsDraft, setVitalsDraft] = useState<VitalsDraft>(emptyVitals)

  const [diagCode, setDiagCode] = useState('')
  const [diagName, setDiagName] = useState('')
  const [diagType, setDiagType] = useState<'primary' | 'secondary' | 'differential'>('primary')

  const [rxDrug, setRxDrug] = useState('')
  const [RxDosage, setRxDosage] = useState('')
  const [rxFrequency, setRxFrequency] = useState('')
  const [rxDuration, setRxDuration] = useState('')

  const refreshRx = useCallback(async (encId: string) => {
    try { setRxList(await listPrescriptionsByEncounter(encId)) } catch { setRxList([]) }
  }, [])

  useEffect(() => {
    if (!encounterId) { setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const enc = await getEncounter(encounterId!)
        if (cancelled) return
        setEncounter(enc)
        setChiefComplaint(enc.chiefComplaint ?? '')
        setHpi(enc.historyPresentIllness ?? '')
        setExamination(enc.examinationFindings ?? '')
        setClinicalNotes(enc.clinicalNotes ?? '')
        setFollowUpDate(enc.followUpDate ?? '')
        setFollowUpNotes(enc.followUpNotes ?? '')
        setDirty(false)
        try {
          const [p, hist] = await Promise.all([getPatient(enc.patientId), listPatientEncounters(enc.patientId)])
          if (!cancelled) { setPatient(p); setHistory(hist.filter(h => h.id !== enc.id)) }
        } catch { /* secondary data optional */ }
        await refreshRx(enc.id)
      } catch {
        if (!cancelled) setLoadError('ENCOUNTER_NOT_FOUND')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [encounterId, refreshRx])

  const locked = encounter?.isLocked ?? false

  function guard(): boolean {
    if (locked) { setError('ENCOUNTER_SIGNED'); return false }
    return true
  }

  async function run(fn: () => Promise<void>, okMessage?: string) {
    if (!guard()) return
    setBusy(true); setError(null); setNotice(null)
    try {
      await fn()
      if (okMessage) setNotice(okMessage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'UNKNOWN')
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = () =>
    run(async () => {
      await updateEncounter(encounter!.id, {
        chiefComplaint, historyPresentIllness: hpi,
        examinationFindings: examination, clinicalNotes,
        followUpDate: followUpDate || undefined,
        followUpNotes: followUpNotes || undefined,
      })
      setDirty(false)
    }, 'Draft saved')

  const recordVitals = () =>
    run(async () => {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
      await addVitals(encounter!.id, {
        bpSystolic: num(vitalsDraft.bpSystolic),
        bpDiastolic: num(vitalsDraft.bpDiastolic),
        pulse: num(vitalsDraft.pulse),
        temperatureC: num(vitalsDraft.temperatureC),
        spo2: num(vitalsDraft.spo2),
        weightKg: num(vitalsDraft.weightKg),
        heightCm: num(vitalsDraft.heightCm),
      })
      setVitalsDraft(emptyVitals)
      setShowVitalsForm(false)
      setEncounter(await getEncounter(encounter!.id))
    }, 'Vitals recorded')

  const submitDiagnosis = () =>
    run(async () => {
      if (!diagCode.trim() || !diagName.trim()) throw new Error('VALIDATION_FAILED')
      await addDiagnosis(encounter!.id, { icd10Code: diagCode.trim(), icd10Name: diagName.trim(), type: diagType })
      setDiagCode(''); setDiagName(''); setDiagType('primary')
      setEncounter(await getEncounter(encounter!.id))
    }, 'Diagnosis added')

  const startPrescription = () =>
    run(async () => {
      await createPrescription({ encounterId: encounter!.id, patientId: encounter!.patientId })
      await refreshRx(encounter!.id)
    }, 'Prescription created')

  const appendRxItem = () =>
    run(async () => {
      const rx = rxList.find(r => r.status === 'draft') ?? rxList[0]
      if (!rx) return
      if (!rxDrug.trim() || !RxDosage.trim() || !rxFrequency.trim()) throw new Error('VALIDATION_FAILED')
      await addPrescriptionItem(rx.id, {
        drugName: rxDrug.trim(),
        dosage: RxDosage.trim(),
        frequency: rxFrequency.trim(),
        durationDays: rxDuration.trim() === '' ? undefined : Number(rxDuration),
      })
      setRxDrug(''); setRxDosage(''); setRxFrequency(''); setRxDuration('')
      await refreshRx(encounter!.id)
    }, 'Medication added')

  const issuePrescription = () =>
    run(async () => {
      const rx = rxList.find(r => r.status === 'draft') ?? rxList[0]
      if (!rx) return
      await updatePrescriptionStatus(rx.id, 'issued')
      await refreshRx(encounter!.id)
    }, 'Prescription issued')

  function printPrescription() {
    if (!currentRx || currentRx.items.length === 0) return
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) return
    const items = currentRx.items.map(item => `
      <tr>
        <td>${item.drugName}${item.strength ? ` ${item.strength}` : ''}</td>
        <td>${item.dosage}</td>
        <td>${item.frequency}</td>
        <td>${item.durationDays ? `${item.durationDays} days` : '-'}</td>
      </tr>`).join('')
    printWindow.document.write(`<!doctype html><html><head><title>Prescription - ${currentRx.patientName}</title><style>
      body{font-family:Arial,sans-serif;color:#10234a;margin:48px;line-height:1.5}header{display:flex;justify-content:space-between;border-bottom:2px solid #1265e8;padding-bottom:18px}h1{font-size:24px;margin:0}h2{font-size:18px;margin:28px 0 8px}p{margin:4px 0;color:#475569;font-size:13px}.meta{text-align:right}table{border-collapse:collapse;width:100%;margin-top:12px;font-size:13px}th,td{text-align:left;border-bottom:1px solid #e2e8f0;padding:11px 8px}th{background:#f6f9fc;color:#475569;font-size:11px;text-transform:uppercase}footer{border-top:1px solid #e2e8f0;margin-top:48px;padding-top:14px;color:#64748b;font-size:11px}@media print{body{margin:24px}}
    </style></head><body><header><div><h1>Jioplix</h1><p>Digital Prescription</p></div><div class="meta"><p><strong>Doctor</strong><br>${encounter?.doctorName ?? currentRx.doctorName}</p><p>${new Date(currentRx.createdAt).toLocaleDateString()}</p></div></header><h2>Patient</h2><p><strong>${currentRx.patientName}</strong></p><p>Prescription status: ${currentRx.status}</p><h2>Medication</h2><table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${items}</tbody></table><footer>Issued through Jioplix Clinical Workspace. Please follow your doctor&apos;s instructions.</footer></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const signAndClose = () =>
    run(async () => {
      await lockEncounter(encounter!.id)
      setEncounter(await getEncounter(encounter!.id))
    }, 'Encounter signed and closed')

  if (!encounterId || (!loading && !encounter)) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Stethoscope} title="Clinical Consultation" subtitle="EMR workspace for active consultation" />
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-10 text-center">
          <p className="text-[14px] font-medium text-surface-700">
            {loadError === 'ENCOUNTER_NOT_FOUND' ? 'Encounter not found.' : 'No active encounter selected.'}
          </p>
          <p className="text-[13px] text-surface-400 mt-1">Start a consultation from today&apos;s appointments.</p>
          <Link to="/appointments" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-[13px] font-medium hover:bg-primary-600 transition-colors">
            Go to Appointments <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const age = ageOf(patient?.dateOfBirth)
  const initials = ((patient?.firstName?.[0] ?? '') + (patient?.lastName?.[0] ?? '')).toUpperCase() || '?'
  const currentRx = rxList.find(r => r.status === 'draft') ?? rxList[0] ?? null
  const steps = [
    { label: 'Consultation', done: Boolean(chiefComplaint || examination), icon: Stethoscope },
    { label: 'Vitals', done: Boolean(encounter?.vitals), icon: Activity },
    { label: 'Diagnosis', done: (encounter?.diagnoses.length ?? 0) > 0, icon: FileText },
    { label: 'Prescription', done: Boolean(currentRx && currentRx.status !== 'draft'), icon: Pill },
    { label: 'Signed', done: locked, icon: CheckCircle2 },
  ]

  const field =
    'w-full px-4 py-3 text-[13px] bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-none transition-all placeholder:text-surface-400 disabled:opacity-60'
  const inputCls =
    'w-full px-3 py-2 text-[13px] bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 disabled:opacity-60'

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Stethoscope}
        title={patient ? `Consultation — ${patient.firstName} ${patient.lastName}` : 'Clinical Consultation'}
        subtitle={encounter ? `${encounter.encounterDate} · ${encounter.doctorName}` : 'EMR workspace'}
        actions={
          <>
            {locked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success-50 border border-success-200 text-success-700 text-[12px] font-semibold">
                <Lock className="w-3.5 h-3.5" /> Signed
              </span>
            ) : (
              <>
                <Button variant="secondary" onClick={saveDraft} disabled={busy || !dirty}>
                  <Save className="w-4 h-4" /> Save Draft
                </Button>
                <Button onClick={signAndClose} disabled={busy}>
                  <CheckCircle2 className="w-4 h-4" /> Sign &amp; Close
                </Button>
              </>
            )}
          </>
        }
      />

      {(notice || error) && (
        <div className={`rounded-xl px-4 py-3 text-[12px] font-medium border ${error ? 'bg-danger-50 border-danger-200 text-danger-700' : 'bg-success-50 border-success-200 text-success-700'}`}>
          {error ?? notice}
          {error && <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium whitespace-nowrap ${
                step.done ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-surface-50 text-surface-500 border border-surface-200'
              }`}>
                {step.done ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                {step.label}
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-surface-300 mx-1 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-10 text-center text-[13px] text-surface-400">Loading encounter…</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-[13px] font-bold shadow-sm">{initials}</div>
                <div>
                  <h3 className="text-[14px] font-semibold text-surface-800">{patient ? `${patient.firstName} ${patient.lastName}` : '—'}</h3>
                  <p className="text-[12px] text-surface-400">{patient?.mrn}{age !== null ? ` · ${age}` : ''}{patient?.gender ? ` · ${genderLabel[patient.gender] ?? patient.gender}` : ''}</p>
                </div>
              </div>
              <div className="space-y-2">
                {patient?.bloodGroup && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger-500" />
                    <span className="text-[12px] text-danger-600 font-medium">Blood Group: {patient.bloodGroup}</span>
                  </div>
                )}
                {patient?.abhaNumber && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-primary-50 text-primary-600 text-[11px] font-medium border border-primary-100">ABHA: {patient.abhaNumber}</span>
                )}
                {!patient?.bloodGroup && !patient?.abhaNumber && (
                  <p className="text-[12px] text-surface-400">No risk flags on file</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-surface-800">Vitals</h3>
                {!locked && !showVitalsForm && (
                  <button onClick={() => setShowVitalsForm(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-[11px] font-medium hover:bg-primary-100 transition-colors">
                    <Plus className="w-3 h-3" /> Record
                  </button>
                )}
              </div>
              {showVitalsForm && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input className={inputCls} placeholder="BP Systolic" value={vitalsDraft.bpSystolic} onChange={e => setVitalsDraft({ ...vitalsDraft, bpSystolic: e.target.value })} inputMode="numeric" />
                  <input className={inputCls} placeholder="BP Diastolic" value={vitalsDraft.bpDiastolic} onChange={e => setVitalsDraft({ ...vitalsDraft, bpDiastolic: e.target.value })} inputMode="numeric" />
                  <input className={inputCls} placeholder="Pulse bpm" value={vitalsDraft.pulse} onChange={e => setVitalsDraft({ ...vitalsDraft, pulse: e.target.value })} inputMode="numeric" />
                  <input className={inputCls} placeholder="Temp °C" value={vitalsDraft.temperatureC} onChange={e => setVitalsDraft({ ...vitalsDraft, temperatureC: e.target.value })} inputMode="decimal" />
                  <input className={inputCls} placeholder="SpO₂ %" value={vitalsDraft.spo2} onChange={e => setVitalsDraft({ ...vitalsDraft, spo2: e.target.value })} inputMode="numeric" />
                  <input className={inputCls} placeholder="Weight kg" value={vitalsDraft.weightKg} onChange={e => setVitalsDraft({ ...vitalsDraft, weightKg: e.target.value })} inputMode="decimal" />
                  <input className={inputCls} placeholder="Height cm" value={vitalsDraft.heightCm} onChange={e => setVitalsDraft({ ...vitalsDraft, heightCm: e.target.value })} inputMode="decimal" />
                  <div className="col-span-2 flex gap-2">
                    <Button onClick={recordVitals} disabled={busy}>Save Vitals</Button>
                    <Button variant="secondary" onClick={() => setShowVitalsForm(false)} disabled={busy}>Cancel</Button>
                  </div>
                </div>
              )}
              {encounter?.vitals ? (
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['BP', encounter.vitals.bpSystolic != null && encounter.vitals.bpDiastolic != null ? `${encounter.vitals.bpSystolic}/${encounter.vitals.bpDiastolic} mmHg` : '—'],
                    ['Pulse', encounter.vitals.pulse != null ? `${encounter.vitals.pulse} bpm` : '—'],
                    ['Temp', encounter.vitals.temperatureC != null ? `${encounter.vitals.temperatureC}°C` : '—'],
                    ['SpO₂', encounter.vitals.spo2 != null ? `${encounter.vitals.spo2}%` : '—'],
                    ['Weight', encounter.vitals.weightKg != null ? `${encounter.vitals.weightKg} kg` : '—'],
                    ['BMI', encounter.vitals.bmi != null ? String(encounter.vitals.bmi) : '—'],
                  ] as const).map(([k, v]) => (
                    <div key={k} className="bg-surface-50 rounded-xl p-3">
                      <p className="text-[11px] text-surface-400 uppercase tracking-wider">{k}</p>
                      <p className="text-[14px] font-bold text-surface-800 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-surface-400">No vitals recorded yet.</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg opacity-90">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-[14px] font-semibold">AI Pre-Consult Summary</h3>
              </div>
              <p className="text-[12px] leading-relaxed text-white/90">
                AI scribe and summaries arrive in the M3 Intelligence phase. Clinical notes below remain doctor-authored.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-surface-700 block mb-2">Chief Complaint</label>
                <textarea value={chiefComplaint} disabled={locked} onChange={e => { setChiefComplaint(e.target.value); setDirty(true) }} placeholder="Presenting complaint and duration…" className={`${field} h-20`} />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-surface-700 block mb-2">History of Present Illness</label>
                <textarea value={hpi} disabled={locked} onChange={e => { setHpi(e.target.value); setDirty(true) }} placeholder="Onset, progression, associated symptoms…" className={`${field} h-20`} />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-surface-700 block mb-2">Examination Notes</label>
                <textarea value={examination} disabled={locked} onChange={e => { setExamination(e.target.value); setDirty(true) }} placeholder="General exam, systemic findings…" className={`${field} h-20`} />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-surface-700 block mb-2">Clinical Notes</label>
                <textarea value={clinicalNotes} disabled={locked} onChange={e => { setClinicalNotes(e.target.value); setDirty(true) }} placeholder="Assessment, plan, advice…" className={`${field} h-16`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-semibold text-surface-700 block mb-2"><CalendarClock className="w-3.5 h-3.5 inline mr-1" />Follow-up Date</label>
                  <input type="date" value={followUpDate} disabled={locked} onChange={e => { setFollowUpDate(e.target.value); setDirty(true) }} className={inputCls} />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-surface-700 block mb-2">Follow-up Notes</label>
                  <input value={followUpNotes} disabled={locked} onChange={e => { setFollowUpNotes(e.target.value); setDirty(true) }} placeholder="e.g. review HbA1c" className={inputCls} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <label className="text-[13px] font-semibold text-surface-700 block mb-3">Diagnoses (ICD-10)</label>
              {encounter && encounter.diagnoses.length > 0 && (
                <div className="space-y-2 mb-3">
                  {encounter.diagnoses.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                      <FileText className="w-4 h-4 text-primary-500" />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-surface-800">{d.icd10Name}</p>
                        <p className="text-[11px] text-surface-400">ICD-10: {d.icd10Code}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${d.type === 'primary' ? 'bg-warning-50 text-warning-600' : 'bg-info-50 text-info-600'}`}>{d.type}</span>
                    </div>
                  ))}
                </div>
              )}
              {!locked && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input className={inputCls} placeholder="ICD-10 code" value={diagCode} onChange={e => setDiagCode(e.target.value)} />
                  <input className={`${inputCls} md:col-span-1`} placeholder="Diagnosis name" value={diagName} onChange={e => setDiagName(e.target.value)} />
                  <select className={inputCls} value={diagType} onChange={e => setDiagType(e.target.value as typeof diagType)}>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="differential">Differential</option>
                  </select>
                  <Button onClick={submitDiagnosis} disabled={busy}><Plus className="w-4 h-4" /> Add Diagnosis</Button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[13px] font-semibold text-surface-700">Prescription</label>
                {currentRx && (
                  <div className="flex items-center gap-2">
                  {currentRx.items.length > 0 && (
                    <button onClick={printPrescription} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1 text-[11px] font-semibold text-surface-600 hover:bg-surface-50">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
                    currentRx.status === 'issued' || currentRx.status === 'dispensed'
                      ? 'bg-success-50 text-success-700 border border-success-200'
                      : 'bg-warning-50 text-warning-700 border border-warning-200'
                  }`}>{currentRx.status}</span>
                  </div>
                )}
              </div>

              {!currentRx ? (
                <div className="text-center py-4">
                  <p className="text-[13px] text-surface-500 mb-3">No prescription created for this encounter.</p>
                  {!locked && (
                    <Button onClick={startPrescription} disabled={busy}><Pill className="w-4 h-4" /> Create Prescription</Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {currentRx.items.length > 0 && (
                    <div className="space-y-2">
                      {currentRx.items.map(it => (
                        <div key={it.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                          <Pill className="w-4 h-4 text-accent-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-surface-800">
                              {it.drugName}{it.strength ? ` ${it.strength}` : ''}
                            </p>
                            <p className="text-[12px] text-surface-500">{it.dosage} · {it.frequency}{it.durationDays ? ` · ${it.durationDays} days` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentRx.status === 'draft' && !locked && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <input className={inputCls} placeholder="Drug name" value={rxDrug} onChange={e => setRxDrug(e.target.value)} />
                        <input className={inputCls} placeholder="Dosage e.g. 500mg" value={RxDosage} onChange={e => setRxDosage(e.target.value)} />
                        <input className={inputCls} placeholder="Frequency e.g. TDS" value={rxFrequency} onChange={e => setRxFrequency(e.target.value)} />
                        <input className={inputCls} placeholder="Days" value={rxDuration} onChange={e => setRxDuration(e.target.value)} inputMode="numeric" />
                        <Button onClick={appendRxItem} disabled={busy}><Plus className="w-4 h-4" /> Add Item</Button>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="secondary" onClick={issuePrescription} disabled={busy || currentRx.items.length === 0}>
                          <Ban className="w-4 h-4 rotate-180" /> Issue Prescription
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <h3 className="text-[14px] font-semibold text-surface-800 mb-4">Previous Consultations</h3>
              {history.length === 0 ? (
                <p className="text-[13px] text-surface-400">No prior encounters for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {history.map(h => (
                    <Link to={`/encounters/${h.id}`} key={h.id} className="block p-3 rounded-xl bg-surface-50 border border-surface-100 hover:bg-surface-100/70 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-surface-400" />
                        <span className="text-[12px] font-medium text-surface-700">{h.encounterDate}</span>
                        <span className="text-[11px] text-surface-400">· {h.doctorName}</span>
                        {h.isLocked && <Lock className="w-3 h-3 text-success-500 ml-auto" />}
                      </div>
                      {h.chiefComplaint && <p className="text-[12px] text-surface-600"><strong>Complaint:</strong> {h.chiefComplaint}</p>}
                      {h.diagnoses.length > 0 && (
                        <p className="text-[12px] text-surface-600">
                          <strong>Diagnosis:</strong> {h.diagnoses.map(d => d.icd10Name).join(', ')}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
