interface StatCardProps {
  label: string
  value: string
  delta?: string
  positive?: boolean
}

export function StatCard({ label, value, delta, positive }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {delta && <div className={`mt-1 text-xs ${positive ? 'text-success-500' : 'text-danger-500'}`}>{delta}</div>}
    </div>
  )
}
