/**
 * Burbujas del asistente, con las mismas reglas duras que la web:
 *
 *  - **Nunca dos naranjas compitiendo**: la del usuario es naranja sólida y la
 *    del bot es neutra con borde.
 *  - El bot lleva **avatar al costado**, así se sabe quién habla sin leer.
 *  - Texto de 14 px o más, nunca gris claro sobre el fondo.
 */
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { ChatMessage } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'
import { Markdown } from '@/components/ui/Markdown'
import { useAssistantTokens } from './tokens'

export function BotAvatar() {
  const t = useAssistantTokens()
  return (
    <View
      accessible={false}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.accentSoft,
      }}
    >
      <Text style={{ color: t.accentInk, fontWeight: '700', fontSize: 11 }}>G</Text>
    </View>
  )
}

export function UserBubble({ content, muted = false }: { content: string; muted?: boolean }) {
  const t = useAssistantTokens()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <View
        style={{
          maxWidth: '86%',
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: t.accentStrong,
          opacity: muted ? 0.75 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{content}</Text>
      </View>
    </View>
  )
}

/** Respuesta del bot: avatar + burbuja neutra, con las acciones debajo. */
export function BotBubble({ content, children }: { content: string; children?: ReactNode }) {
  const { theme } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <BotAvatar />
      <View style={{ flex: 1 }}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border.default,
            backgroundColor: theme.background.muted,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Markdown source={content} />
        </View>
        {children}
      </View>
    </View>
  )
}

/**
 * El error deja de ser una banda suelta al pie: es una burbuja del asistente,
 * en el lugar donde iba a estar la respuesta, con su reintento al lado.
 */
export function ErrorBubble({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <BotAvatar />
      <View
        style={{
          flex: 1,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.danger.solid,
          backgroundColor: theme.danger.subtle,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20 }}>{message}</Text>
        {onRetry && (
          <Text
            accessibilityRole="button"
            onPress={onRetry}
            style={{
              marginTop: 8,
              alignSelf: 'flex-start',
              color: theme.text.secondary,
              fontSize: 13,
              fontWeight: '600',
              borderWidth: 1,
              borderColor: theme.border.default,
              backgroundColor: theme.background.surface,
              borderRadius: 9,
              paddingHorizontal: 10,
              paddingVertical: 6,
              overflow: 'hidden',
            }}
          >
            Reintentar
          </Text>
        )}
      </View>
    </View>
  )
}

export function MessageBubble({ message, children }: { message: ChatMessage; children?: ReactNode }) {
  if (message.role === 'user') return <UserBubble content={message.content} />
  return <BotBubble content={message.content}>{children}</BotBubble>
}
