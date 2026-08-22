import type { PoolConfig } from 'pg'

/**
 * pg >= 8.x treats sslmode=require/prefer as verify-full, rejecting
 * self-signed CAs (Aiven, local Docker certs). We honor strict modes
 * but default non-verify modes to TLS-without-CA-verification.
 */
export function pgConnectionOptions(connectionString?: string): Partial<PoolConfig> {
  if (!connectionString) return {}
  const url = new URL(connectionString)
  const mode = url.searchParams.get('sslmode')
  url.searchParams.delete('sslmode')
  if (mode === 'verify-ca' || mode === 'verify-full') {
    return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } }
  }
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } }
}
