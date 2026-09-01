// Opt-in live OTP round-trip against the REAL configured provider.
//
//   node scripts/test-otp-live.mjs send <clinic> <phone> [--email|--supabase|--msg91]
//   node scripts/test-otp-live.mjs verify <clinic> <phone> <otp> [--email|--supabase|--msg91]
//
// Safety:
//   - Miss mode defaults to --email (the ₹0 channel). Paid SMS modes require
//     ALLOW_LIVE_SMS=true (a real SMS costs money).
//   - Forces DEMO_OTP_ENABLED=false so an allowlisted phone cannot mask
//     the live call — every request here goes to a real provider.
//   - CLI invocation boots/stops its own API on an isolated port (3110).
import { strict as assert } from 'node:assert'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3110
const BASE = `http://localhost:${PORT}/api/v1`

const FLAGS = ['--email', '--supabase', '--msg91']
const args = process.argv.slice(2)
const providerFlag = FLAGS.find((f) => args.includes(f))
const positions = args.filter((a) => !FLAGS.includes(a))
const [action, clinic, phone, otp] = positions

async function main() {
  if (!['send', 'verify'].includes(action) || !clinic || !phone || (action === 'verify' && !otp)) {
    console.error('usage: node scripts/test-otp-live.mjs send <clinic> <phone> [provider] | verify <clinic> <phone> <otp> [provider]')
    console.error('       provider = --email (default, ₹0) | --supabase | --msg91 (paid SMS: ALLOW_LIVE_SMS=true)')
    process.exit(1)
  }
  if (providerFlag && providerFlag !== '--email' && process.env.ALLOW_LIVE_SMS !== 'true') {
    console.error('Refusing to send a real SMS.\nSet ALLOW_LIVE_SMS=true when you intend to spend real SMS credits.')
    process.exit(1)
  }

  const env = loadEnv()
  const hasMsg91 = !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID)
  const hasSupabase = !!(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY))
  assert.ok(env.DATABASE_URL, 'DATABASE_URL missing in .env')

  let mode = providerFlag ? providerFlag.slice(2) : 'email'
  if (mode === 'msg91') assert.ok(hasMsg91, '--msg91 requested but MSG91_AUTH_KEY+MSG91_TEMPLATE_ID missing in .env')
  if (mode === 'supabase') assert.ok(hasSupabase, '--supabase requested but SUPABASE_URL/key missing in .env')

  console.log(`\nLive provider: ${mode} — ${phone} @ ${clinic}\n`)

  // Pin the chosen provider in the spawned API: blank the other channels'
  // env so selection stays deterministic and emails never hit RESEND here.
  const supabaseVars = mode !== 'supabase' ? { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' } : {}
  const msg91Vars = mode !== 'msg91' ? { MSG91_AUTH_KEY: '', MSG91_TEMPLATE_ID: '' } : {}
  const emailVars = mode !== 'email' ? { RESEND_API_KEY: '' } : {}

  const api = spawn('node', ['dist/main.js'], {
    cwd: join(root, 'apps', 'api'),
    env: {
      ...process.env,
      DATABASE_URL: env.DATABASE_URL,
      PORT: String(PORT),
      DEMO_OTP_ENABLED: 'false',
      OTP_DELIVERY: mode,
      ...supabaseVars,
      ...msg91Vars,
      ...emailVars,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  api.stdout.on('data', (b) => { log += b.toString() })
  api.stderr.on('data', (b) => { log += b.toString() })

  try {
    if (!(await waitUp(`${BASE}/healthz`))) throw new Error('API failed to boot on port 3110')
    await new Promise((r) => setTimeout(r, 800))

    const body = action === 'send' ? { clinic, phone } : { clinic, phone, otp }
    const res = await fetch(`${BASE}/auth/${action === 'send' ? 'send-otp' : 'verify-otp'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)

    if (action === 'send') {
      assert.equal(res.status, 200, `send-otp status ${res.status}: ${JSON.stringify(data)}`)
      assert.equal(data?.data?.demoCode, undefined, 'live send must NEVER return a demoCode')
      console.log(`SENT: ${data?.data?.message} (expires ${data?.data?.expiresIn}s)`)
      console.log('Now run: node scripts/test-otp-live.mjs verify <clinic> <phone> <otp-from-phone>')
    } else {
      assert.equal(res.status, 200, `verify-otp status ${res.status}: ${JSON.stringify(data)}`)
      console.log(`VERIFIED: accessToken=${!!data?.data?.accessToken} user=${data?.data?.user?.phone}`)
      console.log('  OK — live provider confirmed end-to-end.')
    }
  } finally {
    api.kill()
  }
}

function loadEnv() {
  const path = join(root, '.env')
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}

async function waitUp(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return true
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})