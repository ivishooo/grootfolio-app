import { useId, useState } from 'react'

interface InputProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  type?: string
  multiline?: boolean
  rows?: number
  id?: string
  /** Marca el campo como obligatorio: asterisco en el label + `aria-required`. */
  required?: boolean
  /** Texto de ayuda bajo el campo. Se oculta cuando hay error, para no duplicar. */
  hint?: string
  min?: string | number
  max?: string | number
  step?: string | number
  inputMode?: 'text' | 'numeric' | 'decimal'
}

export function Input({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  multiline,
  rows = 3,
  id,
  required,
  hint,
  min,
  max,
  step,
  inputMode,
}: InputProps) {
  const reactId = useId()
  const inputId = id ?? reactId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  // En campos password sumamos un toggle Ver/Ocultar; arranca oculto.
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)
  const effectiveType = isPassword && revealed ? 'text' : type
    // Fondo blanco (antes neutral-50) y borde mas marcado: el relleno gris
  // hundia el contraste del placeholder por debajo del 4,5:1 de WCAG AA.
  const cls = `w-full rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-neutral-900 ${isPassword ? 'pr-10' : ''} ${error ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-700'}`
  const aria = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : hint ? hintId : undefined,
    'aria-required': required || undefined,
  }
  const numeric = { min, max, step, inputMode }

  return (
    <div className="block text-sm">
      <label htmlFor={inputId} className="mb-1 block font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-danger-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          id={inputId}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={cls}
          {...aria}
        />
      ) : isPassword ? (
        <div className="relative">
          <input
            id={inputId}
            type={effectiveType}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
            {...aria}
          />
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
              {revealed && <path d="M3 3l18 18" />}
            </svg>
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
          {...aria}
          {...numeric}
        />
      )}
      {error ? (
        <p id={errorId} role="alert" className="text-danger-500 text-xs mt-1">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
