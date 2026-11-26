// Logo nuevo de GrootFolio. Reemplaza a apps/web/src/components/ui/Logo.tsx, con la misma API.
// - variant="mark":   solo el chip (sidebar, header, favicon grande).
// - variant="lockup": chip + wordmark «GrootFolio».
// - variant="icon":   ícono de app con bigotes, collar y chapita (splash, login).
// - variant="solid":  silueta en currentColor (favicon de 16 a 32 px).
// La geometría es la misma de la cabeza de GrootAvatar, sin movimiento.
import { useId } from 'react'

const HEAD = 'M17 50 Q12 26 17 8 Q19 5 22 8 L40 27 Q50 24 60 27 L78 8 Q81 5 83 8 Q88 26 83 50 Q86 72 68 82 Q59 86 50 86 Q41 86 32 82 Q14 72 17 50 Z'
const EAR_L = 'M17 50 Q12 26 17 8 Q19 5 22 8 L45 29 Z'
const EAR_R = 'M83 50 Q88 26 83 8 Q81 5 78 8 L55 29 Z'
const IN_L = 'M22 42 Q19 26 22 15 L38 30 Z'
const IN_R = 'M78 42 Q81 26 78 15 L62 30 Z'
const BLAZE = 'M50 30 Q46.5 40 45 50 Q44 58 40 64 Q34 72 37 80 Q50 89 63 80 Q66 72 60 64 Q56 58 55 50 Q53.5 40 50 30 Z'
const O = '#E8913F'
const D = '#C46B26'

function Mark({ size, face }: { size: number; face: boolean }) {
  // useId puede traer caracteres que no van en un url(#...) de SVG.
  const gid = `gf-logo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FB923C" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={face ? 22 : 24} fill={face ? `url(#${gid})` : '#F97316'} />
      <g transform={face ? 'translate(14 12) scale(.72)' : 'translate(12.5 13) scale(.75)'}>
        {face && <path d="M29 83 Q50 94 71 83" stroke="#fff" strokeWidth={13} fill="none" strokeLinecap="round" />}
        {/* contorno blanco: separa la cabeza naranja del fondo naranja */}
        <g stroke="#fff" strokeWidth={face ? 7 : 9} strokeLinejoin="round" fill="#fff">
          <path d={EAR_L} /><path d={EAR_R} /><ellipse cx="50" cy="57" rx="34" ry="29" />
        </g>
        {face && (
          <>
            <path d="M29 83 Q50 94 71 83" stroke="#D63A3A" strokeWidth={6} fill="none" strokeLinecap="round" />
            <path d="M46.5 91 L48 88.6 L49.3 90 L50.7 90 L52 88.6 L53.5 91 Q54.3 96 50 96.6 Q45.7 96 46.5 91 Z" fill="#C9CDD2" stroke="#9AA0A6" strokeWidth={0.6} />
          </>
        )}
        <path d={EAR_L} fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" /><path d={IN_L} fill="#F3B1AE" />
        <path d={EAR_R} fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" /><path d={IN_R} fill="#F3B1AE" />
        <ellipse cx="50" cy="57" rx="34" ry="29" fill={O} />
        <rect x="40.5" y="31" width="2.6" height="8" rx="1.3" fill={D} />
        <rect x="56.9" y="31" width="2.6" height="8" rx="1.3" fill={D} />
        {face && (
          <>
            <rect x="17" y="54" width="8" height="2.2" rx="1.1" fill={D} /><rect x="18" y="59.5" width="6.5" height="2.2" rx="1.1" fill={D} />
            <rect x="75" y="54" width="8" height="2.2" rx="1.1" fill={D} /><rect x="75.5" y="59.5" width="6.5" height="2.2" rx="1.1" fill={D} />
          </>
        )}
        <path d={BLAZE} fill="#FFFAF3" />
        <ellipse cx="36.5" cy="55.5" rx="7" ry="7" fill="#B9C97A" stroke="#6F7A3A" strokeWidth={0.9} />
        <ellipse cx="63.5" cy="55.5" rx="7" ry="7" fill="#B9C97A" stroke="#6F7A3A" strokeWidth={0.9} />
        <ellipse cx="36.5" cy="55.8" rx={face ? 1.9 : 2.4} ry="5.2" fill="#1F1A17" />
        <ellipse cx="63.5" cy="55.8" rx={face ? 1.9 : 2.4} ry="5.2" fill="#1F1A17" />
        <circle cx="38.6" cy="53" r="1.6" fill="#fff" /><circle cx="65.6" cy="53" r="1.6" fill="#fff" />
        <path d="M46.4 63 Q50 61.8 53.6 63 L50 67.2 Z" fill="#EE9A9C" stroke="#EE9A9C" strokeWidth={1} strokeLinejoin="round" />
        {face && (
          <>
            <path d="M50 67.2 L50 69 M50 69 Q47.6 71.6 45.2 70.2 M50 69 Q52.4 71.6 54.8 70.2" stroke="#8A4B3A" strokeWidth={1.1} fill="none" strokeLinecap="round" />
            <g stroke="#fff" strokeWidth={0.8} strokeLinecap="round" opacity={0.95}>
              <line x1="40" y1="68" x2="19" y2="65" /><line x1="40" y1="70.5" x2="20" y2="73.5" />
              <line x1="60" y1="68" x2="81" y2="65" /><line x1="60" y1="70.5" x2="80" y2="73.5" />
            </g>
          </>
        )}
      </g>
    </svg>
  )
}

interface LogoProps {
  variant?: 'mark' | 'lockup' | 'icon' | 'solid'
  size?: number
  className?: string
}

export function Logo({ variant = 'lockup', size = 32, className = '' }: LogoProps) {
  if (variant === 'solid') {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="GrootFolio" className={className}>
        <path d={HEAD} fill="currentColor" />
      </svg>
    )
  }
  if (variant !== 'lockup') {
    return <span role="img" aria-label="GrootFolio" className={className}><Mark size={size} face={variant === 'icon'} /></span>
  }
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <Mark size={size} face={false} />
      {/* Inter 800, −0.035em. «Folio» en brand-600 sobre claro y brand-400 sobre oscuro. */}
      <span className="text-xl font-extrabold leading-none" style={{ letterSpacing: '-0.035em' }}>
        <span className="text-neutral-900 dark:text-white">Groot</span>
        <span className="text-brand-600 dark:text-brand-400">Folio</span>
      </span>
    </span>
  )
}
