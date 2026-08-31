import type { ReactNode } from 'react'
import { View, Text, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface CardProps {
  title?: string
  padding?: 'sm' | 'md' | 'lg'
  children: ReactNode
  style?: ViewStyle
  /** Identificador estable para los flows de Maestro. */
  testID?: string
  /** Agrupa la tarjeta en un solo elemento para el lector de pantalla. */
  accessible?: boolean
  /** Texto que anuncia el lector cuando la tarjeta esta agrupada. */
  accessibilityLabel?: string
}

const paddings = { sm: 12, md: 16, lg: 20 } as const

export function Card({ title, padding = 'md', children, style, testID, accessible, accessibilityLabel }: CardProps) {
  const { theme } = useTheme()

  return (
    <View
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={[{ borderWidth: 1, borderRadius: 18, padding: paddings[padding], backgroundColor: theme.background.surface, borderColor: theme.border.default }, style]}>
      {title && <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>{title}</Text>}
      {children}
    </View>
  )
}
