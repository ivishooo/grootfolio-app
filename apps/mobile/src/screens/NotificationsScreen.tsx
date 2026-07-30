/**
 * Notificaciones mobile (F7). Lista con badge por tipo, "Marcar todas leídas",
 * y tap en una de contenido abre los Contenidos y la marca leída. Pull-to-refresh.
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
  return `hace ${Math.floor(h / 24)} d`
}

export function NotificationsScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data, refetch, isRefetching } = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkNotificationRead()
  const notifs = data?.data ?? []

  const onTap = (n: AppNotification) => {
    if (!n.readAt) markOne.mutate(n.id)
    if (n.type === 'content.published') nav.navigate('Main')
  }

  return (
    <Screen>
      <FlatList
        data={notifs}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.brand.solid} />}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '800' }}>Notificaciones</Text>
            {(data?.unreadCount ?? 0) > 0 && (
              <TouchableOpacity onPress={() => markAll.mutate()} hitSlop={8}>
                <Text style={{ color: theme.brand.solid, fontWeight: '700', fontSize: 13 }}>Marcar todas leídas</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const m = ICONS[item.type]
          return (
            <TouchableOpacity onPress={() => onTap(item)} style={{ flexDirection: 'row', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border.default, backgroundColor: item.readAt ? theme.background.surface : 'rgba(249,115,22,0.06)', padding: 14 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{m.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{item.title}</Text>
                {item.body ? <Text style={{ color: theme.text.secondary, fontSize: 13 }} numberOfLines={2}>{item.body}</Text> : null}
                <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 2 }}>{relativeTime(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={<EmptyState title="Sin notificaciones" description="Cuando haya novedades, aparecen acá." />}
      />
    </Screen>
  )
}
