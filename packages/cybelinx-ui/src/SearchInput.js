import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { debounce } from '@cybelinx/core';
export function SearchInput({ onSearch, debounceMs = 300, initialValue = '', placeholder = 'Search...', className = '', ...props }) {
    const [term, setTerm] = useState(initialValue);
    const debouncedSearch = useMemo(() => debounce((q) => onSearch(q), debounceMs), [onSearch, debounceMs]);
    useEffect(() => {
        debouncedSearch(term);
    }, [term, debouncedSearch]);
    return (_jsxs("div", { className: "relative w-full", children: [_jsx("input", { type: "search", value: term, onChange: e => setTerm(e.target.value), placeholder: placeholder, className: `w-full px-3.5 py-2 pl-9 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 text-slate-800 ${className}`, ...props }), _jsx("svg", { className: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) })] }));
}
