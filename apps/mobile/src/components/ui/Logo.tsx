/**
 * Logo de marca GrootFolio para mobile (F1). Espejo del componente web con
 * react-native-svg. Silueta de gato (blanca) sobre chip naranja de marca.
 * - `variant="mark"`: solo el chip.
 * - `variant="lockup"`: chip + wordmark "GrootFolio" (Groot neutro, Folio brand).
 */
import { View, Text } from 'react-native'
import Svg, { Rect, Path, G } from 'react-native-svg'
import { useTheme } from '@/theme/ThemeProvider'

// Geometría canónica del gato (viewBox 0 0 100 100), escalada dentro del chip 64.
const CAT_PATH =
  'M25 50 Q21 30 21 14 Q22 11 25 13 L41 34 Q50 30 59 34 L75 13 Q78 11 79 14 Q79 30 75 50 Q81 65 68 79 Q59 89 50 89 Q41 89 32 79 Q19 65 25 50 Z'

interface LogoProps {
  variant?: 'mark' | 'lockup'
  size?: number
}

export function Logo({ variant = 'lockup', size = 32 }: LogoProps) {
  const { theme } = useTheme()

  const chip = (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={15} fill={theme.brand.solid} />
      <G transform="translate(6.6,5.4) scale(0.51)">
        <Path d={CAT_PATH} fill={theme.text.onBrand} />
      </G>
    </Svg>
  )

  if (variant === 'mark') return chip

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {chip}
      <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
        <Text style={{ color: theme.text.primary }}>Groot</Text>
        <Text style={{ color: theme.brand.solid }}>Folio</Text>
      </Text>
    </View>
  )
}
