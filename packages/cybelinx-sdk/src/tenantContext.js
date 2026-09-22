export class CybelinxTenantContext {
    tenantId;
    tenantCode;
    schemaName;
    entitlements;
    constructor(options) {
        this.tenantId = options.tenantId;
        this.tenantCode = options.tenantCode || options.tenantId;
        this.schemaName = options.schemaName;
        this.entitlements = new Set(options.entitlements || []);
    }
    hasEntitlement(feature) {
        if (this.entitlements.has('*'))
            return true;
        return this.entitlements.has(feature);
    }
    getSearchPathSql() {
        // Sanitizes schemaName to avoid SQL injection
        const cleanSchema = this.schemaName.replace(/[^a-zA-Z0-9_]/g, '');
        return `SET search_path TO "${cleanSchema}", public;`;
    }
}
export function createTenantContext(options) {
    return new CybelinxTenantContext(options);
}
