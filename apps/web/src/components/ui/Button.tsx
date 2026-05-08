import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800',
  destructive: 'border border-danger-500 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/15',
  ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm font-medium',
  lg: 'px-6 py-3 text-base font-medium',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  fullWidth?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
