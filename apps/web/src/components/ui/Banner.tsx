/**
 * Banner superior descartable (rediseño GF). Aviso contextual arriba de una
 * pantalla. Variantes info | warning | success con acento sutil.
 */
import type { ReactNode } from 'react'

type BannerVariant = 'info' | 'warning' | 'success'

interface BannerProps {
  variant?: BannerVariant
  children: ReactNode
  action?: string
  onAction?: () => void
  onDismiss?: () => void
}

const META: Record<BannerVariant, { color: string; icon: string; italic?: boolean }> = {
  info: { color: '#3B82F6', icon: 'i', italic: true },
  warning: { color: '#D97706', icon: '!' },
  success: { color: '#16A34A', icon: '✓' },
}

export function Banner({ variant = 'info', children, action, onAction, onDismiss }: BannerProps) {
  const m = META[variant]
  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 dark:bg-neutral-900"
      style={{
        borderColor: `color-mix(in srgb, ${m.color} 28%, transparent)`,
        background: `color-mix(in srgb, ${m.color} 8%, transparent)`,
      }}
    >
      <span
        className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
        style={{ background: m.color, fontStyle: m.italic ? 'italic' : 'normal' }}
      >
        {m.icon}
      </span>
      <p className="flex-1 text-[13px] text-neutral-600 dark:text-neutral-300">{children}</p>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="px-1 text-[13px] font-semibold"
          style={{ color: m.color }}
        >
          {action}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar"
          className="px-1 text-base leading-none text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          ✕
        </button>
      )}
    </div>
  )
}
