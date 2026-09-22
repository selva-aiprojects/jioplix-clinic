export interface TenantContextOptions {
  tenantId: string
  tenantCode?: string
  schemaName: string
  entitlements?: string[]
}

export class CybelinxTenantContext {
  readonly tenantId: string
  readonly tenantCode: string
  readonly schemaName: string
  private readonly entitlements: Set<string>

  constructor(options: TenantContextOptions) {
    this.tenantId = options.tenantId
    this.tenantCode = options.tenantCode || options.tenantId
    this.schemaName = options.schemaName
    this.entitlements = new Set(options.entitlements || [])
  }

  hasEntitlement(feature: string): boolean {
    if (this.entitlements.has('*')) return true
    return this.entitlements.has(feature)
  }

  getSearchPathSql(): string {
    // Sanitizes schemaName to avoid SQL injection
    const cleanSchema = this.schemaName.replace(/[^a-zA-Z0-9_]/g, '')
    return `SET search_path TO "${cleanSchema}", public;`
  }
}

export function createTenantContext(options: TenantContextOptions): CybelinxTenantContext {
  return new CybelinxTenantContext(options)
}
