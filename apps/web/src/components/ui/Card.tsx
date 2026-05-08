import type { ReactNode } from 'react'

const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' } as const

interface CardProps {
  title?: string
  padding?: keyof typeof paddings
  children: ReactNode
  className?: string
}

export function Card({ title, padding = 'md', children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${paddings[padding]} ${className}`}>
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      {children}
    </div>
  )
}
