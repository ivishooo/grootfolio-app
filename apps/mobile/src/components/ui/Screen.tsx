import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface ScreenProps {
  children: ReactNode
}

export function Screen({ children }: ScreenProps) {
  const { theme } = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.background.canvas }}>{children}</View>
}
