import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Patient, PatientEncounterSummary, Prescription, PrescriptionItem, Invoice } from './api'
import type { VitalsSnapshot } from './vitalsHistory'
import { getPrintLanguage, type PrintLanguage } from './printI18n'

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function getLastTableY(doc: jsPDF): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? 0
}

function addHeader(doc: jsPDF, title: string) {
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(18, 101, 232)
  doc.text('Jioplix', 14, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Clinic OS', 14, 26)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(title, 14, 40)

  doc.setDrawColor(18, 101, 232)
  doc.setLineWidth(0.5)
  doc.line(14, 43, 196, 43)

  return 50
}

function addFooter(doc: jsPDF, text: string) {
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(14, pageHeight - 18, 196, pageHeight - 18)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(text, 14, pageHeight - 12)
  doc.text(new Date().toLocaleDateString('en-IN'), 196, pageHeight - 12, { align: 'right' })
}

function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage()
    return 20
  }
  return y
}

// ─── Patient Health Summary PDF ─────────────────────────────────────────────

export function exportPatientSummaryPdf(
  patient: Patient,
  encounters: PatientEncounterSummary[],
  vitalsHistory: VitalsSnapshot[],
  prescriptions: Prescription[],
) {
  const doc = new jsPDF()
  const age = patient.dateOfBirth
    ? Math.max(0, Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : null

  let y = addHeader(doc, 'Patient Health Summary')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Patient Information', 14, y)
  y += 7

  const infoData: [string, string][] = [
    ['Name', `${patient.firstName} ${patient.lastName}`],
    ['MRN', patient.mrn],
    ['Age', age !== null ? `${age} years` : 'N/A'],
    ['Gender', patient.gender || 'N/A'],
    ['Phone', patient.phone || 'N/A'],
    ['Blood Group', patient.bloodGroup || 'N/A'],
  ]
  if (patient.abhaNumber) infoData.push(['ABHA', patient.abhaNumber])
  if (patient.email) infoData.push(['Email', patient.email])
  if (patient.address) {
    const addr = Object.values(patient.address).filter(Boolean).join(', ')
    if (addr) infoData.push(['Address', addr])
  }

  autoTable(doc, {
    startY: y,
    head: [],
    body: infoData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 116, 139] },
    },
    margin: { left: 14, right: 14 },
  })
  y = getLastTableY(doc) + 10

  if (vitalsHistory.length > 0) {
    y = ensurePageSpace(doc, y, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Vitals Summary (Latest)', 14, y)
    y += 7

    const latest = vitalsHistory[vitalsHistory.length - 1]
    const vitalsData: [string, string][] = []
    if (latest.bpSystolic != null && latest.bpDiastolic != null)
      vitalsData.push(['Blood Pressure', `${latest.bpSystolic}/${latest.bpDiastolic} mmHg`])
    if (latest.pulse != null) vitalsData.push(['Pulse', `${latest.pulse} bpm`])
    if (latest.weightKg != null) vitalsData.push(['Weight', `${latest.weightKg} kg`])

    if (vitalsData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [],
        body: vitalsData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 116, 139] },
        },
        margin: { left: 14, right: 14 },
      })
      y = getLastTableY(doc) + 10
    }
  }

  if (encounters.length > 0) {
    y = ensurePageSpace(doc, y, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Encounter Timeline', 14, y)
    y += 7

    const encData = encounters.slice(0, 10).map(e => [
      e.encounterDate,
      e.doctorName,
      e.diagnoses.map(d => d.icd10Name).join(', ') || '—',
      e.isLocked ? 'Signed' : 'Open',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Doctor', 'Diagnosis', 'Status']],
      body: encData,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [18, 101, 232], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })
    y = getLastTableY(doc) + 10
  }

  if (prescriptions.length > 0) {
    y = ensurePageSpace(doc, y, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Recent Prescriptions', 14, y)
    y += 7

    const rxData = prescriptions.slice(0, 5).flatMap(rx =>
      rx.items.map(item => [
        rx.createdAt.slice(0, 10),
        item.drugName + (item.strength ? ` ${item.strength}` : ''),
        item.dosage,
        item.frequency,
        item.durationDays ? `${item.durationDays} days` : '—',
      ]),
    )

    if (rxData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Drug', 'Dosage', 'Frequency', 'Duration']],
        body: rxData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [18, 101, 232], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })
      y = getLastTableY(doc) + 10
    }
  }

  addFooter(doc, 'Generated by Jioplix Clinic OS')
  doc.save(`patient-summary-${patient.mrn || patient.id}.pdf`)
}

// ─── Invoice PDF (GST) ─────────────────────────────────────────────────────

export function exportInvoicePdf(invoice: Invoice) {
  const doc = new jsPDF()
  let y = addHeader(doc, 'GST Invoice')

  const dateStr = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${dateStr}`, 14, y + 6)
  doc.text(`Patient: ${invoice.patientName}`, 14, y + 12)
  y += 20

  const lineData = invoice.lines.map(line => [
    line.itemName,
    String(line.quantity),
    formatPaise(line.unitPricePaise),
    line.hsnCode || '—',
    formatPaise(line.lineTotalPaise),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Unit Price', 'HSN', 'Total']],
    body: lineData,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [18, 101, 232], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  })
  y = getLastTableY(doc) + 10

  y = ensurePageSpace(doc, y, 60)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)

  const rows: [string, string][] = [
    ['Sub Total', formatPaise(invoice.subTotalPaise)],
  ]
  if (invoice.discountPaise > 0) rows.push(['Discount', `- ${formatPaise(invoice.discountPaise)}`])
  if (invoice.cgstPaise > 0) rows.push(['CGST', formatPaise(invoice.cgstPaise)])
  if (invoice.sgstPaise > 0) rows.push(['SGST', formatPaise(invoice.sgstPaise)])
  if (invoice.igstPaise > 0) rows.push(['IGST', formatPaise(invoice.igstPaise)])
  if (invoice.roundOffPaise !== 0) rows.push(['Rounding', formatPaise(invoice.roundOffPaise)])
  rows.push(['Total', formatPaise(invoice.totalPaise)])
  rows.push(['Paid', formatPaise(invoice.paidPaise)])
  rows.push(['Balance Due', formatPaise(invoice.balancePaise)])

  autoTable(doc, {
    startY: y,
    head: [],
    body: rows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 120, right: 14 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 116, 139] },
      1: { halign: 'right', textColor: [30, 41, 59] },
    },
  })
  y = getLastTableY(doc) + 8

  if (invoice.roundOffPaise !== 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(148, 163, 184)
    doc.text('Amounts rounded using banker\'s rounding (to nearest even) per GST rules.', 14, y)
    y += 8
  }

  if (invoice.payments.length > 0) {
    y = ensurePageSpace(doc, y, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Payment History', 14, y)
    y += 7

    const payData = invoice.payments.map(p => [
      new Date(p.receivedAt).toLocaleDateString('en-IN'),
      p.mode.toUpperCase(),
      formatPaise(p.amountPaise),
      p.reference || '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Mode', 'Amount', 'Reference']],
      body: payData,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [18, 101, 232], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })
  }

  addFooter(doc, 'Generated by Jioplix Clinic OS')
  doc.save(`invoice-${invoice.invoiceNo}.pdf`)
}

// ─── Prescription PDF ──────────────────────────────────────────────────────

export function exportPrescriptionPdf(
  prescription: Prescription,
  items: PrescriptionItem[],
  language: string,
) {
  const doc = new jsPDF()
  const lang: PrintLanguage = getPrintLanguage(language)

  let y = 20

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(18, 101, 232)
  doc.text('Jioplix', 14, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Clinic OS', 14, y + 6)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(lang.header, 196, y, { align: 'right' })

  y += 14
  doc.setDrawColor(18, 101, 232)
  doc.setLineWidth(0.5)
  doc.line(14, y, 196, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`${lang.doctor}: ${prescription.doctorName}`, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${lang.date}: ${new Date(prescription.createdAt).toLocaleDateString()}`, 196, y, { align: 'right' })
  y += 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`${lang.patient}: ${prescription.patientName}`, 14, y)
  y += 10

  if (items.length > 0) {
    const bodyData = items.map(item => [
      `${item.drugName}${item.strength ? ` ${item.strength}` : ''}${item.genericName ? ` (${item.genericName})` : ''}`,
      item.dosage,
      item.frequency,
      item.durationDays ? `${item.durationDays} ${lang.duration}` : '—',
      item.instructions || '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [[lang.prescription, lang.dosage, lang.frequency, lang.duration, lang.instructions]],
      body: bodyData,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [18, 101, 232], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 50 },
        4: { cellWidth: 45 },
      },
    })
    y = getLastTableY(doc) + 12
  }

  y = ensurePageSpace(doc, y, 30)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`${lang.advice}:`, 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const advice = prescription.notes || 'Follow the prescribed dosage and timing.'
  const adviceLines = doc.splitTextToSize(advice, 182)
  doc.text(adviceLines, 14, y)
  y += adviceLines.length * 5 + 12

  y = ensurePageSpace(doc, y, 30)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.line(130, y + 20, 196, y + 20)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(prescription.doctorName, 163, y + 25, { align: 'center' })
  doc.text('Doctor Signature', 163, y + 30, { align: 'center' })

  addFooter(doc, lang.footer)
  doc.save(`prescription-${prescription.patientName.replace(/\s+/g, '-')}-${new Date(prescription.createdAt).toISOString().slice(0, 10)}.pdf`)
}
