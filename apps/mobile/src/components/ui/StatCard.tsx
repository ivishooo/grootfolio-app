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
  /**
   * Como se nombra el delta al leerlo en voz alta. Por defecto "variación";
   * en las tarjetas de portafolio conviene "rentabilidad".
   */
  deltaLabel?: string
}

export function StatCard({ label, value, delta, deltaColor, testID, deltaLabel = 'variación' }: StatCardProps) {
  const { theme } = useTheme()

  /*
    Sin agrupar, el lector de pantalla lee tres elementos sueltos: "Valor total",
    "US$ 97.342" y "-82,5%". El tercero queda huerfano — se escucha un porcentaje
    sin saber de que. Agrupada, la tarjeta se anuncia entera y en orden.
    El guion largo que devuelve `formatPercent` para los valores nulos se lee
    "sin dato" en vez de "raya".
  */
  const deltaHablado = delta === '—' ? 'sin dato' : delta
  const etiqueta = [`${label}: ${value}`, deltaHablado ? `${deltaLabel} ${deltaHablado}` : '']
    .filter(Boolean)
    .join(', ')

  return (
    <Card testID={testID} accessible accessibilityLabel={etiqueta}>
      <Text style={{ color: theme.text.secondary }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700' }}>{value}</Text>
      {delta && <Text style={{ color: deltaColor ?? theme.text.muted, marginTop: 4 }}>{delta}</Text>}
    </Card>
  )
}
