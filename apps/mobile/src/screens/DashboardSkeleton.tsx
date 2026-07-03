/**
 * Skeleton del Dashboard mobile (GF-229): espeja el layout (stat cards,
 * distribucion, rendimiento y lista de activos) mientras carga el portfolio.
 */
import { View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={{ gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <Card key={`stat-${i}`}>
          <View style={{ gap: 8 }}>
            <Skeleton width={96} height={12} />
            <Skeleton width={140} height={22} />
            <Skeleton width={64} height={10} />
          </View>
        </Card>
      ))}

      <Card title="Distribucion del Portafolio">
        <Skeleton height={12} radius={6} />
        <View style={{ gap: 8, marginTop: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={`dist-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Skeleton width={10} height={10} radius={5} />
              <Skeleton width={90} height={12} style={{ flex: 1 }} />
              <Skeleton width={70} height={12} />
            </View>
          ))}
        </View>
      </Card>

      <Card title="Rendimiento mensual">
        <Skeleton height={160} radius={8} style={{ backgroundColor: theme.background.muted }} />
      </Card>

      <Card title="Mis Activos">
        {[0, 1, 2, 3].map((i) => (
          <View key={`row-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
            <Skeleton width={120} height={14} />
            <Skeleton width={80} height={14} />
          </View>
        ))}
      </Card>
    </View>
  )
}
