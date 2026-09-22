import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ConfirmationModal({ isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', isDestructive = false, onConfirm, onCancel, }) {
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in", children: _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4", children: [_jsx("h3", { className: "text-[16px] font-bold text-slate-900", children: title }), _jsx("p", { className: "text-[13px] text-slate-600 leading-relaxed", children: message }), _jsxs("div", { className: "flex justify-end gap-2.5 pt-2", children: [_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2 text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors", children: cancelLabel }), _jsx("button", { type: "button", onClick: onConfirm, className: `px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-colors ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-sky-600 hover:bg-sky-700 shadow-sm'}`, children: confirmLabel })] })] }) }));
}
