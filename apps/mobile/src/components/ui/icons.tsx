/**
 * Íconos de línea (rediseño GF) — espejo de los SVG del sidebar web, en
 * react-native-svg. Heredan el color por prop y sirven para el TabNavigator y
 * el resultado del test de perfil.
 *
 * Firma: ({ color, size = 22 }) => JSX. Todos con viewBox 0 0 24 24.
 */
import Svg, { Rect, Path, Circle } from 'react-native-svg'
import type { RiskProfileType } from '@grootfolio/shared'

interface IconProps {
  color: string
  size?: number
}

const STROKE = 1.9

function Base({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  )
}

const line = (color: string) => ({
  stroke: color,
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function DashboardIcon({ color, size }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Rect x="3" y="3" width="7" height="7" rx="1.5" {...s} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" {...s} />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" {...s} />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" {...s} />
    </Base>
  )
}

export function AssetsIcon({ color, size }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Rect x="3" y="6" width="18" height="13" rx="2" {...s} />
      <Path d="M3 10h18" {...s} />
      <Circle cx="16.5" cy="13.5" r="1.1" {...s} />
    </Base>
  )
}

export function ReportsIcon({ color, size }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Path d="M4 20h16" {...s} />
      <Rect x="6" y="11" width="3" height="7" rx="1" {...s} />
      <Rect x="10.5" y="7" width="3" height="11" rx="1" {...s} />
      <Rect x="15" y="13" width="3" height="5" rx="1" {...s} />
    </Base>
  )
}

export function QuizIcon({ color, size }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Rect x="5" y="4" width="14" height="17" rx="2" {...s} />
      <Path d="M9 4h6v2.5H9z" {...s} />
      <Path d="M8.8 13l1.8 1.8L14 11.2" {...s} />
    </Base>
  )
}

export function SettingsIcon({ color, size }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Path d="M4 8h9" {...s} />
      <Circle cx="16" cy="8" r="2.2" {...s} />
      <Path d="M4 16h4" {...s} />
      <Circle cx="11" cy="16" r="2.2" {...s} />
      <Path d="M15 16h5" {...s} />
    </Base>
  )
}

/** Ojo abierto (contraseña oculta → tocar para ver). */
export function EyeIcon({ color, size = 20 }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...s} />
      <Circle cx="12" cy="12" r="3" {...s} />
    </Base>
  )
}

/** Ojo tachado (contraseña visible → tocar para ocultar). */
export function EyeOffIcon({ color, size = 20 }: IconProps) {
  const s = line(color)
  return (
    <Base size={size}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...s} />
      <Circle cx="12" cy="12" r="3" {...s} />
      <Path d="M3 3l18 18" {...s} />
    </Base>
  )
}

/** Ícono por perfil de inversor: escudo (conservador), balanza (moderado), flecha (agresivo). */
export function ProfileIcon({ profile, color, size = 40 }: IconProps & { profile: RiskProfileType }) {
  const s = line(color)
  if (profile === 'conservative') {
    return (
      <Base size={size}>
        <Path d="M12 3l7 3v5c0 4.5-3 7.2-7 8.5C8 18.2 5 15.5 5 11V6z" {...s} />
        <Path d="M9 12l2 2 4-4.5" {...s} />
      </Base>
    )
  }
  if (profile === 'moderate') {
    return (
      <Base size={size}>
        <Path d="M12 4v16" {...s} />
        <Path d="M5 8h14" {...s} />
        <Path d="M5 8l-2.5 5a3 3 0 006 0z" {...s} />
        <Path d="M19 8l-2.5 5a3 3 0 006 0z" {...s} />
      </Base>
    )
  }
  return (
    <Base size={size}>
      <Path d="M4 15l6-6 4 4 6-7" {...s} />
      <Path d="M20 6h-4M20 6v4" {...s} />
    </Base>
  )
}
