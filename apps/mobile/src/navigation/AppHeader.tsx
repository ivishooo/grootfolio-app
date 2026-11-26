import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getFocusedRouteNameFromRoute, useNavigation, type NavigationState, type Route } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Path } from 'react-native-svg'
import type { RiskProfileType } from '@grootfolio/shared'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import { Logo } from '@/components/ui/Logo'
import { BellIcon } from '@/components/ui/icons'
import { useNotifications, useQuizResult } from '@/lib/queries'
import type { RootStackParamList } from './RootNavigator'

/** Minimo de area tactil recomendado por las HIG de Apple. */
const TAP_MIN = 44

/** Cómo se llama cada pantalla en el «‹ Volver a …» del header. */
const SCREEN_LABEL: Record<string, string> = {
  Dashboard: 'Inicio',
  Assets: 'Activos',
  Reports: 'Reportes',
  Content: 'Aprender',
  ProfileTest: 'Perfil de inversor',
  ProfileResult: 'Perfil de inversor',
  Settings: 'Configuración',
  Notifications: 'Notificaciones',
  AdminUsers: 'Usuarios',
  AdminUserDetail: 'Usuario',
  AdminContent: 'Contenidos',
  AdminKb: 'Base de conocimiento',
}

const PROFILE_LABEL: Record<RiskProfileType, string> = {
  conservative: 'Conservador',
  moderate: 'Moderado',
  aggressive: 'Agresivo',
}

/** Nombre de la pantalla anterior en el stack. Si es `Main`, la tab que estaba abierta. */
function previousLabel(state: NavigationState | undefined): string {
  if (!state || state.index < 1) return 'Inicio'
  const prev = state.routes[state.index - 1] as Route<string>
  const name = prev.name === 'Main' ? (getFocusedRouteNameFromRoute(prev) ?? 'Dashboard') : prev.name
  return SCREEN_LABEL[name] ?? 'Volver'
}

// Íconos del menú de la cuenta (mismas paths que el sidebar web).
const MENU_ICON = {
  perfil: 'M5 4h14v17H5zM9 4h6v2.5H9zM8.8 13l1.8 1.8L14 11.2',
  ajustes:
    'M4 8h9M13.8 8a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M4 16h4M8.8 16a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M15 16h5',
  admin: 'M5.8 8a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9',
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
} as const

function MenuIcon({ d, color }: { d: string; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function UserBadge({ size, initials, avatarUrl }: { size: number; initials: string; avatarUrl?: string | null }) {
  const { theme } = useTheme()
  if (avatarUrl) {
    return <Image accessibilityElementsHidden importantForAccessibility="no" source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
        {initials}
      </Text>
    </View>
  )
}

interface AppHeaderProps {
  /** Pantalla empujada: «‹ {pantalla anterior}» en lugar del lockup. */
  back?: boolean
}

export function AppHeader({ back = false }: AppHeaderProps) {
  const { theme } = useTheme()
  const { user, logout } = useAuth()
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { data: notif } = useNotifications()
  const { data: quiz } = useQuizResult()
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

  const go = (fn: () => void) => {
    setMenuOpen(false)
    fn()
  }

  const menuItems = [
    { key: 'perfil', label: 'Perfil de inversor', hint: quiz ? PROFILE_LABEL[quiz.profile] : '', icon: MENU_ICON.perfil, color: theme.text.primary, onPress: () => nav.navigate('ProfileTest') },
    { key: 'ajustes', label: 'Configuración', hint: '', icon: MENU_ICON.ajustes, color: theme.text.primary, onPress: () => nav.navigate('Settings') },
    ...(user?.role === 'admin'
      ? [{ key: 'admin', label: 'Administración', hint: '', icon: MENU_ICON.admin, color: theme.text.primary, onPress: () => nav.navigate('AdminUsers') }]
      : []),
    { key: 'salir', label: 'Cerrar sesión', hint: '', icon: MENU_ICON.salir, color: theme.trend.neg, onPress: () => logout() },
  ]

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: theme.background.surface, borderBottomColor: theme.border.default }]}>
      <View style={styles.inner}>
        {back ? (
          <TouchableOpacity
            testID="header-volver"
            onPress={() => nav.goBack()}
            accessibilityRole="button"
            accessibilityLabel={`Volver a ${previousLabel(nav.getState())}`}
            style={styles.backBtn}
          >
            <Text style={{ color: theme.text.primary, fontSize: 26, lineHeight: 28, marginTop: -2 }}>‹</Text>
            <Text numberOfLines={1} style={{ color: theme.text.secondary, fontSize: 15, fontWeight: '500' }}>
              {previousLabel(nav.getState())}
            </Text>
          </TouchableOpacity>
        ) : (
          <Logo variant="lockup" size={28} />
        )}

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={() => nav.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
          style={[styles.iconBtn, { backgroundColor: theme.background.muted }]}
        >
          <BellIcon color={theme.text.primary} size={20} />
          {/* El punto rojo es decorativo: lo que cuenta va en el label. */}
          {unread > 0 && (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: theme.background.muted }}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          testID="header-cuenta"
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Cuenta de ${displayName}`}
          accessibilityHint="Abre el menú de la cuenta"
          style={styles.avatarBtn}
        >
          <UserBadge size={TAP_MIN} initials={initials} avatarUrl={user?.avatarUrl} />
        </TouchableOpacity>
      </View>

      {/* Menú de la cuenta: hoja inferior, radio superior 22, handle de 40×5, ítems de 52. */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} accessibilityLabel="Cerrar el menú" />
        <View style={[styles.sheet, { backgroundColor: theme.background.surface, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />
          <View style={[styles.sheetHead, { borderBottomColor: theme.border.default }]}>
            <UserBadge size={44} initials={initials} avatarUrl={user?.avatarUrl} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 15, fontWeight: '700' }}>
                {displayName}
              </Text>
              <Text numberOfLines={1} style={{ color: theme.text.muted, fontSize: 13, marginTop: 2 }}>
                {user?.email ?? ''}
              </Text>
            </View>
          </View>
          {menuItems.map((m) => (
            <TouchableOpacity
              key={m.key}
              testID={`menu-${m.key}`}
              onPress={() => go(m.onPress)}
              accessibilityRole="button"
              style={styles.menuItem}
            >
              <MenuIcon d={m.icon} color={m.color} />
              <Text style={{ flex: 1, color: m.color, fontSize: 15, fontWeight: '500' }}>{m.label}</Text>
              {m.hint ? <Text style={{ color: theme.text.muted, fontSize: 13.5 }}>{m.hint}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: 1 },
  inner: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  backBtn: { minHeight: TAP_MIN, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: -4, paddingRight: 8, flexShrink: 1 },
  // 44x44 es el minimo de las Human Interface Guidelines.
  iconBtn: { height: TAP_MIN, width: TAP_MIN, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { height: TAP_MIN, width: TAP_MIN, borderRadius: TAP_MIN / 2, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: 8, marginBottom: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, marginBottom: 4 },
  menuItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
})
