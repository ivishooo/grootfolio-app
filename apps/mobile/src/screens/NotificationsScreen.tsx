/**
 * Notificaciones mobile (F7; rediseño v2, Fase 6). SPEC-pantallas ›
 * Notificaciones: fila de padding 14 y radio 14, ícono de 30 por tipo; las no
 * leídas con fondo brand.tint, título 600 y punto de 8 brand.solid. Tocar una de
 * contenido abre Aprender y la marca leída. Pull-to-refresh.
 *
 * El tipo `groot.drop` depende de la variación diaria en `GET /portfolio`.
 */
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AppNotification } from '@grootfolio/shared'
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { Screen } from '@/components/ui/Screen'
import { EmptyState } from '@/components/ui/States'

const ICONS: Record<AppNotification['type'], { icon: string; color: string }> = {
  'content.published': { icon: '↑', color: '#F97316' },
  'profile.moderated': { icon: '⚐', color: '#D97706' },
  'account.suspended': { icon: '⊘', color: '#DC2626' },
}

function relativeTime(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} d`
}

export function NotificationsScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data, refetch, isRefetching, isLoading } = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkNotificationRead()
  const notifs = data?.data ?? []

  const onTap = (n: AppNotification) => {
    if (!n.readAt) markOne.mutate(n.id)
    if (n.type === 'content.published') nav.navigate('Main', { screen: 'Content' })
    else if (n.type === 'profile.moderated') nav.navigate('Settings')
  }

  return (
    <Screen>
      <FlatList
        data={notifs}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.brand.solid} />}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
              Notificaciones
            </Text>
            {(data?.unreadCount ?? 0) > 0 && (
              <TouchableOpacity onPress={() => markAll.mutate()} accessibilityRole="button" style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 6 }}>
                <Text style={{ color: theme.brand.ink, fontWeight: '600', fontSize: 13 }}>Marcar todas leídas</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const m = ICONS[item.type]
          const unread = !item.readAt
          return (
            <TouchableOpacity
              onPress={() => onTap(item)}
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${item.title}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border.default,
                backgroundColor: unread ? theme.brand.tint : theme.background.surface,
              }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{m.icon}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: unread ? '600' : '500' }}>{item.title}</Text>
                {item.body ? <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 18 }}>{item.body}</Text> : null}
                <Text style={{ color: theme.text.muted, fontSize: 11.5, marginTop: 2 }}>{relativeTime(item.createdAt)}</Text>
              </View>
              {unread && <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: theme.brand.solid }} />}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={isLoading ? null : <EmptyState title="Sin notificaciones" description="Cuando haya novedades, aparecen acá." />}
      />
    </Screen>
  )
}
