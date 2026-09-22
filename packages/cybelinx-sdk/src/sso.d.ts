export interface SsoLaunchPayload {
    cybelinx_tenant_id: string;
    user_id: string;
    email: string;
    roles: string[];
    product_code?: string;
    iat?: number;
    exp?: number;
}
/**
 * Generates an HMAC-SHA256 signed SSO launch token with 24-hour expiration.
 */
export declare function generateSsoLaunchToken(payload: SsoLaunchPayload, secret: string): string;
/**
 * Verifies and decodes a Cybelinx SSO launch token.
 * Validates HMAC signature and expiration.
 */
export declare function verifySsoLaunchToken(token: string, secret: string): SsoLaunchPayload;
