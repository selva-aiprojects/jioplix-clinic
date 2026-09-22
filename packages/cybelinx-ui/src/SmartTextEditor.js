import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from 'react';
import { DictionaryResolver, SpellChecker } from '@cybelinx/language';
export function SmartTextEditor({ value, onChange, domain = 'healthcare', tenantId, placeholder = 'Type clinical notes...', minRows = 4, spellCheck = true, grammarCheck = true, className = '', disabled = false, }) {
    const [matches, setMatches] = useState([]);
    const [activeMatch, setActiveMatch] = useState(null);
    const [popoverPos, setPopoverPos] = useState(null);
    const containerRef = useRef(null);
    // Initialize dictionary & spellchecker once or when domain/tenantId changes
    const spellChecker = useMemo(() => {
        const resolver = new DictionaryResolver();
        const terms = resolver.resolveEffectiveTerms({ domain, tenantId });
        return new SpellChecker(terms);
    }, [domain, tenantId]);
    // Run non-blocking spell check on text change
    useEffect(() => {
        if (!spellCheck || !value) {
            setMatches([]);
            return;
        }
        const timer = setTimeout(() => {
            try {
                const found = spellChecker.checkText(value);
                setMatches(found);
            }
            catch {
                // Fail-open: if check fails, never throw or interrupt editing
                setMatches([]);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [value, spellCheck, spellChecker]);
    const applySuggestion = (match, replacement) => {
        const before = value.slice(0, match.offset);
        const after = value.slice(match.offset + match.length);
        onChange(before + replacement + after);
        setActiveMatch(null);
        setPopoverPos(null);
    };
    const ignoreMatch = (matchToIgnore) => {
        setMatches(prev => prev.filter(m => m.offset !== matchToIgnore.offset));
        setActiveMatch(null);
        setPopoverPos(null);
    };
    return (_jsxs("div", { ref: containerRef, className: `relative flex flex-col min-w-0 ${className}`, children: [_jsx("textarea", { value: value, onChange: e => onChange(e.target.value), placeholder: placeholder, rows: minRows, disabled: disabled, spellCheck: false, className: "w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 resize-none transition-all placeholder:text-slate-400 disabled:opacity-60 leading-relaxed font-normal text-slate-800" }), _jsxs("div", { className: "flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold uppercase tracking-wider text-[9px] border border-sky-200/60", children: domain }), matches.length === 0 ? (_jsx("span", { className: "text-emerald-600 font-medium", children: "\u2713 Domain-verified" })) : (_jsxs("span", { className: "text-amber-600 font-medium", children: [matches.length, " term", matches.length === 1 ? '' : 's', " to review"] }))] }), matches.length > 0 && (_jsxs("div", { className: "flex items-center gap-1 overflow-x-auto max-w-[65%] py-0.5", children: [matches.slice(0, 3).map((m, idx) => (_jsx("button", { type: "button", onClick: e => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const parentRect = containerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 };
                                    setPopoverPos({
                                        top: rect.bottom - parentRect.top + 4,
                                        left: Math.max(0, rect.left - parentRect.left),
                                    });
                                    setActiveMatch(m);
                                }, className: "cybelinx-squiggly-error px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100/60 rounded transition-colors", children: m.word }, `${m.offset}-${idx}`))), matches.length > 3 && (_jsxs("span", { className: "text-slate-400 text-[10px]", children: ["+", matches.length - 3] }))] }))] }), activeMatch && popoverPos && (_jsxs("div", { className: "cybelinx-popover", style: { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }, children: [_jsx("div", { className: "text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider", children: "Did you mean?" }), activeMatch.suggestions.length > 0 ? (activeMatch.suggestions.map(sug => (_jsxs("button", { type: "button", onClick: () => applySuggestion(activeMatch, sug), className: "w-full text-left px-2 py-1.5 text-[12px] font-semibold text-sky-700 hover:bg-sky-50 rounded-lg transition-colors flex items-center justify-between", children: [_jsx("span", { children: sug }), _jsx("span", { className: "text-[10px] text-slate-400 font-normal", children: "Replace" })] }, sug)))) : (_jsx("div", { className: "px-2 py-1 text-[11px] text-slate-500 italic", children: "No direct suggestions" })), _jsx("div", { className: "border-t border-slate-100 mt-1 pt-1 flex justify-end", children: _jsx("button", { type: "button", onClick: () => ignoreMatch(activeMatch), className: "px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded", children: "Ignore" }) })] }))] }));
}
