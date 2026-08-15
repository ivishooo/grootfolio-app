/**
 * Panel del asistente. En mobile va **full-screen**, que es lo que el spec pide
 * para menos de 640 px: en un teléfono un panel flotante de 400 px deja bordes
 * inútiles y pelea con el teclado.
 *
 * Es un `Modal`, no una pantalla del stack. Esa es la diferencia de fondo con
 * la versión anterior: el asistente es una **capa sobre la app**, no un destino
 * de navegación. Por eso ya no aparece el "‹ Main" del header nativo, y al
 * cerrarlo se vuelve exactamente a donde estabas.
 */
import type { ReactNode } from 'react'
import Svg, { Path } from 'react-native-svg'
import { KeyboardAvoidingView, Modal, Platform, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { useAssistantTokens } from './tokens'

interface Props {
  visible: boolean
  onClose: () => void
  onNewConversation?: () => void
  children: ReactNode
}

function IconButton({
  label,
  onPress,
  d,
}: {
  label: string
  onPress: () => void
  d: string
}) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // 44 pt de área de toque aunque el ícono sea de 20: regla dura del spec.
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d={d} stroke={theme.text.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  )
}

export function AssistantPanel({ visible, onClose, onNewConversation, children }: Props) {
  const { theme } = useTheme()
  const t = useAssistantTokens()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.background.canvas, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 16,
            paddingRight: 4,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.border.default,
            backgroundColor: theme.background.surface,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.accentSoft,
            }}
          >
            <Text style={{ color: t.accentInk, fontWeight: '700', fontSize: 13 }}>G</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 15, fontWeight: '700' }}>
              Asistente GrootFolio
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.online }} />
              <Text style={{ color: theme.text.muted, fontSize: 12 }}>En línea</Text>
            </View>
          </View>

          {onNewConversation && (
            <IconButton label="Nueva conversación" onPress={onNewConversation} d="M12 5v14M5 12h14" />
          )}
          <IconButton label="Cerrar el asistente" onPress={onClose} d="M18 6 6 18M6 6l12 12" />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 10) }}>{children}</View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
