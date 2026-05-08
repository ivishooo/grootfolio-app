const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' } as const

interface ProgressBarProps {
  value: number
  size?: keyof typeof heights
  color?: string
  className?: string
}

export function ProgressBar({ value, size = 'sm', color = 'bg-brand-500', className = '' }: ProgressBarProps) {
  return (
    <div className={`${heights[size]} rounded-full bg-neutral-200 dark:bg-neutral-800 ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
