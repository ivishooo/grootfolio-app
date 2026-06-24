/**
 * Estados transversales de UI (GF-227): carga, error y vacio. Pensados para
 * envolver el contenido de una pantalla o de una card mientras se resuelve una
 * query.
 */
import type { ReactNode } from 'react'
import { Button } from './Button'

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-3 py-16 text-neutral-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({
  message = 'Algo salio mal.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="grid place-items-center gap-3 py-16 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-danger-50 text-danger-500 dark:bg-danger-950/40">
        !
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="grid place-items-center gap-2 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
