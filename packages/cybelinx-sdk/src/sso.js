import crypto from 'crypto';
import { Buffer } from 'buffer';
function base64UrlEncode(data) {
    return Buffer.from(data).toString('base64url');
}
function base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf8');
}
/**
 * Generates an HMAC-SHA256 signed SSO launch token with 24-hour expiration.
 */
export function generateSsoLaunchToken(payload, secret) {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: payload.iat ?? now,
        exp: payload.exp ?? now + 24 * 3600,
    };
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(fullPayload));
    const unsigned = `${header}.${body}`;
    const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
    return `${unsigned}.${signature}`;
}
/**
 * Verifies and decodes a Cybelinx SSO launch token.
 * Validates HMAC signature and expiration.
 */
export function verifySsoLaunchToken(token, secret) {
    if (!token || typeof token !== 'string') {
        throw new Error('TOKEN_MISSING');
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('TOKEN_MALFORMED');
    }
    const [headerB64, bodyB64, signature] = parts;
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${bodyB64}`)
        .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        throw new Error('TOKEN_INVALID_SIGNATURE');
    }
    const payload = JSON.parse(base64UrlDecode(bodyB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
        throw new Error('TOKEN_EXPIRED');
    }
    return payload;
}
