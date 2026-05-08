const variants = {
  success: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-500',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500',
  info: 'bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-500',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
} as const

interface BadgeProps {
  label: string
  variant?: keyof typeof variants
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}
