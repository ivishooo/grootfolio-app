import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo destructivo para el botón de confirmar (rojo). Default true. */
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

/**
 * Reemplazo in-app de `window.confirm` (que muestra el diálogo nativo del
 * navegador, "vercel.app says…"). Expone `confirm(options): Promise<boolean>`,
 * que resuelve true/false según el botón elegido. Un solo modal a la vez.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setOptions(null)
    resolver.current?.(result)
    resolver.current = null
  }, [])

  // Escape cancela; se engancha solo mientras hay un modal abierto.
  useEffect(() => {
    if (!options) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, close])

  const danger = options?.danger ?? true

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title" className="text-lg font-bold">{options.title}</h3>
            {options.message && (
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{options.message}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => close(false)}>
                {options.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant="primary"
                className={danger ? '!border-0 !bg-danger-500 !text-white hover:!bg-danger-600' : ''}
                onClick={() => close(true)}
                autoFocus
              >
                {options.confirmLabel ?? 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx.confirm
}
