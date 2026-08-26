import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ChevronDown } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = languages.find((l) => l.code === i18n.language) ?? languages[0]

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-surface-200 hover:bg-surface-50 hover:border-surface-300 transition-all text-[13px] font-medium text-surface-700 cursor-pointer shadow-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4 text-surface-400" />
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-surface-200 shadow-healthcare-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="max-h-80 overflow-y-auto py-1.5">
            {languages.map((lang) => (
              <button
                key={lang.code}
                role="option"
                aria-selected={lang.code === i18n.language}
                onClick={() => {
                  i18n.changeLanguage(lang.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 text-[13px] transition-colors cursor-pointer ${
                  lang.code === i18n.language
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-surface-700 hover:bg-surface-50'
                }`}
              >
                <span className="flex-1 text-left">{lang.native}</span>
                <span className="text-[11px] text-surface-400 font-mono">{lang.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
