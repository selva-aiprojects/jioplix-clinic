import { useState, useEffect, useMemo, useRef } from 'react'
import { DictionaryResolver, SpellChecker, GrammarChecker, type SpellMatch, type GrammarMatch } from '@cybelinx/language'

export interface SmartTextEditorProps {
  value: string
  onChange: (value: string) => void
  domain?: string
  tenantId?: string
  placeholder?: string
  minRows?: number
  spellCheck?: boolean
  grammarCheck?: boolean
  className?: string
  disabled?: boolean
}

export function SmartTextEditor({
  value,
  onChange,
  domain = 'healthcare',
  tenantId,
  placeholder = 'Type clinical notes...',
  minRows = 4,
  spellCheck = true,
  grammarCheck = true,
  className = '',
  disabled = false,
}: SmartTextEditorProps) {
  const [spellMatches, setSpellMatches] = useState<SpellMatch[]>([])
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([])
  const [activeSpellMatch, setActiveSpellMatch] = useState<SpellMatch | null>(null)
  const [activeGrammarMatch, setActiveGrammarMatch] = useState<GrammarMatch | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize dictionary & spellchecker once or when domain/tenantId changes
  const spellChecker = useMemo(() => {
    const resolver = new DictionaryResolver()
    const terms = resolver.resolveEffectiveTerms({ domain, tenantId })
    return new SpellChecker(terms)
  }, [domain, tenantId])

  // Grammar checker is stateless — one shared instance is sufficient
  const grammarChecker = useMemo(() => new GrammarChecker(), [])

  // Run non-blocking spell check on text change (150ms debounce)
  useEffect(() => {
    if (!spellCheck || !value) {
      setSpellMatches([])
      return
    }

    const timer = setTimeout(() => {
      try {
        const found = spellChecker.checkText(value)
        setSpellMatches(found)
      } catch {
        // Fail-open: if check fails, never throw or interrupt editing
        setSpellMatches([])
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [value, spellCheck, spellChecker])

  // Run non-blocking grammar check on text change (400ms debounce — slightly longer)
  useEffect(() => {
    if (!grammarCheck || !value) {
      setGrammarMatches([])
      return
    }

    const timer = setTimeout(() => {
      try {
        const found = grammarChecker.checkText(value)
        setGrammarMatches(found)
      } catch {
        // Fail-open: never interrupt editing
        setGrammarMatches([])
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [value, grammarCheck, grammarChecker])

  const applySpellSuggestion = (match: SpellMatch, replacement: string) => {
    const before = value.slice(0, match.offset)
    const after = value.slice(match.offset + match.length)
    onChange(before + replacement + after)
    setActiveSpellMatch(null)
    setPopoverPos(null)
  }

  const applyGrammarSuggestion = (match: GrammarMatch, replacement: string) => {
    const before = value.slice(0, match.offset)
    const after = value.slice(match.offset + match.length)
    onChange(before + replacement + after)
    setActiveGrammarMatch(null)
    setPopoverPos(null)
  }

  const ignoreSpellMatch = (matchToIgnore: SpellMatch) => {
    setSpellMatches(prev => prev.filter(m => m.offset !== matchToIgnore.offset))
    setActiveSpellMatch(null)
    setPopoverPos(null)
  }

  const ignoreGrammarMatch = (matchToIgnore: GrammarMatch) => {
    setGrammarMatches(prev => prev.filter(m => m.offset !== matchToIgnore.offset))
    setActiveGrammarMatch(null)
    setPopoverPos(null)
  }

  const openPopover = (e: React.MouseEvent<HTMLButtonElement>, type: 'spell' | 'grammar', match: SpellMatch | GrammarMatch) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const parentRect = containerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 }
    setPopoverPos({
      top: rect.bottom - parentRect.top + 4,
      left: Math.max(0, rect.left - parentRect.left),
    })
    if (type === 'spell') {
      setActiveGrammarMatch(null)
      setActiveSpellMatch(match as SpellMatch)
    } else {
      setActiveSpellMatch(null)
      setActiveGrammarMatch(match as GrammarMatch)
    }
  }

  const totalIssues = spellMatches.length + grammarMatches.length
  const visibleSpell = spellMatches.slice(0, 2)
  const visibleGrammar = grammarMatches.slice(0, 2)
  const overflow = Math.max(0, totalIssues - 4)

  return (
    <div ref={containerRef} className={`relative flex flex-col min-w-0 ${className}`}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={minRows}
        disabled={disabled}
        spellCheck={false} // Disable noisy browser default; domain + grammar engine handles this
        className="w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 resize-none transition-all placeholder:text-slate-400 disabled:opacity-60 leading-relaxed font-normal text-slate-800"
      />

      {/* Domain badge & issue count footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold uppercase tracking-wider text-[9px] border border-sky-200/60">
            {domain}
          </span>
          {totalIssues === 0 ? (
            <span className="text-emerald-600 font-medium">✓ Domain-verified</span>
          ) : (
            <span className="text-amber-600 font-medium">
              {spellMatches.length > 0 && `${spellMatches.length} spelling`}
              {spellMatches.length > 0 && grammarMatches.length > 0 && ', '}
              {grammarMatches.length > 0 && `${grammarMatches.length} grammar`}
              {' '}to review
            </span>
          )}
        </div>

        {/* Inline chips for spell errors (red) and grammar warnings (amber) */}
        {totalIssues > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto max-w-[65%] py-0.5">
            {visibleSpell.map((m, idx) => (
              <button
                key={`spell-${m.offset}-${idx}`}
                type="button"
                onClick={e => openPopover(e, 'spell', m)}
                className="cybelinx-squiggly-error px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100/60 rounded transition-colors"
              >
                {m.word}
              </button>
            ))}
            {visibleGrammar.map((m, idx) => (
              <button
                key={`grammar-${m.offset}-${idx}`}
                type="button"
                onClick={e => openPopover(e, 'grammar', m)}
                className="cybelinx-squiggly-warning px-1.5 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100/60 rounded transition-colors"
              >
                {m.phrase.length > 12 ? m.phrase.slice(0, 12) + '…' : m.phrase}
              </button>
            ))}
            {overflow > 0 && (
              <span className="text-slate-400 text-[10px]">+{overflow}</span>
            )}
          </div>
        )}
      </div>

      {/* Spell Check Popover */}
      {activeSpellMatch && popoverPos && (
        <div
          className="cybelinx-popover"
          style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            Spelling — Did you mean?
          </div>
          {activeSpellMatch.suggestions.length > 0 ? (
            activeSpellMatch.suggestions.map(sug => (
              <button
                key={sug}
                type="button"
                onClick={() => applySpellSuggestion(activeSpellMatch, sug)}
                className="w-full text-left px-2 py-1.5 text-[12px] font-semibold text-sky-700 hover:bg-sky-50 rounded-lg transition-colors flex items-center justify-between"
              >
                <span>{sug}</span>
                <span className="text-[10px] text-slate-400 font-normal">Replace</span>
              </button>
            ))
          ) : (
            <div className="px-2 py-1 text-[11px] text-slate-500 italic">No direct suggestions</div>
          )}
          <div className="border-t border-slate-100 mt-1 pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => ignoreSpellMatch(activeSpellMatch)}
              className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* Grammar Check Popover */}
      {activeGrammarMatch && popoverPos && (
        <div
          className="cybelinx-popover"
          style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            {activeGrammarMatch.type === 'punctuation' ? 'Punctuation' : activeGrammarMatch.type === 'style' ? 'Style' : 'Grammar'}
          </div>
          <div className="px-2 pb-1 text-[11px] text-slate-600">{activeGrammarMatch.message}</div>
          {activeGrammarMatch.suggestions.length > 0 ? (
            activeGrammarMatch.suggestions.map(sug => (
              <button
                key={sug}
                type="button"
                onClick={() => applyGrammarSuggestion(activeGrammarMatch, sug)}
                className="w-full text-left px-2 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center justify-between"
              >
                <span>{sug}</span>
                <span className="text-[10px] text-slate-400 font-normal">Replace</span>
              </button>
            ))
          ) : (
            <div className="px-2 py-1 text-[11px] text-slate-500 italic">No direct suggestions</div>
          )}
          <div className="border-t border-slate-100 mt-1 pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => ignoreGrammarMatch(activeGrammarMatch)}
              className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded"
            >
              Ignore
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

