import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface AutocompleteOption {
  key: string
  primary: string
  secondary?: string
  onSelect: () => void
}

interface AutocompleteProps {
  value: string
  onChange: (value: string) => void
  options: AutocompleteOption[]
  placeholder?: string
  className?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  allowFreeText?: boolean
}

export default function Autocomplete({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  inputMode = 'text',
}: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function choose(opt: AutocompleteOption) {
    opt.onSelect()
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { if (open && options[active]) { e.preventDefault(); choose(options[active]) } }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const showList = open && options.length > 0

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
        <input
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={e => { onChange(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 pl-9 text-[13px] transition-all placeholder:text-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
      </div>
      {showList && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-surface-200 bg-white py-1 shadow-healthcare-lg">
          {options.map((opt, i) => (
            <li key={opt.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${i === active ? 'bg-primary-50' : 'hover:bg-surface-50'}`}
              >
                <span className="text-[13px] font-medium text-surface-800">{opt.primary}</span>
                {opt.secondary && <span className="text-[11px] text-surface-400">{opt.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
