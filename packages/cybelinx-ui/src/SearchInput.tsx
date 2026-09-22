import { useState, useEffect, useMemo, type InputHTMLAttributes } from 'react'
import { debounce } from '@cybelinx/core'

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch: (query: string) => void
  debounceMs?: number
  initialValue?: string
}

export function SearchInput({
  onSearch,
  debounceMs = 300,
  initialValue = '',
  placeholder = 'Search...',
  className = '',
  ...props
}: SearchInputProps) {
  const [term, setTerm] = useState(initialValue)

  const debouncedSearch = useMemo(
    () => debounce((q: string) => onSearch(q), debounceMs),
    [onSearch, debounceMs],
  )

  useEffect(() => {
    debouncedSearch(term)
  }, [term, debouncedSearch])

  return (
    <div className="relative w-full">
      <input
        type="search"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2 pl-9 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 text-slate-800 ${className}`}
        {...props}
      />
      <svg
        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  )
}
