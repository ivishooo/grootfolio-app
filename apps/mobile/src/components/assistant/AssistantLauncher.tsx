/**
 * Launcher flotante del asistente, equivalente a la burbuja de la web.
 *
 * Reemplaza al ícono de chat que vivía en el `AppHeader`: ahí competía con las
 * notificaciones, el tema y el avatar, y no se leía como "hablá con el
 * asistente" sino como un botón más de la barra.
 *
 * Se posiciona sobre el tab bar (49 pt en iOS) más el safe area, para no tapar
 * los tabs ni quedar debajo del borde inferior del teléfono.
 */
import Svg, { Path } from 'react-native-svg'
import { TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { LAUNCHER_SIZE, useAssistantTokens } from './tokens'

const TAB_BAR_HEIGHT = 49

export function AssistantLauncher({ onOpen }: { onOpen: () => void }) {
  const { theme } = useTheme()
  const t = useAssistantTokens()
  const insets = useSafeAreaInsets()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Abrir el asistente"
      onPress={onOpen}
      activeOpacity={0.85}
      style={{
        position: 'absolute',
        right: 16,
        bottom: TAB_BAR_HEIGHT + insets.bottom + 16,
        width: LAUNCHER_SIZE,
        height: LAUNCHER_SIZE,
        borderRadius: LAUNCHER_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.accent,
        // Sombra para que se lea como una capa por encima del contenido.
        shadowColor: '#F97316',
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          stroke="#fff"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Punto de disponibilidad, como en la web. */}
      <View
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: t.online,
          borderWidth: 2.5,
          borderColor: theme.background.canvas,
        }}
      />
    </TouchableOpacity>
  )
}
