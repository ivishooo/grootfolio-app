interface StatCardProps {
  label: string
  value: string
  delta?: string
  /**
   * Signo del delta: `true` verde, `false` rojo, `null` neutro.
   *
   * El caso neutro importa: cuando la rentabilidad no es calculable el delta es
   * "—", y pintarlo de rojo (que era el comportamiento con `positive={false}`)
   * comunica una pérdida que no existe.
   */
  positive?: boolean | null
  /** Aclaración corta bajo el valor (ej. la moneda en la que está expresado). */
  hint?: string
}

export function StatCard({ label, value, delta, positive, hint }: StatCardProps) {
  const deltaColor =
    positive === null || positive === undefined
      ? 'text-neutral-400 dark:text-neutral-500'
      : positive
        ? 'text-success-500'
        : 'text-danger-500'

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {delta && <div className={`mt-1 text-xs tabular-nums ${deltaColor}`}>{delta}</div>}
      {hint && <div className="mt-1 text-[11px] text-neutral-400">{hint}</div>}
    </div>
  )
}
