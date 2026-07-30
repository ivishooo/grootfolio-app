/**
 * Admin · Usuarios mobile (F7). Métricas 2×2, buscador + filtros (bottom sheet),
 * lista de cards con acciones (action sheet), selección múltiple con barra
 * flotante, historial, y los sheets Suspender / Moderar. Sin tablas.
 */
import { useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import DateTimePicker from '@react-native-community/datetimepicker'
import { formatCurrency } from '@grootfolio/shared'
import type { AdminUserRow, SuspendUserInput } from '@grootfolio/shared'
import {
  useAdminUsers,
  useAuditLogs,
  useBulkSuspend,
  useBulkUnsuspend,
  useDeleteUserAvatar,
  useRenameUser,
  useSuspendUser,
  useUnsuspendUser,
  type AdminUsersFilters,
} from '@/lib/queries'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { useTheme } from '@/theme/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import { Screen } from '@/components/ui/Screen'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'

const VIOLET = '#8B5CF6'
const GREEN = '#16A34A'
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

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data } = useAdminUsers({ search, status, role, sort, perPage: 50 })
  const unsuspend = useUnsuspendUser()
  const bulkUnsuspend = useBulkUnsuspend()
  const rows = data?.data ?? []
  const stats = data?.stats
  const filtersActive = !!status || !!role || sort !== 'recent'

  const toggleSel = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const openActions = (u: AdminUserRow) => {
    Alert.alert(u.fullName || u.email, undefined, [
      { text: 'Ver detalle', onPress: () => nav.navigate('AdminUserDetail', { id: u.id }) },
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
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: selected.size > 0 ? 90 : 24 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: theme.text.primary, fontSize: 24, fontWeight: '800' }}>Usuarios</Text>
              <Text style={{ color: VIOLET, backgroundColor: 'rgba(139,92,246,0.14)', fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>SOLO ADMIN</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Metric label="Total" value={stats?.total} color="#64748B" />
              <Metric label="Activos" value={stats?.active} color={GREEN} />
              <Metric label="Suspendidos" value={stats?.suspended} color={RED} />
              <Metric label="Nuevos (30 d)" value={stats?.newLast30d} color="#F97316" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Buscar…" placeholderTextColor={theme.text.placeholder} value={searchInput} onChangeText={setSearchInput}
                style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.background.muted, color: theme.text.primary, paddingHorizontal: 12 }}
              />
              <TouchableOpacity onPress={() => setShowFilters(true)} style={{ height: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Filtros</Text>
                {filtersActive && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#F97316' }} />}
              </TouchableOpacity>
            </View>
            {selectMode && <Text style={{ color: theme.text.secondary, fontSize: 12 }}>{selected.size} seleccionados · mantené presionada una fila. <Text onPress={() => { setSelectMode(false); setSelected(new Set()) }} style={{ color: theme.brand.solid, fontWeight: '700' }}>Cancelar</Text></Text>}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => selectMode ? toggleSel(item.id) : nav.navigate('AdminUserDetail', { id: item.id })}
            onLongPress={() => { setSelectMode(true); toggleSel(item.id) }}
            style={{ flexDirection: 'row', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: selected.has(item.id) ? '#F97316' : theme.border.default, backgroundColor: theme.background.surface, padding: 14 }}
          >
            {selectMode && (
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: selected.has(item.id) ? '#F97316' : theme.border.strong, backgroundColor: selected.has(item.id) ? '#F97316' : 'transparent', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
                {selected.has(item.id) && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
              </View>
            )}
            <UserAvatar user={item} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text.primary, fontWeight: '700' }} numberOfLines={1}>{item.fullName || 'Sin nombre'}</Text>
              <Text style={{ color: theme.text.muted, fontSize: 12 }} numberOfLines={1}>{item.email}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.status === 'suspended' ? RED : GREEN }} />
                <Text style={{ color: item.status === 'suspended' ? RED : GREEN, fontSize: 12, fontWeight: '600' }}>
                  {item.status === 'suspended' ? `Suspendido · ${item.suspendedUntil ? 'hasta ' + formatDate(item.suspendedUntil) : 'Indefinida'}` : 'Activo'}
                </Text>
                {item.role === 'admin' && <Text style={{ color: VIOLET, backgroundColor: 'rgba(139,92,246,0.14)', fontSize: 10, fontWeight: '700', paddingHorizontal: 5, borderRadius: 5, overflow: 'hidden' }}>Admin</Text>}
              </View>
              <Text style={{ color: theme.text.muted, fontSize: 11, marginTop: 2 }}>{formatCurrency(item.portfolioValue)} · Alta {formatDate(item.createdAt)}</Text>
            </View>
            {!selectMode && (
              <TouchableOpacity onPress={() => openActions(item)} hitSlop={10} style={{ paddingHorizontal: 6, alignSelf: 'center' }}>
                <Text style={{ color: theme.text.muted, fontSize: 20 }}>⋯</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
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
    </Screen>
  )
}

function Metric({ label, value, color }: { label: string; value?: number; color: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ width: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.background.surface, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ color: theme.text.secondary, fontSize: 12.5 }}>{label}</Text>
      </View>
      <Text style={{ color: theme.text.primary, fontSize: 22, fontWeight: '800', marginTop: 6 }}>{value ?? '—'}</Text>
    </View>
  )
}

function AuditFooter() {
  const { theme } = useTheme()
  const { data: logs = [] } = useAuditLogs()
  const actionLabel: Record<string, string> = {
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
