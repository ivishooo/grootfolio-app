/**
 * Admin · Usuarios mobile (F7; rediseño v2, Fase 6). KPI 2×2, búsqueda de 40 +
 * chips Todos/Activos/Suspendidos (rol y orden en «Más»), filas sin Valor ni «desde»,
 * lista de cards con acciones (action sheet), selección múltiple con barra
 * flotante, historial, y los sheets Suspender / Moderar. Sin tablas.
 */
import { useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { AdminUserRow, SuspendUserInput, UpdateUserInput, UserRole } from '@grootfolio/shared'
import {
  useAdminUsers,
  useAuditLogs,
  useBulkSuspend,
  useBulkUnsuspend,
  useCreateUser,
  useDeleteUserAvatar,
  useRenameUser,
  useSuspendUser,
  useUnsuspendUser,
  useUpdateUser,
  type AdminUsersFilters,
} from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { Screen } from '@/components/ui/Screen'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'

const VIOLET = '#8B5CF6'
const RED = '#DC2626'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

export function AdminUsersScreen() {
  const { theme } = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AdminUsersFilters['status']>(undefined)
  const [role, setRole] = useState<AdminUsersFilters['role']>(undefined)
  const [sort, setSort] = useState<NonNullable<AdminUsersFilters['sort']>>('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRow | 'bulk' | null>(null)
  const [moderateTarget, setModerateTarget] = useState<AdminUserRow | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data } = useAdminUsers({ search, status, role, sort, perPage: 50 })
  const unsuspend = useUnsuspendUser()
  const bulkUnsuspend = useBulkUnsuspend()
  const rows = data?.data ?? []
  const stats = data?.stats

  const toggleSel = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const openActions = (u: AdminUserRow) => {
    Alert.alert(u.fullName || u.email, undefined, [
      { text: 'Ver detalle', onPress: () => nav.navigate('AdminUserDetail', { id: u.id }) },
      { text: 'Editar', onPress: () => setEditTarget(u) },
      { text: 'Moderar perfil', onPress: () => setModerateTarget(u) },
      u.status === 'suspended'
        ? { text: 'Reactivar', onPress: () => unsuspend.mutate(u.id, { onSuccess: () => toast('Suspensión levantada', 'success') }) }
        : { text: 'Suspender', style: 'destructive' as const, onPress: () => setSuspendTarget(u) },
      { text: 'Cancelar', style: 'cancel' as const },
    ])
  }

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: selected.size > 0 ? 90 : 24 }}
        ListHeaderComponentStyle={{ marginBottom: 14 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>Usuarios</Text>
              <Text style={{ color: VIOLET, backgroundColor: 'rgba(139,92,246,0.14)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>ADMIN</Text>
              <TouchableOpacity onPress={() => setCreateOpen(true)} accessibilityRole="button" style={{ marginLeft: 'auto', height: 38, justifyContent: 'center', backgroundColor: theme.brand.solid, borderRadius: 10, paddingHorizontal: 14 }}>
                <Text style={{ color: theme.text.onBrand, fontWeight: '600', fontSize: 13.5 }}>+ Crear usuario</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Metric label="Usuarios" value={stats?.total} color={theme.text.primary} />
              <Metric label="Activos" value={stats?.active} color={theme.trend.pos} />
              <Metric label="Suspendidos" value={stats?.suspended} color={theme.trend.neg} />
              <Metric label="Nuevos · 30 días" value={stats?.newLast30d} color={theme.text.primary} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Buscar por nombre o email"
                placeholder="Buscar por nombre o email" placeholderTextColor={theme.text.placeholder} value={searchInput} onChangeText={setSearchInput}
                style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: theme.border.strong, backgroundColor: theme.background.surface, color: theme.text.primary, paddingHorizontal: 12, fontSize: 14 }}
              />
              <TouchableOpacity onPress={() => setShowFilters(true)} accessibilityRole="button" accessibilityLabel="Rol y orden" style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 13 }}>Más</Text>
                {(!!role || sort !== 'recent') && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.brand.solid }} />}
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                [undefined, 'Todos', stats?.total],
                ['active', 'Activos', stats?.active],
                ['suspended', 'Suspendidos', stats?.suspended],
              ] as const).map(([value, label, count]) => {
                const on = status === value
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setStatus(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, justifyContent: 'center', borderColor: on ? theme.text.primary : theme.border.default, backgroundColor: on ? theme.text.primary : theme.background.surface }}
                  >
                    <Text style={{ color: on ? theme.background.surface : theme.text.primary, fontSize: 13, fontWeight: '600' }}>
                      {label}
                      {count !== undefined ? <Text style={{ opacity: 0.6 }}> {count}</Text> : null}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {selectMode && <Text style={{ color: theme.text.secondary, fontSize: 12 }}>{selected.size} seleccionados · mantené presionada una fila. <Text onPress={() => { setSelectMode(false); setSelected(new Set()) }} style={{ color: theme.brand.ink, fontWeight: '700' }}>Cancelar</Text></Text>}
          </View>
        }
        renderItem={({ item, index }) => {
          const sel = selected.has(item.id)
          const susp = item.status === 'suspended'
          const first = index === 0
          const last = index === rows.length - 1
          return (
            <TouchableOpacity
              onPress={() => selectMode ? toggleSel(item.id) : nav.navigate('AdminUserDetail', { id: item.id })}
              onLongPress={() => { setSelectMode(true); toggleSel(item.id) }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14,
                backgroundColor: sel ? theme.brand.tint : theme.background.surface,
                borderColor: theme.border.default, borderLeftWidth: 1, borderRightWidth: 1,
                borderTopWidth: first ? 1 : 0, borderBottomWidth: 1,
                borderTopLeftRadius: first ? 16 : 0, borderTopRightRadius: first ? 16 : 0,
                borderBottomLeftRadius: last ? 16 : 0, borderBottomRightRadius: last ? 16 : 0,
              }}
            >
              {selectMode && (
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: sel ? theme.brand.solid : theme.border.strong, backgroundColor: sel ? theme.brand.solid : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                </View>
              )}
              <UserAvatar user={item} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 13.5, flexShrink: 1 }} numberOfLines={1}>{item.fullName || 'Sin nombre'}</Text>
                  {item.role === 'admin' && <Text style={{ color: VIOLET, backgroundColor: 'rgba(139,92,246,0.14)', fontSize: 10, fontWeight: '700', paddingHorizontal: 5, borderRadius: 5, overflow: 'hidden' }}>ADMIN</Text>}
                </View>
                <Text style={{ color: theme.text.muted, fontSize: 12 }} numberOfLines={1}>{item.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: susp ? theme.trend.neg : theme.trend.pos }} />
                  <Text style={{ color: susp ? theme.trend.neg : theme.trend.pos, fontSize: 12, fontWeight: '600' }}>{susp ? 'Suspendido' : 'Activo'}</Text>
                </View>
                {susp && <Text style={{ color: theme.text.muted, fontSize: 11 }}>{item.suspendedUntil ? `hasta ${formatDate(item.suspendedUntil)}` : 'Indefinida'}</Text>}
              </View>
              {!selectMode && (
                <TouchableOpacity onPress={() => openActions(item)} accessibilityRole="button" accessibilityLabel={`Acciones para ${item.email}`} style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.text.secondary, fontSize: 20 }}>⋯</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        }}
        ListFooterComponent={<AuditFooter />}
      />

      {selected.size > 0 && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20, flexDirection: 'row', gap: 10, backgroundColor: theme.background.elevated, borderWidth: 1, borderColor: theme.border.default, borderRadius: 14, padding: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
          <TouchableOpacity onPress={() => setSuspendTarget('bulk')} style={{ flex: 1, backgroundColor: RED, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Suspender ({selected.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bulkUnsuspend.mutate([...selected], { onSuccess: (r) => { toast(`${r.affected} reactivada(s)`, 'success'); setSelected(new Set()); setSelectMode(false) } })} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Levantar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FilterSheet
        visible={showFilters} onClose={() => setShowFilters(false)}
        status={status} role={role} sort={sort}
        onApply={(s, r, so) => { setStatus(s); setRole(r); setSort(so); setShowFilters(false) }}
      />
      {suspendTarget && <SuspendSheet target={suspendTarget} selectedIds={[...selected]} onClose={() => setSuspendTarget(null)} onDone={() => { setSuspendTarget(null); setSelected(new Set()); setSelectMode(false) }} />}
      {moderateTarget && <ModerateSheet user={moderateTarget} onClose={() => setModerateTarget(null)} />}
      {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} />}
      {editTarget && <EditSheet user={editTarget} onClose={() => setEditTarget(null)} />}
    </Screen>
  )
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; hint: string }> = [
  { value: 'user', label: 'Usuario', hint: 'Acceso estándar' },
  { value: 'admin', label: 'Admin', hint: 'Acceso total al panel' },
]

function RolePicker({ value, onChange }: { value: UserRole; onChange: (r: UserRole) => void }) {
  const { theme } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {ROLE_OPTIONS.map((r) => {
        const on = value === r.value
        return (
          <TouchableOpacity key={r.value} onPress={() => onChange(r.value)} style={{ flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 12, borderColor: on ? VIOLET : theme.border.default, backgroundColor: on ? 'rgba(139,92,246,0.08)' : 'transparent' }}>
            <Text style={{ color: on ? VIOLET : theme.text.primary, fontWeight: '700', fontSize: 13 }}>{r.label}</Text>
            <Text style={{ color: theme.text.muted, fontSize: 11 }}>{r.hint}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function CreateSheet({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const createUser = useCreateUser()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!EMAIL_RE.test(email.trim())) { setError('Ingresá un email válido.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (fullName.trim() && fullName.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return }
    setError(null)
    createUser.mutate(
      { email: email.trim(), password, fullName: fullName.trim() || undefined, role },
      { onSuccess: () => { toast('Usuario creado', 'success'); onClose() }, onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo crear.') }
    )
  }
  const field = { borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary } as const

  return (
    <BottomSheet visible onClose={onClose} title="Crear usuario">
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Email <Text style={{ color: RED }}>*</Text></Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="persona@ejemplo.com" placeholderTextColor={theme.text.placeholder} style={field} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Nombre visible</Text>
      <TextInput value={fullName} onChangeText={setFullName} maxLength={80} placeholder="Opcional" placeholderTextColor={theme.text.placeholder} style={field} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Contraseña inicial <Text style={{ color: RED }}>*</Text></Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 8 caracteres" placeholderTextColor={theme.text.placeholder} style={field} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Rol</Text>
      <RolePicker value={role} onChange={setRole} />
      {error && <Text style={{ color: RED, fontSize: 13 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={onClose} disabled={createUser.isPending} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity onPress={submit} disabled={createUser.isPending} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {createUser.isPending && <ActivityIndicator size="small" color={theme.text.onBrand} />}<Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>Crear usuario</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

function EditSheet({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const updateUser = useUpdateUser()
  const [email, setEmail] = useState(user.email)
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [role, setRole] = useState<UserRole>(user.role)
  const [password, setPassword] = useState('')
  const [notifyUser, setNotifyUser] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!EMAIL_RE.test(email.trim())) { setError('Ingresá un email válido.'); return }
    if (fullName.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return }
    if (password && password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    const input: UpdateUserInput = { notifyUser }
    if (email.trim() !== user.email) input.email = email.trim()
    if (fullName.trim() !== (user.fullName ?? '')) input.fullName = fullName.trim()
    if (role !== user.role) input.role = role
    if (password) input.password = password
    if (!(input.email || input.fullName || input.role || input.password)) { setError('No hay cambios para aplicar.'); return }
    setError(null)
    updateUser.mutate(
      { id: user.id, input },
      { onSuccess: () => { toast('Cambios guardados', 'success'); onClose() }, onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar.') }
    )
  }
  const field = { borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary } as const

  return (
    <BottomSheet visible onClose={onClose} title="Editar usuario">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <UserAvatar user={user} size={40} />
        <View><Text style={{ color: theme.text.primary, fontWeight: '700' }}>{user.fullName || 'Sin nombre'}</Text><Text style={{ color: theme.text.muted, fontSize: 12 }}>{user.email}</Text></View>
      </View>
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={field} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Nombre visible</Text>
      <TextInput value={fullName} onChangeText={setFullName} maxLength={80} style={field} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Rol</Text>
      <RolePicker value={role} onChange={setRole} />
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Restablecer contraseña</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Dejar vacío para no cambiarla" placeholderTextColor={theme.text.placeholder} style={field} />
      <TouchableOpacity onPress={() => setNotifyUser((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: notifyUser ? '#F97316' : theme.border.strong, backgroundColor: notifyUser ? '#F97316' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{notifyUser && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}</View>
        <Text style={{ color: theme.text.primary, fontSize: 14 }}>Notificar al usuario del cambio</Text>
      </TouchableOpacity>
      {(password || email !== user.email) && (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 10, backgroundColor: 'rgba(217,119,6,0.1)', padding: 12 }}>
          <Text>⚠</Text><Text style={{ color: '#92400e', fontSize: 12.5, flex: 1 }}>Cambiar el email o la contraseña cierra las sesiones activas del usuario.</Text>
        </View>
      )}
      {error && <Text style={{ color: RED, fontSize: 13 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={onClose} disabled={updateUser.isPending} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity onPress={submit} disabled={updateUser.isPending} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {updateUser.isPending && <ActivityIndicator size="small" color={theme.text.onBrand} />}<Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>Guardar cambios</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

function Metric({ label, value, color }: { label: string; value?: number; color: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ width: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, paddingVertical: 14, paddingHorizontal: 16 }}>
      <Text style={{ color: theme.text.secondary, fontSize: 12.5 }}>{label}</Text>
      <Text style={{ color, fontSize: 22, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>{value ?? '—'}</Text>
    </View>
  )
}

function AuditFooter() {
  const { theme } = useTheme()
  const { data: logs = [] } = useAuditLogs()
  const actionLabel: Record<string, string> = {
    'user.create': 'creó a', 'user.update': 'editó a',
    'user.suspend': 'suspendió a', 'user.unsuspend': 'reactivó a', 'user.rename': 'renombró a',
    'user.avatar_delete': 'eliminó la foto de', 'content.publish': 'publicó', 'content.delete': 'eliminó', 'content.section_create': 'creó la sección',
  }
  if (logs.length === 0) return null
  return (
    <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 16 }}>
      <Text style={{ color: theme.text.primary, fontWeight: '700', marginBottom: 10 }}>Historial de acciones</Text>
      {logs.slice(0, 8).map((l) => (
        <View key={l.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.border.default }}>
          <Text style={{ color: theme.text.secondary, fontSize: 13 }}>
            <Text style={{ fontWeight: '700', color: theme.text.primary }}>{l.actorName}</Text> {actionLabel[l.action] ?? l.action} <Text style={{ fontWeight: '700', color: theme.text.primary }}>{l.targetLabel}</Text>
          </Text>
          {l.reason ? <Text style={{ color: theme.text.muted, fontSize: 11 }}>Motivo: {l.reason}</Text> : null}
        </View>
      ))}
    </View>
  )
}

const DURATIONS: Array<{ value: SuspendUserInput['duration']; label: string }> = [
  { value: '24h', label: '24 horas' }, { value: '7d', label: '7 días' }, { value: '30d', label: '30 días' },
  { value: 'custom', label: 'Fecha exacta' }, { value: 'forever', label: 'Indefinida' },
]

export function SuspendSheet({ target, selectedIds, onClose, onDone }: { target: AdminUserRow | 'bulk'; selectedIds: string[]; onClose: () => void; onDone: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const suspend = useSuspendUser()
  const bulk = useBulkSuspend()
  const [duration, setDuration] = useState<SuspendUserInput['duration']>('7d')
  const [until, setUntil] = useState<Date>(new Date(Date.now() + 7 * 864e5))
  const [showPicker, setShowPicker] = useState(false)
  const [reason, setReason] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isBulk = target === 'bulk'
  const pending = suspend.isPending || bulk.isPending

  const submit = () => {
    if (reason.trim().length < 5) { setError('El motivo es obligatorio: queda en el historial.'); return }
    setError(null)
    const input: SuspendUserInput = { duration, until: duration === 'custom' ? until.toISOString() : undefined, reason: reason.trim(), notifyEmail }
    const onSuccess = () => { toast('Cuenta(s) suspendida(s)', 'success'); onDone() }
    const onError = (e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo suspender.')
    if (isBulk) bulk.mutate({ userIds: selectedIds, ...input }, { onSuccess, onError })
    else suspend.mutate({ id: target.id, input }, { onSuccess, onError })
  }

  return (
    <BottomSheet visible onClose={onClose} title={isBulk ? `${selectedIds.length} cuentas seleccionadas` : 'Suspender cuenta'}>
      {!isBulk && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <UserAvatar user={target} size={40} />
          <View><Text style={{ color: theme.text.primary, fontWeight: '700' }}>{target.fullName || 'Sin nombre'}</Text><Text style={{ color: theme.text.muted, fontSize: 12 }}>{target.email}</Text></View>
        </View>
      )}
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Duración</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DURATIONS.map((d) => (
          <TouchableOpacity key={d.value} onPress={() => setDuration(d.value)} style={{ width: '47%', flexGrow: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', borderColor: duration === d.value ? RED : theme.border.default, backgroundColor: duration === d.value ? 'rgba(220,38,38,0.08)' : 'transparent' }}>
            <Text style={{ color: duration === d.value ? RED : theme.text.primary, fontWeight: '600', fontSize: 13 }}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {duration === 'custom' && (
        <View>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12 }}>
            <Text style={{ color: theme.text.primary }}>{until.toLocaleDateString('es-AR')}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker value={until} mode="date" minimumDate={new Date(Date.now() + 864e5)} onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setUntil(d) }} />
          )}
        </View>
      )}
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Motivo <Text style={{ color: RED }}>*</Text></Text>
      <TextInput
        value={reason} onChangeText={setReason} multiline numberOfLines={3} placeholder="Queda registrado en el historial." placeholderTextColor={theme.text.placeholder}
        style={{ borderWidth: 1, borderColor: error ? RED : theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary, minHeight: 72, textAlignVertical: 'top' }}
      />
      <TouchableOpacity onPress={() => setNotifyEmail((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: notifyEmail ? '#F97316' : theme.border.strong, backgroundColor: notifyEmail ? '#F97316' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{notifyEmail && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}</View>
        <Text style={{ color: theme.text.primary, fontSize: 14 }}>Avisarle al usuario por email</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 10, backgroundColor: 'rgba(217,119,6,0.1)', padding: 12 }}>
        <Text>⚠</Text><Text style={{ color: '#92400e', fontSize: 12.5, flex: 1 }}>La persona no podrá iniciar sesión mientras la cuenta esté suspendida.</Text>
      </View>
      {error && <Text style={{ color: RED, fontSize: 13 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={onClose} disabled={pending} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity onPress={submit} disabled={pending} style={{ flex: 1, backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: pending ? 0.7 : 1 }}>
          {pending && <ActivityIndicator size="small" color="#fff" />}<Text style={{ color: '#fff', fontWeight: '700' }}>Suspender cuenta</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

export function ModerateSheet({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const { theme } = useTheme()
  const { toast } = useToast()
  const rename = useRenameUser()
  const deleteAvatar = useDeleteUserAvatar()
  const [name, setName] = useState(user.fullName ?? '')
  const [notify, setNotify] = useState(true)
  const hasPhoto = !!user.avatarUrl

  const apply = () => {
    if (name.trim().length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return }
    rename.mutate({ id: user.id, fullName: name.trim(), notifyUser: notify }, { onSuccess: () => { toast('Cambios aplicados', 'success'); onClose() }, onError: (e) => toast(e instanceof Error ? e.message : 'Error', 'error') })
  }

  return (
    <BottomSheet visible onClose={onClose} title="Moderar perfil">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12 }}>
        <UserAvatar user={user} size={48} />
        <Text style={{ color: theme.text.primary, fontSize: 13, flex: 1 }}>{hasPhoto ? 'Foto cargada por el usuario' : 'Sin foto · avatar con iniciales'}</Text>
        <TouchableOpacity disabled={!hasPhoto || deleteAvatar.isPending} onPress={() => deleteAvatar.mutate({ id: user.id, notifyUser: notify }, { onSuccess: () => toast('Foto eliminada', 'info') })} style={{ borderWidth: 1, borderColor: RED, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, opacity: hasPhoto ? 1 : 0.4 }}>
          <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>Eliminar foto</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>Nombre visible</Text>
      <TextInput value={name} onChangeText={setName} maxLength={40} style={{ borderWidth: 1, borderColor: theme.border.default, borderRadius: 10, padding: 12, color: theme.text.primary }} />
      <TouchableOpacity onPress={() => setName(`Usuario ${Math.floor(1000 + Math.random() * 9000)}`)}><Text style={{ color: VIOLET, fontWeight: '700', fontSize: 12 }}>Forzar nombre genérico (Usuario 1234)</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setNotify((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: notify ? '#F97316' : theme.border.strong, backgroundColor: notify ? '#F97316' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{notify && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}</View>
        <Text style={{ color: theme.text.primary, fontSize: 14 }}>Notificar al usuario del cambio</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity onPress={apply} disabled={rename.isPending} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>{rename.isPending ? 'Aplicando…' : 'Aplicar cambios'}</Text></TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

function FilterSheet({ visible, onClose, status, role, sort, onApply }: {
  visible: boolean; onClose: () => void
  status: AdminUsersFilters['status']; role: AdminUsersFilters['role']; sort: NonNullable<AdminUsersFilters['sort']>
  onApply: (s: AdminUsersFilters['status'], r: AdminUsersFilters['role'], so: NonNullable<AdminUsersFilters['sort']>) => void
}) {
  const { theme } = useTheme()
  const [s, setS] = useState(status)
  const [r, setR] = useState(role)
  const [so, setSo] = useState(sort)
  useEffect(() => { setS(status); setR(role); setSo(sort) }, [status, role, sort, visible])

  const Group = <T,>({ label, options, value, onChange }: { label: string; options: Array<{ v: T; l: string }>; value: T; onChange: (v: T) => void }) => (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <TouchableOpacity key={String(o.v)} onPress={() => onChange(o.v)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: value === o.v ? theme.brand.solid : theme.border.default, backgroundColor: value === o.v ? theme.brand.subtle : 'transparent' }}>
            <Text style={{ color: value === o.v ? theme.brand.solid : theme.text.secondary, fontWeight: '600', fontSize: 13 }}>{o.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filtros">
      <Group label="Estado" value={s} onChange={setS} options={[{ v: undefined, l: 'Todos' }, { v: 'active' as const, l: 'Activos' }, { v: 'suspended' as const, l: 'Suspendidos' }]} />
      <Group label="Rol" value={r} onChange={setR} options={[{ v: undefined, l: 'Todos' }, { v: 'user' as const, l: 'Usuarios' }, { v: 'admin' as const, l: 'Admins' }]} />
      <Group label="Orden" value={so} onChange={setSo} options={[{ v: 'recent' as const, l: 'Recientes' }, { v: 'oldest' as const, l: 'Antiguos' }, { v: 'name' as const, l: 'Nombre' }]} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={() => { setS(undefined); setR(undefined); setSo('recent') }} style={{ flex: 1, borderWidth: 1, borderColor: theme.border.default, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.primary, fontWeight: '600' }}>Limpiar</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onApply(s, r, so)} style={{ flex: 1, backgroundColor: theme.brand.solid, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: theme.text.onBrand, fontWeight: '700' }}>Aplicar</Text></TouchableOpacity>
      </View>
    </BottomSheet>
  )
}
