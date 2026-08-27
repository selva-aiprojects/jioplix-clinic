import { useCallback, useEffect, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { Link, useParams } from 'react-router-dom'
import {
  Stethoscope, ClipboardList, Pill, FileText,
  ArrowRight, CheckCircle2, Sparkles, AlertTriangle,
  Plus, Activity, Lock, Save, Ban, CalendarClock, Printer,
  Bookmark, Languages, ScanLine, Download,
} from 'lucide-react'
import { PageHeader, Button } from '../components/ui'
import Autocomplete from '../components/Autocomplete'
import RxTemplatePicker from '../components/RxTemplatePicker'
import {
  getEncounter, getPatient, updateEncounter, addVitals, addDiagnosis,
  lockEncounter, createPrescription, listPrescriptionsByEncounter,
  addPrescriptionItem, updatePrescriptionStatus, listPatientEncounters,
  createAiJob, getAiJob,
} from '../lib/api'
import type { Encounter, Patient, Prescription, PatientEncounterSummary, AiJob } from '../lib/api'
import { searchDrugs, COMMON_FREQUENCIES } from '../lib/drugMaster'
import { searchIcd10 } from '../lib/icd10'
import type { RxTemplateItem } from '../lib/rxTemplates'
import { recordVitalsSnapshot } from '../lib/vitalsHistory'
import { getPrintLanguage, PRINT_LANGUAGES } from '../lib/printI18n'
import { exportPrescriptionPdf } from '../lib/pdfExport'
import { pushNotification } from '../lib/notifications'
import { useAuth } from '../auth/useAuth'

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

type ConsTab = 'soap' | 'vitals' | 'diagnosis' | 'rx'

const KEYWORD_RX: Array<{ kw: string[]; item: RxTemplateItem }> = [
  { kw: ['fever', 'cold', 'cough', 'flu'], item: { drugName: 'Paracetamol', genericName: 'Paracetamol', strength: '650 mg', form: 'Tablet', dosage: '650 mg', frequency: 'TDS', durationDays: 3, instructions: 'After food' } },
  { kw: ['allergy', 'sneez', 'itch'], item: { drugName: 'Levocet', genericName: 'Levocetirizine', strength: '5 mg', form: 'Tablet', dosage: '5 mg', frequency: 'OD', durationDays: 5, instructions: 'Night' } },
  { kw: ['diabet', 'sugar'], item: { drugName: 'Metformin', genericName: 'Metformin', strength: '500 mg', form: 'Tablet', dosage: '500 mg', frequency: 'BD', durationDays: 30, instructions: 'After meals' } },
  { kw: ['hypertens', 'bp', 'pressure'], item: { drugName: 'Amlodipine', genericName: 'Amlodipine', strength: '5 mg', form: 'Tablet', dosage: '5 mg', frequency: 'OD', durationDays: 30, instructions: 'Morning' } },
  { kw: ['gastritis', 'acidity', 'reflux', 'heartburn'], item: { drugName: 'Pan-D', genericName: 'Pantoprazole + Domperidone', strength: '40 mg', form: 'Capsule', dosage: '40 mg', frequency: 'OD', durationDays: 7, instructions: 'Empty stomach' } },
  { kw: ['pain', 'aches', 'sprain'], item: { drugName: 'Diclofenac', genericName: 'Diclofenac', strength: '50 mg', form: 'Tablet', dosage: '50 mg', frequency: 'BD', durationDays: 3, instructions: 'After food' } },
  { kw: ['infection', 'throat', 'tonsil'], item: { drugName: 'Azithral', genericName: 'Azithromycin', strength: '500 mg', form: 'Tablet', dosage: '500 mg', frequency: 'OD', durationDays: 3, instructions: 'Empty stomach' } },
]

export default function Consultation() {
  const { id } = useParams()
  const encounterId = id
  const { hasPermission } = useAuth()

  const canUpdateSoap = hasPermission('encounters:update')
  const canLock = hasPermission('encounters:lock')
  const canVitals = hasPermission('vitals:create')
  const canDiagnose = hasPermission('diagnoses:create')
  const canCreateRx = hasPermission('prescriptions:create')
  const canIssueRx = hasPermission('prescriptions:update')
  const canAiJob = hasPermission('ai_jobs:create')

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
  const [rxGeneric, setRxGeneric] = useState('')
  const [rxStrength, setRxStrength] = useState('')
  const [rxForm, setRxForm] = useState('')
  const [RxDosage, setRxDosage] = useState('')
  const [rxFrequency, setRxFrequency] = useState('')
  const [rxDuration, setRxDuration] = useState('')
  const [rxInstructions, setRxInstructions] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<RxTemplateItem[]>([])

  const [recordName, setRecordName] = useState('')
  const [recordText, setRecordText] = useState('')
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'reading' | 'ready' | 'error'>('idle')
  const [aiDraftReady, setAiDraftReady] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)

  const [activeTab, setActiveTab] = useState<ConsTab>('soap')
  const [showTemplates, setShowTemplates] = useState(false)
  const [printLang, setPrintLang] = useState('en')

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
      if (patient) {
        recordVitalsSnapshot(patient.id, {
          date: new Date().toISOString(),
          bpSystolic: num(vitalsDraft.bpSystolic),
          bpDiastolic: num(vitalsDraft.bpDiastolic),
          pulse: num(vitalsDraft.pulse),
          weightKg: num(vitalsDraft.weightKg),
        })
      }
      setVitalsDraft(emptyVitals)
      setShowVitalsForm(false)
      setEncounter(await getEncounter(encounter!.id))
      setNotice('Vitals recorded')
    })

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

  const ensureDraftRx = async (): Promise<Prescription | null> => {
    if (!encounter) return null
    const fresh = await listPrescriptionsByEncounter(encounter.id)
    let draft = fresh.find(r => r.status === 'draft')
    if (!draft) {
      await createPrescription({ encounterId: encounter.id, patientId: encounter.patientId })
      const next = await listPrescriptionsByEncounter(encounter.id)
      setRxList(next)
      draft = next.find(r => r.status === 'draft') ?? null
    } else {
      setRxList(fresh)
    }
    return draft
  }

  function duplicateMedicine(
    items: Prescription['items'],
    item: { drugName: string; strength?: string; form?: string; dosage: string; frequency: string },
  ): boolean {
    const norm = (s?: string) => (s ?? '').trim().toLowerCase()
    const key = `${norm(item.drugName)}|${norm(item.strength)}|${norm(item.form)}|${norm(item.dosage)}|${norm(item.frequency)}`
    return items.some(it =>
      `${norm(it.drugName)}|${norm(it.strength ?? undefined)}|${norm(it.form ?? undefined)}|${norm(it.dosage)}|${norm(it.frequency)}` === key,
    )
  }

  const appendRxItem = (item: Partial<RxTemplateItem> & { drugName: string; dosage: string; frequency: string }) =>
    run(async () => {
      const rx = await ensureDraftRx()
      if (!rx) return
      if (duplicateMedicine(rx.items, item)) {
        throw new Error(`"${item.drugName}" is already on this prescription.`)
      }
      await addPrescriptionItem(rx.id, {
        drugName: item.drugName.trim(),
        genericName: item.genericName?.trim() || undefined,
        strength: item.strength?.trim() || undefined,
        form: item.form?.trim().toLowerCase() || undefined,
        dosage: item.dosage.trim(),
        frequency: item.frequency.trim(),
        durationDays: item.durationDays != null ? Number(item.durationDays) : undefined,
        instructions: item.instructions?.trim() || undefined,
      })
      await refreshRx(encounter!.id)
    })

  const addCurrentRx = () =>
    appendRxItem({
      drugName: rxDrug, genericName: rxGeneric, strength: rxStrength, form: rxForm,
      dosage: RxDosage, frequency: rxFrequency, durationDays: rxDuration === '' ? undefined : Number(rxDuration), instructions: rxInstructions,
    })

  const applyTemplate = (items: RxTemplateItem[]) =>
    run(async () => {
      if (!items.length) return
      let rx = await ensureDraftRx()
      if (!rx) return
      let added = 0
      for (const it of items) {
        if (duplicateMedicine(rx.items, it)) continue
        const created = await addPrescriptionItem(rx.id, {
          drugName: it.drugName.trim(),
          genericName: it.genericName?.trim() || undefined,
          strength: it.strength?.trim() || undefined,
          form: it.form?.trim().toLowerCase() || undefined,
          dosage: it.dosage.trim(),
          frequency: it.frequency.trim(),
          durationDays: it.durationDays != null ? Number(it.durationDays) : undefined,
          instructions: it.instructions?.trim() || undefined,
        })
        rx = { ...rx, items: [...rx.items, created] }
        added++
      }
      await refreshRx(encounter!.id)
      setActiveTab('rx')
      setNotice(added ? `Added ${added} item${added > 1 ? 's' : ''} from template` : 'All template medicines are already on this prescription.')
    })

  const issuePrescription = () =>
    run(async () => {
      const rx = rxList.find(r => r.status === 'draft')
      if (!rx) return
      await updatePrescriptionStatus(rx.id, 'issued')
      await refreshRx(encounter!.id)
      pushNotification({ category: 'clinical', title: 'Prescription issued', body: `Prescription for ${encounter!.patientName} was issued.`, time: 'Just now', href: '/pharmacy' })
    }, 'Prescription issued')

  async function readHistoricalRecord(file: File) {
    if (!file.type.startsWith('image/')) {
      setOcrStatus('error')
      setRecordText('Please upload a JPG, PNG, or WEBP image of the historical record.')
      return
    }
    setRecordName(file.name)
    setOcrStatus('reading')
    try {
      const worker = await createWorker('eng')
      const result = await worker.recognize(file)
      await worker.terminate()
      setRecordText(result.data.text.trim())
      setOcrStatus('ready')
    } catch {
      setRecordText('We could not read this image. Please check the image quality or enter the history manually.')
      setOcrStatus('error')
    }
  }

  function prepareAiDraft() {
    if (!currentRx) startPrescription()
    setAiThinking(true)

    const payload = {
      encounterId: encounter!.id,
      context: {
        chiefComplaint,
        history: hpi,
        extractedText: recordText || undefined,
        patientAge: patient ? ageOf(patient.dateOfBirth) ?? undefined : undefined,
        patientGender: patient?.gender || undefined,
      },
      jobType: 'consultation',
    }

    createAiJob(payload)
      .then(async (job: AiJob) => {
        let result: AiJob['result'] = null
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 500))
          const poll = await getAiJob(job.id)
          if (poll.status === 'completed' || poll.status === 'failed') {
            result = poll.result
            break
          }
        }

        if (result) {
          if (result.soap.chiefComplaint && !chiefComplaint.trim()) setChiefComplaint(result.soap.chiefComplaint)
          if (result.soap.historyPresentIllness && !hpi.trim()) setHpi(result.soap.historyPresentIllness)
          if (result.soap.examinationFindings && !examination.trim()) setExamination(result.soap.examinationFindings)
          if (result.soap.clinicalNotes && !clinicalNotes.trim()) setClinicalNotes(result.soap.clinicalNotes)
          setDirty(true)
          setAiSuggestions(result.suggestions || [])
          setNotice(result.suggestions?.length
            ? `AI drafted notes and suggested ${result.suggestions.length} medicine${result.suggestions.length > 1 ? 's' : ''}. Review everything before issuing.`
            : 'AI drafted the clinical note. Review and add medicines as needed.')
        } else {
          fallbackKeywordDraft()
        }
      })
      .catch(() => {
        fallbackKeywordDraft()
      })
      .finally(() => {
        setAiThinking(false)
        setAiDraftReady(true)
        setActiveTab('rx')
      })
  }

  function fallbackKeywordDraft() {
    const context = `${chiefComplaint} ${hpi} ${recordText}`.toLowerCase()
    if (!chiefComplaint.trim()) {
      setChiefComplaint(recordText.trim().slice(0, 120) || 'Presenting complaint (auto-drafted, review needed)')
    }
    if (!hpi.trim()) {
      setHpi(recordText.trim()
        ? `History from uploaded record:\n${recordText.trim().slice(0, 400)}`
        : 'Onset and progression to be confirmed with patient.')
    }
    if (!examination.trim()) setExamination('General examination unremarkable. Systemic exam pending.')
    if (!clinicalNotes.trim()) setClinicalNotes('Assessment and plan to be finalised by the clinician.')
    setDirty(true)
    const matched = KEYWORD_RX.filter(k => k.kw.some(w => context.includes(w))).map(k => k.item)
    setAiSuggestions(matched)
  }

  function printPrescription() {
    if (!currentRx || currentRx.items.length === 0) return
    const lang = getPrintLanguage(printLang)
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) return
    const items = currentRx.items.map(item => `
      <tr>
        <td>${item.drugName}${item.strength ? ` ${item.strength}` : ''}</td>
        <td>${item.dosage}</td>
        <td>${item.frequency}</td>
        <td>${item.durationDays ? `${item.durationDays} ${lang.duration}` : '-'}</td>
        <td>${item.instructions ?? '-'}</td>
      </tr>`).join('')
    printWindow.document.write(`<!doctype html><html><head><title>${lang.header} - ${currentRx.patientName}</title><style>
      body{font-family:${printLang === 'en' ? 'Arial,sans-serif' : "'Noto Sans', Arial, sans-serif"};color:#10234a;margin:48px;line-height:1.5}header{display:flex;justify-content:space-between;border-bottom:2px solid #1265e8;padding-bottom:18px}h1{font-size:24px;margin:0}h2{font-size:18px;margin:28px 0 8px}p{margin:4px 0;color:#475569;font-size:13px}.meta{text-align:right}table{border-collapse:collapse;width:100%;margin-top:12px;font-size:13px}th,td{text-align:left;border-bottom:1px solid #e2e8f0;padding:11px 8px}th{background:#f6f9fc;color:#475569;font-size:11px;text-transform:uppercase}footer{border-top:1px solid #e2e8f0;margin-top:48px;padding-top:14px;color:#64748b;font-size:11px}@media print{body{margin:24px}}
    </style></head><body><header><div><h1>Jioplix</h1><p>${lang.header}</p></div><div class="meta"><p><strong>${lang.doctor}</strong><br>${encounter?.doctorName ?? currentRx.doctorName}</p><p>${new Date(currentRx.createdAt).toLocaleDateString()}</p></div></header>        <h2>${lang.patient}</h2><p><strong>${currentRx.patientName}</strong></p><p>${lang.prescription} · ${lang.date}: ${new Date(currentRx.createdAt).toLocaleDateString()}</p><h2>${lang.prescription}</h2><table><thead><tr><th>${lang.prescription}</th><th>${lang.dosage}</th><th>${lang.frequency}</th><th>${lang.duration}</th><th>${lang.instructions}</th></tr></thead><tbody>${items}</tbody></table><footer>${lang.footer}</footer></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const signAndClose = () =>
    run(async () => {
      await lockEncounter(encounter!.id)
      setEncounter(await getEncounter(encounter!.id))
      pushNotification({ category: 'clinical', title: 'Encounter signed', body: `Consultation for ${encounter!.patientName} was signed and closed.`, time: 'Just now' })
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

  const tabs: Array<{ key: ConsTab; label: string; icon: typeof FileText; badge?: number }> = [
    { key: 'soap', label: 'SOAP Notes', icon: ClipboardList },
    { key: 'vitals', label: 'Vitals', icon: Activity, badge: encounter?.vitals ? 1 : 0 },
    { key: 'diagnosis', label: 'Diagnosis', icon: FileText, badge: encounter?.diagnoses.length || 0 },
    { key: 'rx', label: 'Prescription', icon: Pill, badge: currentRx?.items.length || 0 },
  ]

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
                {canUpdateSoap && (
                  <Button variant="secondary" onClick={saveDraft} disabled={busy || !dirty}>
                    <Save className="w-4 h-4" /> Save Draft
                  </Button>
                )}
                {canLock && (
                  <Button onClick={signAndClose} disabled={busy || !canUpdateSoap}>
                    <CheckCircle2 className="w-4 h-4" /> Sign &amp; Close
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      {(notice || error) && (
        <div className={`rounded-xl px-4 py-3 text-[12px] font-medium border ${error ? 'bg-danger-50 border-danger-200 text-danger-700' : 'bg-success-50 border-success-200 text-success-700'}`}>
          {error ?? notice}
          <button className="ml-3 underline" onClick={() => { setError(null); setNotice(null) }}>dismiss</button>
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

            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 rounded-2xl p-5 text-white shadow-healthcare-lg opacity-90">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-[14px] font-semibold">AI Pre-Consult Summary</h3>
              </div>
              <p className="text-[12px] leading-relaxed text-white/90">
                Use “Draft with AI” to auto-fill a clinician-reviewed note from the documented context and extracted history. Nothing is issued automatically.
              </p>
              {aiDraftReady && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> AI draft ready — review in tabs
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary-600" /><h3 className="text-[14px] font-semibold text-surface-800">Historical Records</h3></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-600 bg-accent-50 border border-accent-100 rounded-md px-2 py-1">OCR</span>
              </div>
              <p className="text-[12px] leading-relaxed text-surface-500 mb-3">Upload an old report or prescription image to read it into this consultation for clinician review.</p>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary-200 bg-primary-50/50 px-3 py-3 text-[12px] font-semibold text-primary-700 hover:bg-primary-50">
                {ocrStatus === 'reading' ? 'Reading record…' : recordName || 'Choose record image'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void readHistoricalRecord(file) }} disabled={ocrStatus === 'reading'} />
              </label>
              {recordText && <textarea value={recordText} onChange={event => setRecordText(event.target.value)} rows={5} className="mt-3 w-full rounded-xl border border-surface-200 bg-surface-50 p-3 text-[12px] leading-5 text-surface-700 outline-none focus:border-primary-400" aria-label="Extracted historical record" />}
              {ocrStatus === 'ready' && <div className="mt-2 flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-success-600">OCR complete. Verify names, dates, medicines, and values.</p><button onClick={() => { setHpi(prev => `${prev}${prev.trim() ? '\n\n' : ''}Historical record (${recordName}):\n${recordText}`); setDirty(true); setNotice('Historical record added to the consultation draft.') }} className="whitespace-nowrap rounded-lg border border-success-200 bg-success-50 px-2.5 py-1.5 text-[11px] font-semibold text-success-700 hover:bg-success-100">Add to history</button></div>}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-1.5">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-all ${
                      activeTab === t.key ? 'bg-primary-600 text-white shadow-healthcare' : 'text-surface-500 hover:bg-surface-50'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                    {t.badge ? <span className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'}`}>{t.badge}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'soap' && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5 space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-surface-700 block mb-2">Chief Complaint</label>
                  <textarea value={chiefComplaint} disabled={!canUpdateSoap || locked} onChange={e => { setChiefComplaint(e.target.value); setDirty(true) }} placeholder="Presenting complaint and duration…" className={`${field} h-20`} />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-surface-700 block mb-2">History of Present Illness</label>
                  <textarea value={hpi} disabled={!canUpdateSoap || locked} onChange={e => { setHpi(e.target.value); setDirty(true) }} placeholder="Onset, progression, associated symptoms…" className={`${field} h-20`} />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-surface-700 block mb-2">Examination Notes</label>
                  <textarea value={examination} disabled={!canUpdateSoap || locked} onChange={e => { setExamination(e.target.value); setDirty(true) }} placeholder="General exam, systemic findings…" className={`${field} h-20`} />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-surface-700 block mb-2">Clinical Notes</label>
                  <textarea value={clinicalNotes} disabled={!canUpdateSoap || locked} onChange={e => { setClinicalNotes(e.target.value); setDirty(true) }} placeholder="Assessment, plan, advice…" className={`${field} h-16`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-surface-700 block mb-2"><CalendarClock className="w-3.5 h-3.5 inline mr-1" />Follow-up Date</label>
                    <input type="date" value={followUpDate} disabled={!canUpdateSoap || locked} onChange={e => { setFollowUpDate(e.target.value); setDirty(true) }} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-surface-700 block mb-2">Follow-up Notes</label>
                    <input value={followUpNotes} disabled={!canUpdateSoap || locked} onChange={e => { setFollowUpNotes(e.target.value); setDirty(true) }} placeholder="e.g. review HbA1c" className={inputCls} />
                  </div>
                </div>
                {!locked && canUpdateSoap && (
                  <div className="flex justify-end">
                    <Button onClick={saveDraft} disabled={busy || !dirty}><Save className="w-4 h-4" /> Save Notes</Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vitals' && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-surface-800">Vitals</h3>
                  {!locked && canVitals && !showVitalsForm && (
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
            )}

            {activeTab === 'diagnosis' && (
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
                {!locked && canDiagnose && (
                  <div className="space-y-2">
                    <Autocomplete
                      value={diagName}
                      onChange={v => setDiagName(v)}
                      placeholder="Search diagnosis or ICD-10 code…"
                      options={searchIcd10(diagName).map(d => ({
                        key: d.code,
                        primary: d.name,
                        secondary: `ICD-10: ${d.code}`,
                        onSelect: () => { setDiagName(d.name); setDiagCode(d.code) },
                      }))}
                    />
                    <div className="flex items-center gap-2">
                      <input className={`${inputCls} w-32`} placeholder="Code" value={diagCode} onChange={e => setDiagCode(e.target.value)} />
                      <select className={inputCls} value={diagType} onChange={e => setDiagType(e.target.value as typeof diagType)}>
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="differential">Differential</option>
                      </select>
                      <Button onClick={submitDiagnosis} disabled={busy}><Plus className="w-4 h-4" /> Add Diagnosis</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rx' && (
              <div className="bg-white rounded-2xl border border-surface-100 shadow-healthcare p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <label className="text-[13px] font-semibold text-surface-700">Prescription</label>
                  <div className="flex items-center gap-2">
                    {!locked && canCreateRx && (!currentRx || currentRx.status !== 'draft') && (
                      <Button size="sm" onClick={startPrescription} disabled={busy}><Pill className="w-4 h-4" /> {currentRx ? 'New Prescription' : 'Create'}</Button>
                    )}
                    {currentRx?.items.length ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg border border-surface-200 px-2 py-1">
                          <Languages className="w-3.5 h-3.5 text-surface-400" />
                          <select value={printLang} onChange={e => setPrintLang(e.target.value)} className="bg-transparent text-[11px] font-medium text-surface-600 focus:outline-none">
                            {PRINT_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                          </select>
                        </div>
                        <button onClick={printPrescription} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1.5 text-[11px] font-semibold text-surface-600 hover:bg-surface-50">
                          <Printer className="h-3.5 w-3.5" /> Print
                        </button>
                        <button onClick={() => exportPrescriptionPdf(currentRx, currentRx.items, printLang)} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1.5 text-[11px] font-semibold text-surface-600 hover:bg-surface-50">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </button>
                      </div>
                    ) : null}
                    {currentRx && (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
                        currentRx.status === 'issued' || currentRx.status === 'dispensed'
                          ? 'bg-success-50 text-success-700 border border-success-200'
                          : 'bg-warning-50 text-warning-700 border border-warning-200'
                      }`}>{currentRx.status}</span>
                    )}
                  </div>
                </div>

                {!locked && canAiJob && currentRx && (
                  <div className="mb-3 flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-start gap-3">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                      <div>
                        <p className="text-[12px] font-semibold text-primary-800">AI Prescription Assistant</p>
                        <p className="mt-0.5 text-[11px] leading-5 text-primary-700/75">Draft a clinician-reviewed note and get medicine suggestions from the documented context.</p>
                      </div>
                    </div>
                    <button onClick={prepareAiDraft} disabled={aiThinking || busy} className="whitespace-nowrap rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                      {aiThinking ? 'Drafting…' : aiDraftReady ? 'Re-draft' : 'Draft with AI'}
                    </button>
                  </div>
                )}

                {!locked && canCreateRx && currentRx && currentRx.status === 'draft' && (
                  <button onClick={() => setShowTemplates(true)} className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-accent-200 bg-accent-50 px-3 py-1.5 text-[12px] font-semibold text-accent-700 hover:bg-accent-100 transition-colors">
                    <Bookmark className="w-3.5 h-3.5" /> Apply Rx Template
                  </button>
                )}

                {!currentRx ? (
                  <div className="text-center py-4">
                    <p className="text-[13px] text-surface-500 mb-3">No prescription created for this encounter.</p>
                    {!locked && canCreateRx && <Button onClick={startPrescription} disabled={busy}><Pill className="w-4 h-4" /> Create Prescription</Button>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentRx.items.length > 0 && (
                      <div className="space-y-2">
                        {currentRx.items.map(it => (
                          <div key={it.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                            <Pill className="w-4 h-4 text-accent-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-[13px] font-semibold text-surface-800">{it.drugName}{it.strength ? ` ${it.strength}` : ''}{it.genericName ? <span className="text-[11px] font-normal text-surface-400"> · {it.genericName}</span> : null}</p>
                              <p className="text-[12px] text-surface-500">{it.dosage} · {it.frequency}{it.durationDays ? ` · ${it.durationDays} days` : ''}{it.instructions ? ` · ${it.instructions}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {canCreateRx && currentRx.status === 'draft' && aiSuggestions.length > 0 && (
                      <div className="rounded-xl border border-accent-200 bg-accent-50/50 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-accent-700"><Sparkles className="w-3.5 h-3.5" /> AI suggested medicines (review &amp; add)</p>
                        <div className="flex flex-wrap gap-2">
                          {aiSuggestions.map((s, i) => (
                            <button key={i} onClick={() => { appendRxItem(s); setAiSuggestions(prev => prev.filter((_, j) => j !== i)) }} className="rounded-lg border border-accent-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-surface-700 hover:border-accent-400">
                              + {s.drugName} {s.strength} · {s.frequency}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentRx.status === 'draft' && !locked && canCreateRx && (
                      <>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Autocomplete
                            value={rxDrug}
                            onChange={v => setRxDrug(v)}
                            placeholder="Drug name (brand or generic)…"
                            options={searchDrugs(rxDrug).map(d => ({
                              key: d.brand,
                              primary: `${d.brand} (${d.generic})`,
                              secondary: `${d.strength} · ${d.form} · ${d.category}`,
                              onSelect: () => {
                                setRxDrug(d.brand); setRxGeneric(d.generic); setRxStrength(d.strength); setRxForm(d.form)
                                if (!RxDosage) setRxDosage(d.commonDosages[0])
                                if (!rxFrequency) setRxFrequency(d.commonFrequencies[0])
                                if (!rxDuration) setRxDuration(String(d.commonDurations[0]))
                              },
                            }))}
                          />
                          <input className={inputCls} placeholder="Strength e.g. 500 mg" value={rxStrength} onChange={e => setRxStrength(e.target.value)} />
                          <input className={inputCls} placeholder="Form e.g. Tablet" value={rxForm} onChange={e => setRxForm(e.target.value)} />
                          <input className={inputCls} placeholder="Dosage e.g. 500mg" value={RxDosage} onChange={e => setRxDosage(e.target.value)} />
                          <Autocomplete
                            value={rxFrequency}
                            onChange={v => setRxFrequency(v)}
                            placeholder="Frequency e.g. BD"
                            options={COMMON_FREQUENCIES.map(f => ({ key: f, primary: f, onSelect: () => setRxFrequency(f) }))}
                          />
                          <input className={inputCls} placeholder="Days" value={rxDuration} onChange={e => setRxDuration(e.target.value)} inputMode="numeric" />
                          <input className={`${inputCls} sm:col-span-2`} placeholder="Instructions e.g. after food" value={rxInstructions} onChange={e => setRxInstructions(e.target.value)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-surface-400 inline-flex items-center gap-1"><ScanLine className="w-3 h-3" /> Generic names shown for transparency</span>
                          <Button onClick={addCurrentRx} disabled={busy}><Plus className="w-4 h-4" /> Add Medicine</Button>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="secondary" onClick={issuePrescription} disabled={busy || currentRx.items.length === 0 || !canIssueRx}>
                            <Ban className="w-4 h-4 rotate-180" /> Issue Prescription
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

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
      <RxTemplatePicker
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={applyTemplate}
        currentItems={[{ drugName: rxDrug, genericName: rxGeneric, strength: rxStrength, form: rxForm, dosage: RxDosage, frequency: rxFrequency, durationDays: rxDuration === '' ? undefined : Number(rxDuration), instructions: rxInstructions }]}
      />
    </div>
  )
}
