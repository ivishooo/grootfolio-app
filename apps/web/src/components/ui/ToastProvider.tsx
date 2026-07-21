/**
 * Toasts (rediseño GF). Pila abajo a la derecha con auto-dismiss.
 * Variantes: success | error | warning | info, con ícono y acento lateral.
 * Soporta descripción opcional y una acción (ej. "Deshacer").
 *
 * API retrocompatible:
 *   toast('Guardado')                       -> success
 *   toast('Falló', 'error')                 -> error
 *   toast('Posición eliminada', 'info', {   -> con acción
 *     description: 'Se borraron sus transacciones.',
 *     action: 'Deshacer',
 *     onAction: () => restore(),
 *   })
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  description?: string
  action?: string
  onAction?: () => void
  duration?: number
}

interface Toast extends ToastOptions {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_META: Record<ToastVariant, { color: string; icon: string; italic?: boolean }> = {
  success: { color: '#16A34A', icon: '✓' },
  error: { color: '#DC2626', icon: '✕' },
  warning: { color: '#D97706', icon: '!' },
  info: { color: '#2563EB', icon: 'i', italic: true },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success', options: ToastOptions = {}) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, variant, ...options }])
      const ms = options.duration ?? (options.action ? 7000 : 3800)
      setTimeout(() => dismiss(id), ms)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2.5">
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant]
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-[340px] items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
              style={{ borderLeft: `4px solid ${meta.color}`, animation: 'gf-toast-in .22s cubic-bezier(.2,.7,.3,1)' }}
            >
              <span
                className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
                style={{ background: meta.color, fontStyle: meta.italic ? 'italic' : 'normal' }}
              >
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t.message}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t.description}</p>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.onAction?.()
                      dismiss(t.id)
                    }}
                    className="mt-2 rounded-md border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: meta.color, color: meta.color }}
                  >
                    {t.action}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar"
                className="text-sm leading-none text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes gf-toast-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
