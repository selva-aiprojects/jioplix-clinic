// Production pre-flight check: run before any demo or stakeholder meeting.
// Usage: npm run preflight  (override targets with API_BASE / WEB_BASE env vars)
import { execSync } from 'node:child_process'

const API_BASE = process.env.API_BASE || 'https://jioplix-clinic-svc.onrender.com/api/v1'
const WEB_BASE = process.env.WEB_BASE || 'https://jioplix-clinic.vercel.app'
const DEMO_PW = 'demo1234'

let failed = 0
function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, body: json }
}

async function login(clinic, phone) {
  const r = await req('/auth/login', { method: 'POST', body: { clinic, phone, password: DEMO_PW } })
  if (r.status !== 200 || !r.body?.data) throw new Error(`login ${clinic}/${phone} -> ${r.status}`)
  return r.body.data
}

console.log(`API: ${API_BASE}\nWEB: ${WEB_BASE}\n`)

// 1. Liveness
for (const path of ['/healthz', '/readyz']) {
  const t0 = Date.now()
  const r = await req(path)
  report(`API ${path}`, r.status === 200, `${r.status} in ${Date.now() - t0}ms`)
}

// 2. Tenant + role matrix
const tenants = ['sunrise', 'nova', 'apex', 'medicore']
const matrix = [
  { role: 'receptionist', phone: '+919800000201', allow: ['/patients', '/invoices', '/inventory/items'], deny: [] },
  { role: 'doctor', phone: '+919800000101', allow: ['/patients', '/lab-orders', '/inventory/items'], deny: [] },
]
for (const slug of tenants) {
  for (const m of matrix) {
    try {
      const s = await login(slug, m.phone)
      let allOk = true
      const detail = []
      for (const p of [...m.allow.map((u) => [u, 200]), ...m.deny.map((u) => [u, 403])]) {
        const r = await req(p[0], { token: s.accessToken })
        if (r.status !== p[1]) {
          allOk = false
          detail.push(`${p[0]}->${r.status}`)
        }
      }
      report(`${slug} ${m.role}`, allOk, allOk ? `${s.user.permissions.length} perms` : detail.join(', '))
    } catch (e) {
      report(`${slug} ${m.role}`, false, e.message)
    }
  }
}

// 3. Restricted roles on nova only (matrix already covered elsewhere)
try {
  const ph = await login('nova', '+919800000202')
  const denied = await req('/patients', { token: ph.accessToken })
  const allowed = await req('/inventory/items', { token: ph.accessToken })
  report('nova pharmacist scope', denied.status === 403 && allowed.status === 200, `patients=${denied.status} inventory=${allowed.status}`)
} catch (e) {
  report('nova pharmacist scope', false, e.message)
}

// 4. Inventory stocked with demo drugs
for (const slug of tenants) {
  try {
    const s = await login(slug, '+919800000201')
    const inv = await req('/inventory/items', { token: s.accessToken })
    const n = Array.isArray(inv.body?.data) ? inv.body.data.length : 0
    report(`${slug} inventory stocked`, inv.status === 200 && n >= 20, `${n} items`)
  } catch (e) {
    report(`${slug} inventory stocked`, false, e.message)
  }
}

// 5. Frontend bundle is the current build
try {
  const html = await (await fetch(WEB_BASE)).text()
  const m = html.match(/src="(\/assets\/[^"]+\.js)"/)
  if (!m) throw new Error('no bundle script tag found')
  const js = await (await fetch(`${WEB_BASE}${m[1]}`)).text()
  report(
    'WEB sidebar gating build',
    js.includes('prescriptions:read') && js.includes('lab_orders:read'),
    m[1],
  )
  report('WEB api target', js.includes(new URL(API_BASE).host), '')
} catch (e) {
  report('WEB frontend', false, e.message)
}

console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
