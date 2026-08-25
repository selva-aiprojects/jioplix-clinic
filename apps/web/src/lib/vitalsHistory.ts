export interface VitalsSnapshot {
  date: string
  bpSystolic?: number
  bpDiastolic?: number
  pulse?: number
  weightKg?: number
}

const STORAGE_KEY = 'jioplix.vitalsHistory.v1'

type Store = Record<string, VitalsSnapshot[]>

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function recordVitalsSnapshot(patientId: string, snap: VitalsSnapshot): void {
  if (!patientId) return
  const store = read()
  const list = store[patientId] ?? []
  const sameDay = list.find(l => l.date.slice(0, 10) === snap.date.slice(0, 10))
  if (sameDay) Object.assign(sameDay, snap)
  else list.push(snap)
  list.sort((a, b) => +new Date(a.date) - +new Date(b.date))
  store[patientId] = list
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* ignore */ }
}

export function getVitalsHistory(patientId: string): VitalsSnapshot[] {
  return read()[patientId] ?? []
}
