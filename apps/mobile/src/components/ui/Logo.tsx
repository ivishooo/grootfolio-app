/**
 * Logo de GrootFolio para mobile (v2, ADR-0006). Espejo de
 * apps/web/src/components/ui/Logo.tsx con react-native-svg: la cabeza de Groot,
 * igual al avatar pero quieta, sobre el naranja de marca.
 * - `variant="mark"`:   solo el chip (header, tamaños chicos).
 * - `variant="lockup"`: chip + wordmark «GrootFolio».
 * - `variant="icon"`:   ícono de app con bigotes, collar y chapita (login, splash).
 * - `variant="solid"`:  silueta de la cabeza en `color` (por defecto, brand.solid).
 */
import { useId } from 'react'
import { View, Text } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Ellipse, Circle, Line } from 'react-native-svg'
import { brand } from '@grootfolio/tokens'
import { useTheme } from '@/theme/ThemeProvider'

const HEAD = 'M17 50 Q12 26 17 8 Q19 5 22 8 L40 27 Q50 24 60 27 L78 8 Q81 5 83 8 Q88 26 83 50 Q86 72 68 82 Q59 86 50 86 Q41 86 32 82 Q14 72 17 50 Z'
const EAR_L = 'M17 50 Q12 26 17 8 Q19 5 22 8 L45 29 Z'
const EAR_R = 'M83 50 Q88 26 83 8 Q81 5 78 8 L55 29 Z'
const IN_L = 'M22 42 Q19 26 22 15 L38 30 Z'
const IN_R = 'M78 42 Q81 26 78 15 L62 30 Z'
const BLAZE = 'M50 30 Q46.5 40 45 50 Q44 58 40 64 Q34 72 37 80 Q50 89 63 80 Q66 72 60 64 Q56 58 55 50 Q53.5 40 50 30 Z'
const O = '#E8913F'
const D = '#C46B26'

function Mark({ size, face }: { size: number; face: boolean }) {
  // useId trae caracteres (":", "«") que no van en un url(#...) de SVG.
  const gid = `gf-logo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {face && (
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand[400]} />
            <Stop offset="1" stopColor={brand[500]} />
          </LinearGradient>
        </Defs>
      )}
      <Rect width={100} height={100} rx={face ? 22 : 24} fill={face ? `url(#${gid})` : brand[500]} />
      <G transform={face ? 'translate(14 12) scale(.72)' : 'translate(12.5 13) scale(.75)'}>
        {face && <Path d="M29 83 Q50 94 71 83" stroke="#fff" strokeWidth={13} fill="none" strokeLinecap="round" />}
        {/* contorno blanco: separa la cabeza naranja del fondo naranja */}
        <G stroke="#fff" strokeWidth={face ? 7 : 9} strokeLinejoin="round" fill="#fff">
          <Path d={EAR_L} />
          <Path d={EAR_R} />
          <Ellipse cx={50} cy={57} rx={34} ry={29} />
        </G>
        {face && (
          <>
            <Path d="M29 83 Q50 94 71 83" stroke="#D63A3A" strokeWidth={6} fill="none" strokeLinecap="round" />
            <Path
              d="M46.5 91 L48 88.6 L49.3 90 L50.7 90 L52 88.6 L53.5 91 Q54.3 96 50 96.6 Q45.7 96 46.5 91 Z"
              fill="#C9CDD2"
              stroke="#9AA0A6"
              strokeWidth={0.6}
            />
          </>
        )}
        <Path d={EAR_L} fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" />
        <Path d={IN_L} fill="#F3B1AE" />
        <Path d={EAR_R} fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" />
        <Path d={IN_R} fill="#F3B1AE" />
        <Ellipse cx={50} cy={57} rx={34} ry={29} fill={O} />
        <Rect x={40.5} y={31} width={2.6} height={8} rx={1.3} fill={D} />
        <Rect x={56.9} y={31} width={2.6} height={8} rx={1.3} fill={D} />
        {face && (
          <>
            <Rect x={17} y={54} width={8} height={2.2} rx={1.1} fill={D} />
            <Rect x={18} y={59.5} width={6.5} height={2.2} rx={1.1} fill={D} />
            <Rect x={75} y={54} width={8} height={2.2} rx={1.1} fill={D} />
            <Rect x={75.5} y={59.5} width={6.5} height={2.2} rx={1.1} fill={D} />
          </>
        )}
        <Path d={BLAZE} fill="#FFFAF3" />
        <Ellipse cx={36.5} cy={55.5} rx={7} ry={7} fill="#B9C97A" stroke="#6F7A3A" strokeWidth={0.9} />
        <Ellipse cx={63.5} cy={55.5} rx={7} ry={7} fill="#B9C97A" stroke="#6F7A3A" strokeWidth={0.9} />
        <Ellipse cx={36.5} cy={55.8} rx={face ? 1.9 : 2.4} ry={5.2} fill="#1F1A17" />
        <Ellipse cx={63.5} cy={55.8} rx={face ? 1.9 : 2.4} ry={5.2} fill="#1F1A17" />
        <Circle cx={38.6} cy={53} r={1.6} fill="#fff" />
        <Circle cx={65.6} cy={53} r={1.6} fill="#fff" />
        <Path d="M46.4 63 Q50 61.8 53.6 63 L50 67.2 Z" fill="#EE9A9C" stroke="#EE9A9C" strokeWidth={1} strokeLinejoin="round" />
        {face && (
          <>
            <Path
              d="M50 67.2 L50 69 M50 69 Q47.6 71.6 45.2 70.2 M50 69 Q52.4 71.6 54.8 70.2"
              stroke="#8A4B3A"
              strokeWidth={1.1}
              fill="none"
              strokeLinecap="round"
            />
            <G stroke="#fff" strokeWidth={0.8} strokeLinecap="round" opacity={0.95}>
              <Line x1={40} y1={68} x2={19} y2={65} />
              <Line x1={40} y1={70.5} x2={20} y2={73.5} />
              <Line x1={60} y1={68} x2={81} y2={65} />
              <Line x1={60} y1={70.5} x2={80} y2={73.5} />
            </G>
          </>
        )}
      </G>
    </Svg>
  )
}

interface LogoProps {
  variant?: 'mark' | 'lockup' | 'icon' | 'solid'
  size?: number
  /** Solo para `solid`. */
  color?: string
}

export function Logo({ variant = 'lockup', size = 32, color }: LogoProps) {
  const { theme, themeName } = useTheme()

  if (variant === 'solid') {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="GrootFolio">
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d={HEAD} fill={color ?? theme.brand.solid} />
        </Svg>
      </View>
    )
  }

  if (variant !== 'lockup') {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="GrootFolio">
        <Mark size={size} face={variant === 'icon'} />
      </View>
    )
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="GrootFolio"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <Mark size={size} face={false} />
      {/* Inter 800, −0.035em. «Folio» en brand-600 sobre claro y brand-400 sobre oscuro. */}
      <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.7 }}>
        <Text style={{ color: theme.text.primary }}>Groot</Text>
        <Text style={{ color: themeName === 'dark' ? brand[400] : brand[600] }}>Folio</Text>
      </Text>
    </View>
  )
}
