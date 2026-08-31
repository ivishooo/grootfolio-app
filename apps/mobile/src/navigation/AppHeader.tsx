import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import { brand } from '@grootfolio/tokens'
import { Logo } from '@/components/ui/Logo'
import { BellIcon } from '@/components/ui/icons'
import { useNotifications } from '@/lib/queries'
import type { RootStackParamList } from './RootNavigator'

/** Minimo de area tactil recomendado por las HIG de Apple. */
const TAP_MIN = 44
/** El avatar se dibuja mas chico que su area tactil, para no engordar la barra. */
const AVATAR_SIZE = 34

export function AppHeader() {
  const { theme, themeName, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: notif } = useNotifications()
  const unread = notif?.unreadCount ?? 0
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user?.fullName ?? user?.email ?? 'Usuario'
  const initials =
    displayName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: theme.background.surface, borderBottomColor: theme.border.default }]}>
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <Logo variant="lockup" size={26} />
        </View>

        {/*
          El asistente ya no vive acá: se abre desde el launcher flotante
          (`components/assistant`). En la barra competía con las notificaciones,
          el tema y el avatar, y no se leía como "hablá con el asistente".
        */}
        <View style={styles.actions}>
          {/*
            Los tres botones de la barra son solo-ícono. Sin `accessibilityLabel`
            un lector de pantalla no tiene nada que anunciar: la campana no
            figuraba siquiera en la jerarquía de accesibilidad (el ícono es un
            SVG sin texto), o sea que el acceso a Notificaciones no existía para
            quien navega con VoiceOver. El tema se anunciaba "☀️" y el avatar,
            las iniciales.
          */}
          <TouchableOpacity
            onPress={() => nav.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0
                ? `Notificaciones, ${unread} sin leer`
                : 'Notificaciones'
            }
            style={[styles.iconBtn, { backgroundColor: theme.background.muted }]}
          >
            <BellIcon color={theme.text.primary} size={20} />
            {/* El punto rojo es decorativo: lo que cuenta va en el label. */}
            {unread > 0 && (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel="Cambiar tema"
            accessibilityValue={{ text: themeName === 'light' ? 'Claro' : 'Oscuro' }}
            accessibilityHint="Alterna entre el modo claro y el oscuro"
            style={[styles.iconBtn, { backgroundColor: theme.background.muted }]}
          >
            <Text accessibilityElementsHidden importantForAccessibility="no" style={{ fontSize: 18 }}>
              {themeName === 'light' ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Cuenta de ${displayName}`}
            accessibilityHint="Abre el menú de la cuenta"
            style={styles.avatarBtn}
          >
            {user?.avatarUrl ? (
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no"
                source={{ uri: user.avatarUrl }}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
              />
            ) : (
              <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.avatarText}>
                {initials}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: theme.background.surface, borderColor: theme.border.default }]}>
            <Text style={[styles.menuName, { color: theme.text.primary }]}>{displayName}</Text>
            <Text style={[styles.menuEmail, { color: theme.text.muted }]}>{user?.email ?? ''}</Text>
            <View style={[styles.separator, { backgroundColor: theme.border.default }]} />
            <TouchableOpacity
              onPress={() => { setMenuOpen(false); logout() }}
              style={styles.menuItem}
            >
              <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: 1 },
  inner: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { height: 32, width: 32, borderRadius: 10, backgroundColor: brand[500], alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // 44x44 es el minimo de las Human Interface Guidelines. Estaban en 36 y 34.
  iconBtn: { height: TAP_MIN, width: TAP_MIN, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { height: TAP_MIN, width: TAP_MIN, borderRadius: TAP_MIN / 2, backgroundColor: brand[500], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 16 },
  menu: { width: 220, borderRadius: 14, borderWidth: 1, padding: 16 },
  menuName: { fontSize: 15, fontWeight: '700' },
  menuEmail: { fontSize: 13, marginTop: 2 },
  separator: { height: 1, marginVertical: 12 },
  menuItem: { paddingVertical: 6 },
})
