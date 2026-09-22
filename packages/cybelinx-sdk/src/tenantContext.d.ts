export interface TenantContextOptions {
    tenantId: string;
    tenantCode?: string;
    schemaName: string;
    entitlements?: string[];
}
export declare class CybelinxTenantContext {
    readonly tenantId: string;
    readonly tenantCode: string;
    readonly schemaName: string;
    private readonly entitlements;
    constructor(options: TenantContextOptions);
    hasEntitlement(feature: string): boolean;
    getSearchPathSql(): string;
}
export declare function createTenantContext(options: TenantContextOptions): CybelinxTenantContext;
