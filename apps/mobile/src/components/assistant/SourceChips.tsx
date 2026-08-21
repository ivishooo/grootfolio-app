/**
 * Fuentes de una respuesta, como chips (en la web abren el artículo en la Base
 * de conocimiento).
 *
 * Van **agrupadas por artículo**, igual que en la web: el retrieval devuelve
 * fragmentos y varios suelen salir del mismo texto; sin agrupar, la fila se lee
 * como un menú de sugerencias en vez de como la cita de una fuente.
 *
 * Acá **no son tocables**: mobile todavía no tiene lector de la KB para un
 * usuario común — `AdminKbScreen` es el CRUD del panel de administración, no
 * una pantalla de lectura. Un chip que parece un link y no lleva a ningún lado
 * es peor que uno que se lee como etiqueta, así que quedan informativos hasta
 * que exista la pantalla.
 */
import { Text, View } from 'react-native'
import { groupSourcesByArticle } from '@grootfolio/shared'
import type { ChatMessage } from '@grootfolio/shared'
import { useTheme } from '@/theme/ThemeProvider'

export function SourceChips({ message }: { message: ChatMessage }) {
  const { theme } = useTheme()
  if (!message.grounded || message.sources.length === 0) return null

  const sources = groupSourcesByArticle(message.sources)

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {sources.map((source) => (
        <View
          key={source.articleId}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1,
            borderColor: theme.border.default,
            backgroundColor: theme.background.surface,
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 4,
            maxWidth: '100%',
          }}
        >
          <View
            style={{
              width: 9,
              height: 11,
              borderRadius: 2,
              borderWidth: 1,
              borderColor: theme.text.muted,
            }}
          />
          <Text numberOfLines={1} style={{ color: theme.text.secondary, fontSize: 11, flexShrink: 1 }}>
            {source.title}
            {source.headings.length > 1 ? ` · ${source.headings.length}` : ''}
          </Text>
        </View>
      ))}
    </View>
  )
}
