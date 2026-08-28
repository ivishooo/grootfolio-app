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
}

const paddings = { sm: 12, md: 16, lg: 20 } as const

export function Card({ title, padding = 'md', children, style, testID }: CardProps) {
  const { theme } = useTheme()

  return (
    <View testID={testID} style={[{ borderWidth: 1, borderRadius: 18, padding: paddings[padding], backgroundColor: theme.background.surface, borderColor: theme.border.default }, style]}>
      {title && <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>{title}</Text>}
      {children}
    </View>
  )
}
