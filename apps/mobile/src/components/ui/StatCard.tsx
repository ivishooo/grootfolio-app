import { Text } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string
  delta?: string
  deltaColor?: string
  /** Identificador estable para los flows de Maestro. */
  testID?: string
}

export function StatCard({ label, value, delta, deltaColor, testID }: StatCardProps) {
  const { theme } = useTheme()

  return (
    <Card testID={testID}>
      <Text style={{ color: theme.text.secondary }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700' }}>{value}</Text>
      {delta && <Text style={{ color: deltaColor ?? theme.text.muted, marginTop: 4 }}>{delta}</Text>}
    </Card>
  )
}
