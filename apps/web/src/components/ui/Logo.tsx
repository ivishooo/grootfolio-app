/**
 * Logo de marca GrootFolio (F1). Silueta de gato sobre chip naranja.
 * - `variant="mark"`: solo el chip (favicon / tamaños chicos).
 * - `variant="lockup"`: chip + wordmark "GrootFolio" (Groot neutro, Folio brand).
 *
 * El chip usa el color de marca vía tokens (`fill-brand-500`); el gato es la
 * silueta blanca fija del asset (docs/design-reference/brand/mark-solid.svg).
 */

// Geometría canónica del gato (viewBox 0 0 100 100), escalada dentro del chip 64.
const CAT_PATH =
  'M25 50 Q21 30 21 14 Q22 11 25 13 L41 34 Q50 30 59 34 L75 13 Q78 11 79 14 Q79 30 75 50 Q81 65 68 79 Q59 89 50 89 Q41 89 32 79 Q19 65 25 50 Z'

interface LogoProps {
  variant?: 'mark' | 'lockup'
  size?: number
  className?: string
}

export function Logo({ variant = 'lockup', size = 32, className = '' }: LogoProps) {
  const isLockup = variant === 'lockup'

  const chip = (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={isLockup ? undefined : 'img'}
      aria-label={isLockup ? undefined : 'GrootFolio'}
      aria-hidden={isLockup || undefined}
      className={isLockup ? '' : className}
    >
      <rect width="64" height="64" rx="15" className="fill-brand-500" />
      <g transform="translate(6.6,5.4) scale(0.51)">
        <path d={CAT_PATH} fill="#FFFFFF" />
      </g>
    </svg>
  )

  if (!isLockup) return chip

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      {chip}
      <span className="text-xl font-bold leading-none tracking-tight">
        <span className="text-neutral-900 dark:text-white">Groot</span>
        <span className="text-brand-500">Folio</span>
      </span>
    </span>
  )
}
