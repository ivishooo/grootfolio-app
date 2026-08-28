import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo destructivo (rojo) para confirmar. Default true. */
  danger?: boolean
  /**
   * Acción async opcional. Si se pasa, el modal muestra spinner en el botón
   * mientras corre y se cierra al terminar (el confirm() resuelve true luego).
   * Si no se pasa, confirm() resuelve true/false como antes.
   */
  onConfirm?: () => Promise<void> | void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

/**
 * Reemplazo in-app de `window.confirm` (rediseño GF). Popup centrado con
 * backdrop, botón destructivo y estado de carga opcional en el confirmar.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Quien tenia el foco antes de abrir, para devolverselo al cerrar.
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null
    setOptions(opts)
    setLoading(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setOptions(null)
    setLoading(false)
    resolver.current?.(result)
    resolver.current = null
    // Sin esto el foco quedaba en <body>: quien navega con teclado perdia el
    // lugar y tenia que tabular desde el principio del documento.
    const target = returnFocusTo.current
    returnFocusTo.current = null
    if (target && document.contains(target)) {
      requestAnimationFrame(() => target.focus())
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!options?.onConfirm) {
      close(true)
      return
    }
    try {
      setLoading(true)
      await options.onConfirm()
      close(true)
    } catch {
      // El caller maneja el error (toast); solo salimos del estado de carga.
      setLoading(false)
    }
  }, [options, close])

  // Escape cancela (bloqueado mientras carga) y Tab queda atrapado adentro del
  // dialogo: sin el trap, tabular sacaba el foco a la pagina de atras, que
  // visualmente esta tapada por el backdrop.
  useEffect(() => {
    if (!options) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        close(false)
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, loading, close])

  const danger = options?.danger ?? true

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => !loading && close(false)}
          style={{ animation: 'gf-fade .15s ease' }}
        >
          <div
            ref={panelRef}
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'gf-modal-in .2s cubic-bezier(.2,.7,.3,1)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold"
                style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)', color: danger ? '#EF4444' : '#F97316' }}
              >
                !
              </span>
              <h3 id="confirm-title" className="text-lg font-bold">
                {options.title}
              </h3>
            </div>
            {options.message && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{options.message}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => close(false)} disabled={loading}>
                {options.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant="primary"
                className={danger ? '!border-0 !bg-danger-500 !text-white hover:!bg-danger-600' : ''}
                onClick={handleConfirm}
                disabled={loading}
                autoFocus
              >
                <span className="inline-flex items-center gap-2">
                  {loading && (
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
                      style={{ animation: 'gf-spin .6s linear infinite' }}
                    />
                  )}
                  {options.confirmLabel ?? 'Eliminar'}
                </span>
              </Button>
            </div>
          </div>
          <style>{`@keyframes gf-fade{from{opacity:0}to{opacity:1}}@keyframes gf-modal-in{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}@keyframes gf-spin{to{transform:rotate(360deg)}}`}</style>
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
