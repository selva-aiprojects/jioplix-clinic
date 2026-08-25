import { useMemo, useState } from 'react'
import { X, Plus, Bookmark, Trash2, Check } from 'lucide-react'
import {
  listRxTemplates, saveRxTemplate, deleteRxTemplate,
} from '../lib/rxTemplates'
import type { RxTemplate, RxTemplateItem } from '../lib/rxTemplates'

interface RxTemplatePickerProps {
  open: boolean
  onClose: () => void
  onApply: (items: RxTemplateItem[]) => void
  currentItems: Array<Partial<RxTemplateItem> & { drugName: string; dosage: string; frequency: string }>
}

export default function RxTemplatePicker({ open, onClose, onApply, currentItems }: RxTemplatePickerProps) {
  const [templates, setTemplates] = useState<RxTemplate[]>(() => listRxTemplates())
  const [mode, setMode] = useState<'list' | 'save'>('list')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Acute')
  const [selected, setSelected] = useState<string[]>([])

  const usableCurrent = useMemo(
    () => currentItems.filter(c => c.drugName.trim() && c.dosage.trim() && c.frequency.trim()),
    [currentItems],
  )

  if (!open) return null

  function refresh() { setTemplates(listRxTemplates()) }

  function toggle(tplId: string) {
    setSelected(prev => prev.includes(tplId) ? prev.filter(s => s !== tplId) : [...prev, tplId])
  }

  function applySelected() {
    const items = selected.flatMap(id => templates.find(t => t.id === id)?.items ?? [])
    if (items.length === 0) return
    onApply(items)
    onClose()
  }

  function saveCurrent() {
    if (!name.trim() || usableCurrent.length === 0) return
    saveRxTemplate(name.trim(), category, usableCurrent as RxTemplateItem[])
    refresh()
    setName('')
    setMode('list')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-healthcare-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600"><Bookmark className="h-4 w-4" /></div>
            <div>
              <h3 className="text-[15px] font-semibold text-surface-800">Rx Templates</h3>
              <p className="text-[11px] text-surface-400">Apply a saved plan or save the current prescription</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-2 border-b border-surface-100 px-6 py-3">
          <button
            onClick={() => setMode('list')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${mode === 'list' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}
          >
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setMode('save')}
            disabled={usableCurrent.length === 0}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all disabled:opacity-40 ${mode === 'save' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}
          >
            Save current ({usableCurrent.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {mode === 'list' ? (
            templates.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-surface-400">No templates yet. Save one from a prescription.</p>
            ) : (
              <div className="space-y-2">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${selected.includes(tpl.id) ? 'border-primary-300 bg-primary-50/50' : 'border-surface-100 hover:bg-surface-50'}`}
                  >
                    <button onClick={() => toggle(tpl.id)} className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${selected.includes(tpl.id) ? 'border-primary-500 bg-primary-500 text-white' : 'border-surface-300'}`}>
                      {selected.includes(tpl.id) && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-surface-800">{tpl.name}</p>
                        <span className="rounded-md bg-surface-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-surface-500">{tpl.category}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {tpl.items.map((it, i) => (
                          <span key={i} className="rounded-md bg-surface-50 px-2 py-0.5 text-[11px] text-surface-600 border border-surface-100">{it.drugName} {it.strength ?? ''} · {it.frequency}</span>
                        ))}
                      </div>
                    </div>
                    {tpl.id.startsWith('seed-') ? null : (
                      <button onClick={() => { deleteRxTemplate(tpl.id); refresh() }} className="rounded-lg p-1.5 text-surface-400 hover:bg-danger-50 hover:text-danger-500" title="Delete template">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {usableCurrent.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-surface-400">Add at least one complete medicine item to save a template.</p>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-surface-600">Template name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Malaria course" className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-[13px] focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-surface-600">Category</label>
                    <div className="flex gap-2">
                      {['Acute', 'Chronic', 'Specialty', 'Other'].map(c => (
                        <button key={c} type="button" onClick={() => setCategory(c)} className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${category === c ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-surface-200 bg-surface-50 text-surface-600'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[12px] font-medium text-surface-600">Medicines to save ({usableCurrent.length})</p>
                    {usableCurrent.map((it, i) => (
                      <div key={i} className="rounded-lg bg-surface-50 px-3 py-2 text-[12px] text-surface-700">{it.drugName} {it.strength ?? ''} · {it.dosage} · {it.frequency}{it.durationDays ? ` · ${it.durationDays}d` : ''}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-surface-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-surface-200 px-4 py-2 text-[13px] font-medium text-surface-600 hover:bg-surface-50">Cancel</button>
          {mode === 'list' ? (
            <button onClick={applySelected} disabled={selected.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white shadow-healthcare transition-colors hover:bg-primary-700 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Apply {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
          ) : (
            <button onClick={saveCurrent} disabled={!name.trim() || usableCurrent.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white shadow-healthcare transition-colors hover:bg-accent-700 disabled:opacity-50">
              <Bookmark className="h-4 w-4" /> Save Template
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
