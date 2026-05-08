import { View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface ProgressBarProps {
  value: number
  height?: number
  fillColor?: string
}

export function ProgressBar({ value, height = 8, fillColor }: ProgressBarProps) {
  const { theme } = useTheme()
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <View style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: theme.background.muted }}>
      <View style={{ height: '100%', borderRadius: height / 2, width: `${clamped}%`, backgroundColor: fillColor ?? theme.brand.solid }} />
    </View>
  )
}
