import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DbService, type TenantDb } from '../db/db.service.js'
import { newId } from '@jioplix/contracts'
import type { InvoiceCreate, PaymentCreate } from '@jioplix/contracts'
import {
  invoices,
  invoiceLines,
  payments,
  patients,
  users,
  branches,
} from '../db/schema/tenant.js'

export interface InvoiceLineView {
  id: string
  itemType: string
  itemName: string
  hsnCode: string | null
  quantity: number
  unitPricePaise: number
  lineTotalPaise: number
  cgstRate: number
  sgstRate: number
  igstRate: number
}

export interface InvoiceView {
  id: string
  invoiceNo: string
  encounterId: string | null
  appointmentId: string | null
  patientId: string
  patientName: string
  branchId: string
  subTotalPaise: number
  discountPaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  roundOffPaise: number
  totalPaise: number
  paidPaise: number
  balancePaise: number
  status: string
  issuedAt: string | null
  lines: InvoiceLineView[]
  payments: PaymentView[]
  createdAt: string
  updatedAt: string
}

export interface PaymentView {
  id: string
  invoiceId: string
  amountPaise: number
  mode: string
  reference: string | null
  receivedBy: string
  receivedAt: string
  notes: string | null
}

@Injectable()
export class BillingService {
  constructor(private readonly db: DbService) {}

  private async generateInvoiceNo(tx: TenantDb, branchId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const [row] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(eq(invoices.branchId, branchId), sql`date(${invoices.createdAt}) = CURRENT_DATE`))
    const seq = String(Number(row?.count ?? 0) + 1).padStart(3, '0')
    return `INV-${today}-${seq}`
  }

  async createInvoice(schemaName: string, input: InvoiceCreate, actorUserId: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [patient] = await db.select().from(patients).where(eq(patients.id, input.patientId)).limit(1)
      if (!patient) throw new NotFoundException('PATIENT_NOT_FOUND')

      const [branch] = await db.select().from(branches).orderBy(branches.createdAt).limit(1)
      if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND')

      const invoiceNo = await this.generateInvoiceNo(db, branch.id)

      let subTotal = 0
      let cgst = 0
      let sgst = 0
      let igst = 0

      const lines = input.lines.map((l) => {
        const lineTotal = l.quantity * l.unitPricePaise
        const cgstAmt = Math.round((lineTotal * l.cgstRate) / 100)
        const sgstAmt = Math.round((lineTotal * l.sgstRate) / 100)
        const igstAmt = Math.round((lineTotal * l.igstRate) / 100)
        subTotal += lineTotal
        cgst += cgstAmt
        sgst += sgstAmt
        igst += igstAmt
        return {
          itemType: l.itemType,
          itemName: l.itemName,
          hsnCode: l.hsnCode ?? null,
          quantity: l.quantity,
          unitPricePaise: l.unitPricePaise,
          lineTotalPaise: lineTotal,
          cgstRate: l.cgstRate,
          sgstRate: l.sgstRate,
          igstRate: l.igstRate,
        }
      })

      const discount = input.discountPaise ?? 0
      const total = subTotal + cgst + sgst + igst - discount
      const rem = ((total % 100) + 100) % 100
      const roundOff = rem > 50 ? 100 - rem : -rem
      const finalTotal = total + roundOff

      const [inv] = await db
        .insert(invoices)
        .values({
          id: newId(),
          invoiceNo,
          encounterId: input.encounterId ?? null,
          appointmentId: input.appointmentId ?? null,
          patientId: input.patientId,
          branchId: branch.id,
          subTotalPaise: subTotal,
          discountPaise: discount,
          cgstPaise: cgst,
          sgstPaise: sgst,
          igstPaise: igst,
          roundOffPaise: roundOff,
          totalPaise: finalTotal,
          balancePaise: finalTotal,
          status: 'issued',
          issuedAt: new Date(),
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning()

      const insertedLines: InvoiceLineView[] = []
      for (const l of lines) {
        const [line] = await db
          .insert(invoiceLines)
          .values({
            id: newId(),
            invoiceId: inv.id,
            ...l,
            sequence: insertedLines.length,
          })
          .returning()
        insertedLines.push({
          id: line.id,
          itemType: line.itemType,
          itemName: line.itemName,
          hsnCode: line.hsnCode,
          quantity: line.quantity,
          unitPricePaise: line.unitPricePaise,
          lineTotalPaise: line.lineTotalPaise,
          cgstRate: line.cgstRate ?? 0,
          sgstRate: line.sgstRate ?? 0,
          igstRate: line.igstRate ?? 0,
        })
      }

      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        encounterId: inv.encounterId,
        appointmentId: inv.appointmentId,
        patientId: inv.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        branchId: inv.branchId,
        subTotalPaise: inv.subTotalPaise,
        discountPaise: inv.discountPaise,
        cgstPaise: inv.cgstPaise,
        sgstPaise: inv.sgstPaise,
        igstPaise: inv.igstPaise,
        roundOffPaise: inv.roundOffPaise,
        totalPaise: inv.totalPaise,
        paidPaise: inv.paidPaise,
        balancePaise: inv.balancePaise,
        status: inv.status,
        issuedAt: inv.issuedAt?.toISOString() ?? null,
        lines: insertedLines,
        payments: [],
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      }
    })
  }

  async findInvoiceById(schemaName: string, id: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
      if (!inv) return null

      const [patient] = await db
        .select({ firstName: patients.firstName, lastName: patients.lastName })
        .from(patients)
        .where(eq(patients.id, inv.patientId))
        .limit(1)

      const lineRows = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id))
      const lines: InvoiceLineView[] = lineRows.map((l) => ({
        id: l.id,
        itemType: l.itemType,
        itemName: l.itemName,
        hsnCode: l.hsnCode,
        quantity: l.quantity,
        unitPricePaise: l.unitPricePaise,
        lineTotalPaise: l.lineTotalPaise,
        cgstRate: l.cgstRate ?? 0,
        sgstRate: l.sgstRate ?? 0,
        igstRate: l.igstRate ?? 0,
      }))

      const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, id))
      const paymentViews: PaymentView[] = paymentRows.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        amountPaise: p.amountPaise,
        mode: p.mode,
        reference: p.reference,
        receivedBy: p.receivedBy,
        receivedAt: p.receivedAt.toISOString(),
        notes: p.notes,
      }))

      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        encounterId: inv.encounterId,
        appointmentId: inv.appointmentId,
        patientId: inv.patientId,
        patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
        branchId: inv.branchId,
        subTotalPaise: inv.subTotalPaise,
        discountPaise: inv.discountPaise,
        cgstPaise: inv.cgstPaise,
        sgstPaise: inv.sgstPaise,
        igstPaise: inv.igstPaise,
        roundOffPaise: inv.roundOffPaise,
        totalPaise: inv.totalPaise,
        paidPaise: inv.paidPaise,
        balancePaise: inv.balancePaise,
        status: inv.status,
        issuedAt: inv.issuedAt?.toISOString() ?? null,
        lines,
        payments: paymentViews,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      }
    })
  }

  async updateInvoice(schemaName: string, id: string, patch: Partial<InvoiceCreate>) {
    return this.db.withTenant(schemaName, async (db) => {
      const [current] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
      if (!current) throw new NotFoundException('INVOICE_NOT_FOUND')
      if (current.status === 'void' || current.status === 'refunded') {
        throw new BadRequestException('INVOICE_CLOSED')
      }

      const [row] = await db
        .update(invoices)
        .set({
          ...(patch.discountPaise !== undefined && { discountPaise: patch.discountPaise }),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id))
        .returning()

      return { id: row.id, updatedAt: row.updatedAt.toISOString() }
    })
  }

  async addPayment(schemaName: string, invoiceId: string, input: PaymentCreate, actorUserId: string) {
    return this.db.withTenant(schemaName, async (tx) => {
      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
      if (!inv) throw new NotFoundException('INVOICE_NOT_FOUND')
      if (inv.status === 'void' || inv.status === 'refunded') throw new BadRequestException('INVOICE_CLOSED')
      if (input.invoiceId !== invoiceId) throw new BadRequestException('VALIDATION_FAILED')

      const [user] = await tx.select().from(users).where(eq(users.id, actorUserId)).limit(1)
      if (!user) throw new NotFoundException('USER_NOT_FOUND')

      await tx.insert(payments).values({
        id: newId(),
        invoiceId,
        amountPaise: input.amountPaise,
        mode: input.mode,
        reference: input.reference ?? null,
        receivedBy: actorUserId,
        notes: input.notes ?? null,
      })

      const newPaid = inv.paidPaise + input.amountPaise
      const newBalance = inv.totalPaise - newPaid
      const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'issued'

      const [updated] = await tx
        .update(invoices)
        .set({ paidPaise: newPaid, balancePaise: newBalance, status: newStatus, updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId))
        .returning()

      return {
        id: updated.id,
        paidPaise: updated.paidPaise,
        balancePaise: updated.balancePaise,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      }
    })
  }

  async listInvoices(schemaName: string, filters: { patientId?: string; status?: string }) {
    return this.db.withTenant(schemaName, async (db) => {
      const conditions = []
      if (filters.patientId) conditions.push(eq(invoices.patientId, filters.patientId))
      if (filters.status) {
        const allowed = ['draft', 'issued', 'partial', 'paid', 'void', 'refunded'] as const
        const s = filters.status as (typeof allowed)[number]
        conditions.push(eq(invoices.status, s))
      }

      const rows = await db
        .select({
          id: invoices.id,
          invoiceNo: invoices.invoiceNo,
          patientId: invoices.patientId,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          totalPaise: invoices.totalPaise,
          paidPaise: invoices.paidPaise,
          balancePaise: invoices.balancePaise,
          status: invoices.status,
          issuedAt: invoices.issuedAt,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(50)

      return rows.map((r) => ({
        id: r.id,
        invoiceNo: r.invoiceNo,
        patientId: r.patientId,
        patientName: `${r.patientFirstName} ${r.patientLastName}`,
        totalPaise: r.totalPaise,
        paidPaise: r.paidPaise,
        balancePaise: r.balancePaise,
        status: r.status,
        issuedAt: r.issuedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }))
    })
  }

  async getOutstanding(schemaName: string, patientId: string) {
    return this.db.withTenant(schemaName, async (db) => {
      const [row] = await db
        .select({ total: sql<number>`sum(${invoices.balancePaise})` })
        .from(invoices)
        .where(and(eq(invoices.patientId, patientId), sql`${invoices.balancePaise} > 0`))
      return { patientId, outstandingPaise: Number(row?.total ?? 0) }
    })
  }
}
