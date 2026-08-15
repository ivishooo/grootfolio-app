/**
 * Estado de bienvenida. Mismo contenido que la web: saludo con nombre,
 * aclaración de alcance, un label que agrupa y tarjetas con ícono, pregunta y
 * subtítulo de qué va a pasar al tocarlas.
 *
 * Antes era un párrafo suelto y tres botones planos flotando sobre una pantalla
 * casi vacía; el subtítulo es lo que convierte un botón en una promesa.
 */
import Svg, { Path } from 'react-native-svg'
import { Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { useAssistantTokens } from './tokens'

type IconKind = 'doc' | 'chart' | 'shield'

const SUGGESTIONS: { question: string; hint: string; icon: IconKind }[] = [
  { question: '¿Cómo cargo una transacción?', hint: 'Guía paso a paso · 30 s', icon: 'doc' },
  { question: '¿Qué es el P&L no realizado?', hint: 'Concepto explicado con ejemplo', icon: 'chart' },
  { question: '¿Para qué sirve diversificar?', hint: 'Cómo se reparte el riesgo', icon: 'shield' },
]

const PATHS: Record<IconKind, string> = {
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
}

function SuggestionIcon({ kind }: { kind: IconKind }) {
  const t = useAssistantTokens()
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.accentSoft,
      }}
    >
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
        <Path
          d={PATHS[kind]}
          stroke={t.accentInk}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

export function SuggestionCards({ onPick }: { onPick: (question: string) => void }) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const firstName = user?.fullName?.trim().split(' ')[0]

  return (
    <View style={{ gap: 16, paddingTop: 4 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text.primary, fontSize: 17, fontWeight: '700' }}>
          {firstName ? `Hola ${firstName}` : 'Hola'}
        </Text>
        <Text style={{ color: theme.text.secondary, fontSize: 14, lineHeight: 20 }}>
          Puedo ayudarte con el uso de GrootFolio y con los temas de inversión que documentamos.
          Si algo no está documentado, te lo digo — no lo invento.
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: theme.text.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          Empezá por acá
        </Text>

        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.question}
            accessibilityRole="button"
            accessibilityLabel={`${s.question}. ${s.hint}`}
            onPress={() => onPick(s.question)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: theme.border.default,
              backgroundColor: theme.background.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 11,
            }}
          >
            <SuggestionIcon kind={s.icon} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '600' }}>
                {s.question}
              </Text>
              <Text style={{ color: theme.text.muted, fontSize: 12, marginTop: 2 }}>{s.hint}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
