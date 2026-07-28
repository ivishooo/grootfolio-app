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
}

export function Input({ label, value, onChange, error, placeholder, type = 'text', multiline, rows = 3, id }: InputProps) {
  const reactId = useId()
  const inputId = id ?? reactId
  const errorId = `${inputId}-error`
  // En campos password sumamos un toggle Ver/Ocultar; arranca oculto.
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)
  const effectiveType = isPassword && revealed ? 'text' : type
  const cls = `w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-neutral-800 ${isPassword ? 'pr-16' : ''} ${error ? 'border-danger-500' : 'border-neutral-200 dark:border-neutral-700'}`
  const aria = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className="block text-sm">
      <label htmlFor={inputId} className="mb-1 block font-medium">{label}</label>
      {multiline ? (
        <textarea id={inputId} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cls} {...aria} />
      ) : isPassword ? (
        <div className="relative">
          <input id={inputId} type={effectiveType} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cls} {...aria} />
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {revealed ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      ) : (
        <input id={inputId} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cls} {...aria} />
      )}
      {error && <p id={errorId} role="alert" className="text-danger-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
