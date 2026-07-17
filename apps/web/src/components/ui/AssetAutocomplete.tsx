import { useEffect, useId, useRef, useState } from 'react'
import type { AssetSearchResult, AssetType } from '@grootfolio/shared'
import { useAssetSearch } from '@/lib/queries'

interface AssetAutocompleteProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** Se dispara al elegir un resultado del dropdown. */
  onSelect: (result: AssetSearchResult) => void
  /** Filtra la busqueda por tipo (el del tab activo). */
  type?: AssetType
  placeholder?: string
  error?: string
}

/**
 * Input con autocomplete contra el catalogo (GET /assets/search, GF-248).
 * Debounce de 250ms, dropdown de resultados y seleccion con mouse o teclado.
 * Al elegir, el padre recibe el activo completo (symbol + name + currency + type).
 */
export function AssetAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  type,
  placeholder,
  error,
}: AssetAutocompleteProps) {
  const inputId = useId()
  const listId = `${inputId}-list`
  const errorId = `${inputId}-error`
  const [debounced, setDebounced] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce del termino que efectivamente dispara la query.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250)
    return () => clearTimeout(t)
  }, [value])

  const { data: results = [], isFetching } = useAssetSearch(debounced, type)
  const showList = open && debounced.trim().length >= 2 && results.length > 0

  useEffect(() => setHighlight(0), [results])

  const choose = (r: AssetSearchResult) => {
    onSelect(r)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[highlight]
      if (r) choose(r)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const cls = `w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-neutral-800 ${error ? 'border-danger-500' : 'border-neutral-200 dark:border-neutral-700'}`

  return (
    <div className="relative block text-sm">
      <label htmlFor={inputId} className="mb-1 block font-medium">{label}</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay para que el click en un item se registre antes de cerrar.
          blurTimer.current = setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={handleKeyDown}
        className={cls}
        autoComplete="off"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          onMouseDown={() => {
            // Evita que el blur del input dispare antes del click.
            if (blurTimer.current) clearTimeout(blurTimer.current)
          }}
        >
          {results.map((r, i) => (
            <li
              key={`${r.type}:${r.symbol}`}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(r)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 ${i === highlight ? 'bg-brand-50 dark:bg-neutral-700' : ''}`}
            >
              <span className="truncate">
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-neutral-500">{r.symbol}</span>
              </span>
              <span className="shrink-0 text-xs text-neutral-400">{r.currency}</span>
            </li>
          ))}
        </ul>
      )}
      {isFetching && open && debounced.trim().length >= 2 && (
        <p className="mt-1 text-xs text-neutral-400">Buscando…</p>
      )}
      {error && <p id={errorId} role="alert" className="text-danger-500 mt-1 text-xs">{error}</p>}
    </div>
  )
}
