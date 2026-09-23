import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from 'react';
import { DictionaryResolver, SpellChecker, GrammarChecker } from '@cybelinx/language';
export function SmartTextEditor({ value, onChange, domain = 'healthcare', tenantId, placeholder = 'Type clinical notes...', minRows = 4, spellCheck = true, grammarCheck = true, className = '', disabled = false, }) {
    const [spellMatches, setSpellMatches] = useState([]);
    const [grammarMatches, setGrammarMatches] = useState([]);
    const [activeSpellMatch, setActiveSpellMatch] = useState(null);
    const [activeGrammarMatch, setActiveGrammarMatch] = useState(null);
    const [popoverPos, setPopoverPos] = useState(null);
    const containerRef = useRef(null);
    const spellChecker = useMemo(() => {
        const resolver = new DictionaryResolver();
        const terms = resolver.resolveEffectiveTerms({ domain, tenantId });
        return new SpellChecker(terms);
    }, [domain, tenantId]);
    const grammarChecker = useMemo(() => new GrammarChecker(), []);
    useEffect(() => {
        if (!spellCheck || !value) { setSpellMatches([]); return; }
        const timer = setTimeout(() => {
            try { setSpellMatches(spellChecker.checkText(value)); }
            catch { setSpellMatches([]); }
        }, 150);
        return () => clearTimeout(timer);
    }, [value, spellCheck, spellChecker]);
    useEffect(() => {
        if (!grammarCheck || !value) { setGrammarMatches([]); return; }
        const timer = setTimeout(() => {
            try { setGrammarMatches(grammarChecker.checkText(value)); }
            catch { setGrammarMatches([]); }
        }, 400);
        return () => clearTimeout(timer);
    }, [value, grammarCheck, grammarChecker]);
    const applySpellSuggestion = (match, replacement) => {
        onChange(value.slice(0, match.offset) + replacement + value.slice(match.offset + match.length));
        setActiveSpellMatch(null); setPopoverPos(null);
    };
    const applyGrammarSuggestion = (match, replacement) => {
        onChange(value.slice(0, match.offset) + replacement + value.slice(match.offset + match.length));
        setActiveGrammarMatch(null); setPopoverPos(null);
    };
    const ignoreSpellMatch = (m) => { setSpellMatches(prev => prev.filter(x => x.offset !== m.offset)); setActiveSpellMatch(null); setPopoverPos(null); };
    const ignoreGrammarMatch = (m) => { setGrammarMatches(prev => prev.filter(x => x.offset !== m.offset)); setActiveGrammarMatch(null); setPopoverPos(null); };
    const openPopover = (e, type, match) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const parentRect = containerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 };
        setPopoverPos({ top: rect.bottom - parentRect.top + 4, left: Math.max(0, rect.left - parentRect.left) });
        if (type === 'spell') { setActiveGrammarMatch(null); setActiveSpellMatch(match); }
        else { setActiveSpellMatch(null); setActiveGrammarMatch(match); }
    };
    const totalIssues = spellMatches.length + grammarMatches.length;
    const visibleSpell = spellMatches.slice(0, 2);
    const visibleGrammar = grammarMatches.slice(0, 2);
    const overflow = Math.max(0, totalIssues - 4);
    return (_jsxs("div", { ref: containerRef, className: `relative flex flex-col min-w-0 ${className}`, children: [_jsx("textarea", { value: value, onChange: e => onChange(e.target.value), placeholder: placeholder, rows: minRows, disabled: disabled, spellCheck: false, className: "w-full px-3.5 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 resize-none transition-all placeholder:text-slate-400 disabled:opacity-60 leading-relaxed font-normal text-slate-800" }), _jsxs("div", { className: "flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold uppercase tracking-wider text-[9px] border border-sky-200/60", children: domain }), totalIssues === 0 ? (_jsx("span", { className: "text-emerald-600 font-medium", children: "\u2713 Domain-verified" })) : (_jsxs("span", { className: "text-amber-600 font-medium", children: [spellMatches.length > 0 && `${spellMatches.length} spelling`, spellMatches.length > 0 && grammarMatches.length > 0 && ', ', grammarMatches.length > 0 && `${grammarMatches.length} grammar`, ' to review'] }))] }), totalIssues > 0 && (_jsxs("div", { className: "flex items-center gap-1 overflow-x-auto max-w-[65%] py-0.5", children: [visibleSpell.map((m, idx) => (_jsx("button", { type: "button", onClick: e => openPopover(e, 'spell', m), className: "cybelinx-squiggly-error px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100/60 rounded transition-colors", children: m.word }, `spell-${m.offset}-${idx}`))), visibleGrammar.map((m, idx) => (_jsx("button", { type: "button", onClick: e => openPopover(e, 'grammar', m), className: "cybelinx-squiggly-warning px-1.5 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100/60 rounded transition-colors", children: m.phrase.length > 12 ? m.phrase.slice(0, 12) + '\u2026' : m.phrase }, `grammar-${m.offset}-${idx}`))), overflow > 0 && (_jsxs("span", { className: "text-slate-400 text-[10px]", children: ["+", overflow] }))] }))] }), activeSpellMatch && popoverPos && (_jsxs("div", { className: "cybelinx-popover", style: { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }, children: [_jsxs("div", { className: "text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-500 inline-block" }), "Spelling \u2014 Did you mean?"] }), activeSpellMatch.suggestions.length > 0 ? activeSpellMatch.suggestions.map(sug => (_jsxs("button", { type: "button", onClick: () => applySpellSuggestion(activeSpellMatch, sug), className: "w-full text-left px-2 py-1.5 text-[12px] font-semibold text-sky-700 hover:bg-sky-50 rounded-lg transition-colors flex items-center justify-between", children: [_jsx("span", { children: sug }), _jsx("span", { className: "text-[10px] text-slate-400 font-normal", children: "Replace" })] }, sug))) : (_jsx("div", { className: "px-2 py-1 text-[11px] text-slate-500 italic", children: "No direct suggestions" })), _jsx("div", { className: "border-t border-slate-100 mt-1 pt-1 flex justify-end", children: _jsx("button", { type: "button", onClick: () => ignoreSpellMatch(activeSpellMatch), className: "px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded", children: "Ignore" }) })] })), activeGrammarMatch && popoverPos && (_jsxs("div", { className: "cybelinx-popover", style: { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }, children: [_jsxs("div", { className: "text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" }), activeGrammarMatch.type === 'punctuation' ? 'Punctuation' : activeGrammarMatch.type === 'style' ? 'Style' : 'Grammar'] }), _jsx("div", { className: "px-2 pb-1 text-[11px] text-slate-600", children: activeGrammarMatch.message }), activeGrammarMatch.suggestions.length > 0 ? activeGrammarMatch.suggestions.map(sug => (_jsxs("button", { type: "button", onClick: () => applyGrammarSuggestion(activeGrammarMatch, sug), className: "w-full text-left px-2 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center justify-between", children: [_jsx("span", { children: sug }), _jsx("span", { className: "text-[10px] text-slate-400 font-normal", children: "Replace" })] }, sug))) : (_jsx("div", { className: "px-2 py-1 text-[11px] text-slate-500 italic", children: "No direct suggestions" })), _jsx("div", { className: "border-t border-slate-100 mt-1 pt-1 flex justify-end", children: _jsx("button", { type: "button", onClick: () => ignoreGrammarMatch(activeGrammarMatch), className: "px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded", children: "Ignore" }) })] }))] }));
}


