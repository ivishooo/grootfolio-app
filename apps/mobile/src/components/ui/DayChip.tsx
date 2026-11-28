/**
 * Chip «▲ 1,2 % hoy» (GF-019). Espejo de apps/web/.../ui/DayChip: variación del
 * día con el `dayChangePercent` de GET /portfolio. Sin dato (`null`) no se
 * dibuja: un «0 %» diría que no se movió, y eso no lo sabemos.
 */
import { Text, View } from 'react-native'
import { formatPctArrow } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'

export function DayChip({ pct, size = 'md', testID }: { pct: number | null | undefined; size?: 'sm' | 'md'; testID?: string }) {
  const { theme } = useTheme()
  if (pct === null || pct === undefined) return null
  const up = pct >= 0
  const sm = size === 'sm'
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${up ? 'Subió' : 'Bajó'} ${Math.abs(pct).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % hoy`}
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: sm ? 6 : 8,
        paddingVertical: 2,
        backgroundColor: up ? theme.trend.posSoft : theme.trend.negSoft,
      }}
    >
      <Text style={{ color: up ? theme.trend.pos : theme.trend.neg, fontSize: sm ? 11 : 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
        {formatPctArrow(pct)} hoy
      </Text>
    </View>
  )
}
