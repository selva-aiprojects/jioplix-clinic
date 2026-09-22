import { type InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, className = '', id, ...props },
  ref,
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full px-3 py-2 text-[13px] bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-60 placeholder:text-slate-400 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 text-red-900'
            : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20 text-slate-800'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] font-medium text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  )
})
