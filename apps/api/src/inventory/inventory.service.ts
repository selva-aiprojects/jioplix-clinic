import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { newId } from '@jioplix/contracts'
import type { InventoryCategory, InventoryItemCreate, StockMovementCreate } from '@jioplix/contracts'
import { DbService, type TenantTx } from '../db/db.service.js'
import { inventoryItems, stockMovements } from '../db/schema/tenant.js'

export interface InventoryItemView {
  id: string
  name: string
  category: InventoryCategory
  unit: string
  quantity: number
  reorderLevel: number
  unitPricePaise: number
  supplier: string | null
  batchNo: string | null
  expiryDate: string | null
}

@Injectable()
export class InventoryService {
  constructor(private readonly db: DbService) {}

  async list(
    schemaName: string,
    filters: { category?: string; search?: string },
  ): Promise<InventoryItemView[]> {
    return this.db.withTenant(schemaName, async (db) => {
      const conditions = []
      if (filters.category) {
        conditions.push(
          eq(inventoryItems.category, filters.category as typeof inventoryItems.$inferSelect['category']),
        )
      }
      if (filters.search) conditions.push(ilike(inventoryItems.name, `%${filters.search}%`))

      const rows = await db
        .select()
        .from(inventoryItems)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(inventoryItems.name))

      return rows.map((r) => this.toView(r))
    })
  }

  async create(schemaName: string, input: InventoryItemCreate): Promise<InventoryItemView> {
    return this.db.withTenant(schemaName, async (db) =>
      db.transaction(async (tx) => {
        const id = newId()
        const [row] = await tx
          .insert(inventoryItems)
          .values({
            id,
            name: input.name,
            category: input.category,
            unit: input.unit,
            quantity: input.quantity,
            reorderLevel: input.reorderLevel,
            unitPricePaise: input.unitPricePaise,
            supplier: input.supplier ?? null,
            batchNo: input.batchNo ?? null,
            expiryDate: input.expiryDate ?? null,
          })
          .returning()

        if (input.quantity > 0) {
          await this.insertMovement(tx, {
            itemId: row.id,
            delta: input.quantity,
            reason: 'purchase',
            notes: 'Opening stock',
            createdBy: null,
          })
        }
        return this.toView(row)
      }),
    )
  }

  async moveStock(
    schemaName: string,
    itemId: string,
    input: StockMovementCreate,
    actorUserId: string,
  ): Promise<InventoryItemView> {
    if (input.delta === 0) throw new BadRequestException('VALIDATION_FAILED')
    return this.db.withTenant(schemaName, async (db) =>
      db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, itemId))
          .limit(1)
        if (!current) throw new NotFoundException('ITEM_NOT_FOUND')

        const nextQty = current.quantity + input.delta
        if (nextQty < 0) throw new BadRequestException('INSUFFICIENT_STOCK')

        const [updated] = await tx
          .update(inventoryItems)
          .set({ quantity: nextQty, updatedAt: new Date() })
          .where(eq(inventoryItems.id, itemId))
          .returning()

        await this.insertMovement(tx, {
          itemId,
          delta: input.delta,
          reason: input.reason,
          notes: input.notes ?? null,
          createdBy: actorUserId,
        })

        return this.toView(updated)
      }),
    )
  }

  async recentMovements(schemaName: string, limit = 20): Promise<
    { id: string; itemName: string; delta: number; reason: string; notes: string | null; createdAt: Date }[]
  > {
    return this.db.withTenant(schemaName, async (db) => {
      const rows = await db
        .select({
          id: stockMovements.id,
          itemName: inventoryItems.name,
          delta: stockMovements.delta,
          reason: stockMovements.reason,
          notes: stockMovements.notes,
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .innerJoin(inventoryItems, eq(stockMovements.itemId, inventoryItems.id))
        .orderBy(sql`${stockMovements.createdAt} DESC`)
        .limit(limit)

      return rows
    })
  }

  private insertMovement(
    tx: TenantTx,
    values: {
      itemId: string
      delta: number
      reason: string
      notes: string | null
      createdBy: string | null
    },
  ) {
    return tx.insert(stockMovements).values({
      id: newId(),
      itemId: values.itemId,
      delta: values.delta,
      reason: values.reason as 'purchase',
      notes: values.notes,
      createdBy: values.createdBy,
    })
  }

  private toView(r: typeof inventoryItems.$inferSelect): InventoryItemView {
    return {
      id: r.id,
      name: r.name,
      category: r.category as InventoryCategory,
      unit: r.unit,
      quantity: r.quantity,
      reorderLevel: r.reorderLevel,
      unitPricePaise: Number(r.unitPricePaise),
      supplier: r.supplier,
      batchNo: r.batchNo,
      expiryDate: r.expiryDate ?? null,
    }
  }
}
