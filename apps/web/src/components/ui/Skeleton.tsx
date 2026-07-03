/**
 * Skeleton loader (GF-229): bloque con pulso para placeholders con la forma del
 * contenido real mientras carga, en vez de un spinner generico.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`}
    />
  )
}

/** Contenedor con el mismo marco visual que las Card del dashboard. */
export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      {children}
    </div>
  )
}
