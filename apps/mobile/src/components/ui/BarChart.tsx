/**
 * Gráfico de barras con escala. Reemplaza a las barras sueltas que tenían el
 * Dashboard y los Reportes, que escalaban contra el máximo de la serie y no
 * mostraban ninguna referencia: con dos meses de valores parecidos se veían dos
 * bloques macizos del mismo alto, que no comunicaban nada.
 *
 * Lo que agrega, que es lo mínimo para que un gráfico se pueda leer:
 * el valor máximo como línea de referencia arriba, la línea de base en cero, y
 * el valor de cada barra cuando la serie es corta. Las barras siguen escalando
 * desde cero: arrancar el eje en otro lado exagera diferencias chicas.
 *
 * Sin dependencias nuevas a propósito (`victory-native` está declarado pero no
 * es usable: la v41 necesita react-native-skia, que no está instalado).
 */
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export interface BarChartPoint {
  label: string
  value: number
}

interface BarChartProps {
  data: BarChartPoint[]
  color: string
  /** Formato del valor máximo y de las etiquetas. Default: número compacto. */
  formatValue?: (value: number) => string
  height?: number
  /** Hasta cuántas barras vale la pena etiquetar una por una. */
  maxLabelledBars?: number
}

const compact = (value: number): string => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toFixed(abs < 10 ? 1 : 0)
}

export function BarChart({
  data,
  color,
  formatValue = compact,
  height = 160,
  maxLabelledBars = 6,
}: BarChartProps) {
  const { theme } = useTheme()

  const max = Math.max(...data.map((d) => d.value), 0)
  const showValues = data.length <= maxLabelledBars
  // Sin valores positivos no hay escala posible: se dibuja el eje vacío en vez
  // de barras arbitrarias.
  const scale = max > 0 ? max : 1

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={
      `Gráfico de barras. Máximo ${formatValue(max)}. ` +
      data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')
    }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={{ color: theme.text.muted, fontSize: 10, fontWeight: '600' }}>
          {formatValue(max)}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border.default }} />
      </View>

      <View style={{ flexDirection: 'row', height, gap: 6, alignItems: 'flex-end' }}>
        {data.map((point) => (
          <View key={point.label} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            {showValues && (
              <Text
                numberOfLines={1}
                style={{ color: theme.text.muted, fontSize: 10, textAlign: 'center', marginBottom: 2 }}
              >
                {formatValue(point.value)}
              </Text>
            )}
            <View
              style={{
                height: `${Math.max(0, Math.min(point.value / scale, 1)) * 100}%`,
                minHeight: point.value > 0 ? 4 : 0,
                borderRadius: 4,
                backgroundColor: color,
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: theme.border.default, marginTop: 2 }} />

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {data.map((point) => (
          <Text
            key={point.label}
            numberOfLines={1}
            style={{ flex: 1, color: theme.text.muted, fontSize: 11, textAlign: 'center' }}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  )
}
