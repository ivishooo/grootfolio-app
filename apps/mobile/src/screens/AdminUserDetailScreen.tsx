/**
 * Admin · Detalle de usuario mobile (F7). Pantalla completa: avatar, stats 2×2,
 * actividad reciente y acciones Moderar / Suspender-Reactivar. Reusa los sheets
 * de AdminUsersScreen.
 */
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { formatCurrency } from '@grootfolio/shared'
import { useAdminUser, useUnsuspendUser } from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { Screen } from '@/components/ui/Screen'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { SuspendSheet, ModerateSheet } from './AdminUsersScreen'

const GREEN = '#16A34A'
const RED = '#DC2626'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

export function AdminUserDetailScreen() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const route = useRoute<RouteProp<RootStackParamList, 'AdminUserDetail'>>()
  const { data, isLoading } = useAdminUser(route.params.id)
  const unsuspend = useUnsuspendUser()
  const [showSuspend, setShowSuspend] = useState(false)
  const [showModerate, setShowModerate] = useState(false)

  if (isLoading || !data) {
    return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.text.muted }}>Cargando…</Text></View></Screen>
  }
  const u = data.user
  const suspended = u.status === 'suspended'

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <UserAvatar user={u} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '800' }}>{u.fullName || 'Sin nombre'}</Text>
            <Text style={{ color: theme.text.muted, fontSize: 13 }}>{u.email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: suspended ? RED : GREEN }} />
              <Text style={{ color: suspended ? RED : GREEN, fontSize: 13, fontWeight: '600' }}>{suspended ? 'Suspendido' : 'Activo'}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat label="Valor del portafolio" value={formatCurrency(data.portfolioValue)} />
          <Stat label="Transacciones" value={String(data.transactionsCount)} />
          <Stat label="Alta" value={formatDate(u.createdAt)} />
          <Stat label="Rol" value={u.role === 'admin' ? 'Admin' : 'Usuario'} />
        </View>

        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 16 }}>
          <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 8 }}>Actividad reciente</Text>
          {data.recentActivity.length === 0 ? (
            <Text style={{ color: theme.text.muted, fontSize: 13 }}>Sin actividad registrada.</Text>
          ) : (
            data.recentActivity.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>{a.label}</Text>
                <Text style={{ color: theme.text.muted, fontSize: 12 }}>{formatDate(a.at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setShowModerate(true)} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Moderar perfil</Text>
          </TouchableOpacity>
          {suspended ? (
            <TouchableOpacity onPress={() => unsuspend.mutate(u.id, { onSuccess: () => toast('Suspensión levantada', 'success') })} style={{ flex: 1, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Reactivar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowSuspend(true)} style={{ flex: 1, backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Suspender</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {showSuspend && <SuspendSheet target={u} selectedIds={[]} onClose={() => setShowSuspend(false)} onDone={() => setShowSuspend(false)} />}
      {showModerate && <ModerateSheet user={u} onClose={() => setShowModerate(false)} />}
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ width: '47%', flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: theme.border.default, padding: 12 }}>
      <Text style={{ color: theme.text.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  )
}
