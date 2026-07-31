/**
 * Panel de admin · Usuarios (F5). Métricas, buscador/filtros, tabla con acciones,
 * selección múltiple, historial de acciones y los modales Suspender / Moderar /
 * Detalle. Solo accesible para admins (RequireAdmin).
 */
import { useEffect, useState } from 'react'
import { formatCurrency } from '@grootfolio/shared'
import type { AdminUserRow, SuspendUserInput, UpdateUserInput, UserRole } from '@grootfolio/shared'
import {
  useAdminUsers,
  useAdminUser,
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
import { useToast } from '@/components/ui/ToastProvider'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'

const VIOLET = '#8B5CF6'
const GREEN = '#16A34A'
const RED = '#DC2626'
const AMBER = '#D97706'

function initials(name: string | null, email: string): string {
  const base = (name || email || '?').trim()
  const parts = base.split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || base[0]!.toUpperCase()
}

function UserAvatar({ user, size = 36 }: { user: { fullName: string | null; email: string; avatarUrl: string | null }; size?: number }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: VIOLET, fontSize: Math.round(size * 0.4) }}
    >
      {initials(user.fullName, user.email)}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR')
}

function StatusChip({ user }: { user: AdminUserRow }) {
  const suspended = user.status === 'suspended'
  const color = suspended ? RED : GREEN
  const until = user.suspendedUntil ? `Hasta ${formatDate(user.suspendedUntil)}` : 'Indefinida'
  return (
    <div className="text-xs">
      <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {suspended ? 'Suspendido' : 'Activo'}
      </span>
      {suspended && <div className="mt-0.5 text-[11px] text-neutral-400">{until}</div>}
    </div>
  )
}

const inputCls =
  'h-[38px] rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800'

export function AdminUsersPage() {
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AdminUsersFilters['status']>(undefined)
  const [role, setRole] = useState<AdminUsersFilters['role']>(undefined)
  const [sort, setSort] = useState<NonNullable<AdminUsersFilters['sort']>>('recent')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRow | 'bulk' | null>(null)
  const [moderateTarget, setModerateTarget] = useState<AdminUserRow | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // Debounce del buscador (300ms).
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const filters: AdminUsersFilters = { search, status, role, sort, page, perPage: 20 }
  const { data, isLoading } = useAdminUsers(filters)
  const unsuspend = useUnsuspendUser()
  const bulkUnsuspend = useBulkUnsuspend()

  const rows = data?.data ?? []
  const stats = data?.stats
  const meta = data?.meta

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggleAll = () =>
    setSelected((prev) => {
      if (rows.every((r) => prev.has(r.id))) {
        const next = new Set(prev)
        rows.forEach((r) => next.delete(r.id))
        return next
      }
      return new Set([...prev, ...rows.map((r) => r.id)])
    })

  const handleReactivate = (u: AdminUserRow) =>
    unsuspend.mutate(u.id, { onSuccess: () => toast('Suspensión levantada', 'success') })

  const handleBulkUnsuspend = () =>
    bulkUnsuspend.mutate([...selected], {
      onSuccess: (r) => { toast(`${r.affected} cuenta(s) reactivada(s)`, 'success'); setSelected(new Set()) },
    })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">Usuarios</h2>
        <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: VIOLET, background: 'rgba(139,92,246,0.14)' }}>
          Solo admin
        </span>
        <Button className="ml-auto" onClick={() => setCreating(true)}>+ Crear usuario</Button>
      </div>
      <p className="-mt-3 text-sm text-neutral-500">Gestioná cuentas, suspensiones y moderación de perfiles.</p>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total" value={stats?.total} color="#64748B" icon="◎" />
        <Metric label="Activos" value={stats?.active} color={GREEN} icon="✓" />
        <Metric label="Suspendidos" value={stats?.suspended} color={RED} icon="⊘" />
        <Metric label="Nuevos (30 d)" value={stats?.newLast30d} color="#F97316" icon="✦" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">⌕</span>
          <input
            className={`${inputCls} w-full pl-8`}
            placeholder="Buscar por nombre o email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className={inputCls} value={status ?? ''} onChange={(e) => { setStatus((e.target.value || undefined) as AdminUsersFilters['status']); setPage(1) }}>
          <option value="">Estado: todos</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
        <select className={inputCls} value={role ?? ''} onChange={(e) => { setRole((e.target.value || undefined) as AdminUsersFilters['role']); setPage(1) }}>
          <option value="">Rol: todos</option>
          <option value="user">Usuarios</option>
          <option value="admin">Admins</option>
        </select>
        <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as NonNullable<AdminUsersFilters['sort']>)}>
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="name">Por nombre</option>
        </select>
      </div>

      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(249,115,22,0.08)' }}>
          <span className="text-sm font-semibold">{selected.size} seleccionados</span>
          <div className="ml-auto flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => setSuspendTarget('bulk')}>Suspender seleccionados</Button>
            <Button variant="secondary" size="sm" onClick={handleBulkUnsuspend} disabled={bulkUnsuspend.isPending}>Levantar suspensión</Button>
            <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-auto text-sm">
          <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-800/50">
            <tr>
              <th className="px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" /></th>
              <th className="px-3 py-3 text-left font-medium">Usuario</th>
              <th className="px-3 py-3 text-left font-medium">Estado</th>
              <th className="px-3 py-3 text-left font-medium">Rol</th>
              <th className="px-3 py-3 text-left font-medium">Alta</th>
              <th className="px-3 py-3 text-right font-medium">Portafolio</th>
              <th className="px-3 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8"><EmptyState title="Sin coincidencias" description="Ajustá el buscador o los filtros." /></td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t border-neutral-200 dark:border-neutral-800" style={selected.has(u.id) ? { background: 'rgba(249,115,22,0.05)' } : undefined}>
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} aria-label={`Seleccionar ${u.email}`} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={u} />
                      <div className="min-w-0">
                        <div className="font-semibold">{u.fullName || 'Sin nombre'}</div>
                        <div className="truncate text-xs text-neutral-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusChip user={u} /></td>
                  <td className="px-3 py-3">
                    {u.role === 'admin' ? (
                      <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: VIOLET, background: 'rgba(139,92,246,0.14)' }}>Admin</span>
                    ) : (
                      <span className="text-xs text-neutral-400">Usuario</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-neutral-500">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(u.portfolioValue)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button className="rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setDetailId(u.id)}>Detalle</button>
                      <button className="rounded-md px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: VIOLET }} onClick={() => setEditTarget(u)}>Editar</button>
                      <button className="rounded-md px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: AMBER }} onClick={() => setModerateTarget(u)}>Moderar</button>
                      {u.status === 'suspended' ? (
                        <button className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: GREEN }} onClick={() => handleReactivate(u)}>Reactivar</button>
                      ) : (
                        <button className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: RED }} onClick={() => setSuspendTarget(u)}>Suspender</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-neutral-500">Página {meta.currentPage} de {meta.lastPage}</span>
          <Button variant="secondary" size="sm" disabled={page >= meta.lastPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      )}

      <AuditCard />

      {suspendTarget && (
        <SuspendModal
          target={suspendTarget}
          selectedIds={[...selected]}
          onClose={() => setSuspendTarget(null)}
          onDone={() => { setSuspendTarget(null); setSelected(new Set()) }}
        />
      )}
      {moderateTarget && <ModerateModal user={moderateTarget} onClose={() => setModerateTarget(null)} />}
      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} />}
      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; hint: string }> = [
  { value: 'user', label: 'Usuario', hint: 'Acceso estándar a la app.' },
  { value: 'admin', label: 'Admin', hint: 'Acceso total al panel de administración.' },
]

function RolePicker({ value, onChange }: { value: UserRole; onChange: (r: UserRole) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ROLE_OPTIONS.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className="rounded-lg border-[1.5px] px-3 py-2 text-left transition-colors"
          style={value === r.value ? { borderColor: VIOLET, background: 'rgba(139,92,246,0.08)' } : { borderColor: 'rgb(212 212 216 / 1)' }}
        >
          <div className="text-sm font-semibold" style={value === r.value ? { color: VIOLET } : undefined}>{r.label}</div>
          <div className="text-[11px] text-neutral-500">{r.hint}</div>
        </button>
      ))}
    </div>
  )
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const createUser = useCreateUser()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Ingresá un email válido.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (fullName.trim() && fullName.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return }
    setError(null)
    createUser.mutate(
      { email: email.trim(), password, fullName: fullName.trim() || undefined, role },
      {
        onSuccess: () => { toast('Usuario creado', 'success'); onClose() },
        onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo crear el usuario.'),
      }
    )
  }

  return (
    <ModalShell title="Crear usuario" icon="＋" iconColor={VIOLET} onClose={onClose}>
      <p className="mb-1.5 text-sm font-medium">Email <span style={{ color: RED }}>*</span></p>
      <input type="email" className={`${inputCls} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@ejemplo.com" />
      <p className="mb-1.5 mt-4 text-sm font-medium">Nombre visible</p>
      <input className={`${inputCls} w-full`} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Opcional" />
      <p className="mb-1.5 mt-4 text-sm font-medium">Contraseña inicial <span style={{ color: RED }}>*</span></p>
      <input type="password" className={`${inputCls} w-full`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
      <p className="mb-1.5 mt-4 text-sm font-medium">Rol</p>
      <RolePicker value={role} onChange={setRole} />
      {error && <p className="mt-3 text-sm font-medium text-danger-500">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={createUser.isPending}>Cancelar</Button>
        <Button onClick={submit} disabled={createUser.isPending}>{createUser.isPending ? 'Creando…' : 'Crear usuario'}</Button>
      </div>
    </ModalShell>
  )
}

function EditUserModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const { toast } = useToast()
  const updateUser = useUpdateUser()
  const [email, setEmail] = useState(user.email)
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [role, setRole] = useState<UserRole>(user.role)
  const [password, setPassword] = useState('')
  const [notifyUser, setNotifyUser] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Ingresá un email válido.'); return }
    if (fullName.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return }
    if (password && password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    const input: UpdateUserInput = { notifyUser }
    if (email.trim() !== user.email) input.email = email.trim()
    if (fullName.trim() !== (user.fullName ?? '')) input.fullName = fullName.trim()
    if (role !== user.role) input.role = role
    if (password) input.password = password
    const hasChanges = input.email || input.fullName || input.role || input.password
    if (!hasChanges) { setError('No hay cambios para aplicar.'); return }
    setError(null)
    updateUser.mutate(
      { id: user.id, input },
      {
        onSuccess: () => { toast('Cambios guardados', 'success'); onClose() },
        onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar.'),
      }
    )
  }

  return (
    <ModalShell title="Editar usuario" icon="✎" iconColor={VIOLET} onClose={onClose}>
      <div className="mb-4 flex items-center gap-2.5">
        <UserAvatar user={user} size={40} />
        <div><div className="font-semibold">{user.fullName || 'Sin nombre'}</div><div className="text-xs text-neutral-500">{user.email}</div></div>
      </div>
      <p className="mb-1.5 text-sm font-medium">Email</p>
      <input type="email" className={`${inputCls} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} />
      <p className="mb-1.5 mt-4 text-sm font-medium">Nombre visible</p>
      <input className={`${inputCls} w-full`} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <p className="mb-1.5 mt-4 text-sm font-medium">Rol</p>
      <RolePicker value={role} onChange={setRole} />
      <p className="mb-1.5 mt-4 text-sm font-medium">Restablecer contraseña</p>
      <input type="password" className={`${inputCls} w-full`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar vacío para no cambiarla" />
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notifyUser} onChange={(e) => setNotifyUser(e.target.checked)} />
        Notificar al usuario del cambio
      </label>
      {(password || email !== user.email) && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px]" style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>
          <span>⚠</span> Cambiar el email o la contraseña cierra las sesiones activas del usuario.
        </div>
      )}
      {error && <p className="mt-3 text-sm font-medium text-danger-500">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={updateUser.isPending}>Cancelar</Button>
        <Button onClick={submit} disabled={updateUser.isPending}>{updateUser.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </div>
    </ModalShell>
  )
}

function Metric({ label, value, color, icon }: { label: string; value?: number; color: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span className="grid h-6 w-6 place-items-center rounded-lg text-[13px] font-bold" style={{ color, background: `${color}22` }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value ?? '—'}</div>
    </div>
  )
}

// ---------- Modales ----------

const DURATIONS: Array<{ value: SuspendUserInput['duration']; label: string }> = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'custom', label: 'Fecha exacta' },
  { value: 'forever', label: 'Indefinida' },
]

function ModalShell({ title, icon, iconColor, onClose, children, maxWidth = 470 }: { title: string; icon: string; iconColor: string; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-800" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold" style={{ color: iconColor, background: `${iconColor}22` }}>{icon}</span>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  )
}

function SuspendModal({ target, selectedIds, onClose, onDone }: { target: AdminUserRow | 'bulk'; selectedIds: string[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const suspend = useSuspendUser()
  const bulkSuspend = useBulkSuspend()
  const [duration, setDuration] = useState<SuspendUserInput['duration']>('7d')
  const [until, setUntil] = useState('')
  const [reason, setReason] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isBulk = target === 'bulk'
  const pending = suspend.isPending || bulkSuspend.isPending

  const submit = () => {
    if (reason.trim().length < 5) { setError('El motivo es obligatorio (mínimo 5 caracteres).'); return }
    if (duration === 'custom' && !until) { setError('Indicá la fecha de reactivación.'); return }
    setError(null)
    const input: SuspendUserInput = {
      duration,
      until: duration === 'custom' ? new Date(until).toISOString() : undefined,
      reason: reason.trim(),
      notifyEmail,
    }
    const onSuccess = () => { toast('Cuenta(s) suspendida(s)', 'success'); onDone() }
    const onError = (e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo suspender.')
    if (isBulk) bulkSuspend.mutate({ userIds: selectedIds, ...input }, { onSuccess, onError })
    else suspend.mutate({ id: target.id, input }, { onSuccess, onError })
  }

  return (
    <ModalShell title={isBulk ? `${selectedIds.length} cuentas seleccionadas` : 'Suspender cuenta'} icon="⊘" iconColor={RED} onClose={onClose}>
      {!isBulk && (
        <div className="mb-4 flex items-center gap-2.5">
          <UserAvatar user={target} size={40} />
          <div><div className="font-semibold">{target.fullName || 'Sin nombre'}</div><div className="text-xs text-neutral-500">{target.email}</div></div>
        </div>
      )}
      <p className="mb-1.5 text-sm font-medium">Duración</p>
      <div className="grid grid-cols-2 gap-2">
        {DURATIONS.map((d) => (
          <button key={d.value} type="button" onClick={() => setDuration(d.value)}
            className="rounded-lg border-[1.5px] px-3 py-2 text-sm font-medium transition-colors"
            style={duration === d.value ? { borderColor: RED, background: 'rgba(220,38,38,0.08)', color: RED } : { borderColor: 'rgb(212 212 216 / 1)' }}>
            {d.label}
          </button>
        ))}
      </div>
      {duration === 'custom' && (
        <input type="date" className={`${inputCls} mt-3 w-full`} value={until} onChange={(e) => setUntil(e.target.value)} />
      )}
      <p className="mb-1.5 mt-4 text-sm font-medium">Motivo <span style={{ color: RED }}>*</span></p>
      <textarea className={`w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800 ${error && reason.trim().length < 5 ? 'border-danger-500' : 'border-neutral-200 dark:border-neutral-700'}`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Queda registrado en el historial." />
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
        Avisarle al usuario por email
      </label>
      <div className="mt-4 flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px]" style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>
        <span>⚠</span> La persona no podrá iniciar sesión mientras la cuenta esté suspendida.
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger-500">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button variant="primary" className="!border-0 !bg-danger-500 !text-white hover:!bg-danger-600" onClick={submit} disabled={pending}>
          {pending ? 'Suspendiendo…' : 'Suspender cuenta'}
        </Button>
      </div>
    </ModalShell>
  )
}

function ModerateModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const { toast } = useToast()
  const rename = useRenameUser()
  const deleteAvatar = useDeleteUserAvatar()
  const [name, setName] = useState(user.fullName ?? '')
  const [notify, setNotify] = useState(true)
  const hasPhoto = !!user.avatarUrl

  const apply = () => {
    if (name.trim().length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return }
    rename.mutate({ id: user.id, fullName: name.trim(), notifyUser: notify }, {
      onSuccess: () => { toast('Cambios aplicados', 'success'); onClose() },
      onError: (e) => toast(e instanceof Error ? e.message : 'No se pudo aplicar.', 'error'),
    })
  }
  const removePhoto = () =>
    deleteAvatar.mutate({ id: user.id, notifyUser: notify }, { onSuccess: () => toast('Foto eliminada', 'info') })

  return (
    <ModalShell title="Moderar perfil" icon="⚐" iconColor={AMBER} onClose={onClose}>
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
        <UserAvatar user={user} size={48} />
        <div className="flex-1 text-sm">
          <div className="font-medium">{hasPhoto ? 'Foto cargada por el usuario' : 'Sin foto · avatar con iniciales'}</div>
        </div>
        <Button variant="destructive" size="sm" disabled={!hasPhoto || deleteAvatar.isPending} onClick={removePhoto}>Eliminar foto</Button>
      </div>
      <p className="mb-1.5 mt-4 text-sm font-medium">Nombre visible</p>
      <input className={`${inputCls} w-full`} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <button type="button" className="mt-2 text-xs font-semibold" style={{ color: VIOLET }} onClick={() => setName(`Usuario ${Math.floor(1000 + Math.random() * 9000)}`)}>
        Forzar nombre genérico (Usuario 1234)
      </button>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Notificar al usuario del cambio
      </label>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={rename.isPending}>Cancelar</Button>
        <Button onClick={apply} disabled={rename.isPending}>{rename.isPending ? 'Aplicando…' : 'Aplicar cambios'}</Button>
      </div>
    </ModalShell>
  )
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useAdminUser(id)
  return (
    <ModalShell title="Detalle de usuario" icon="◍" iconColor={VIOLET} onClose={onClose} maxWidth={520}>
      {isLoading || !data ? (
        <p className="py-6 text-center text-neutral-400">Cargando…</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <UserAvatar user={data.user} size={52} />
            <div><div className="text-base font-bold">{data.user.fullName || 'Sin nombre'}</div><div className="text-sm text-neutral-500">{data.user.email}</div></div>
            <div className="ml-auto"><StatusChip user={data.user} /></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Valor del portafolio" value={formatCurrency(data.portfolioValue)} />
            <Stat label="Transacciones" value={String(data.transactionsCount)} />
            <Stat label="Alta" value={formatDate(data.user.createdAt)} />
            <Stat label="Rol" value={data.user.role === 'admin' ? 'Admin' : 'Usuario'} />
          </div>
          <p className="mb-2 mt-4 text-sm font-semibold">Actividad reciente</p>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin actividad registrada.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex justify-between"><span>{a.label}</span><span className="text-neutral-400">{formatDate(a.at)}</span></li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={onClose}>Cerrar</Button></div>
        </>
      )}
    </ModalShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function AuditCard() {
  const { data: logs } = useAuditLogs()
  const items = logs ?? []
  const actionLabel: Record<string, string> = {
    'user.create': 'creó a', 'user.update': 'editó a',
    'user.suspend': 'suspendió a', 'user.unsuspend': 'reactivó a', 'user.rename': 'renombró a',
    'user.avatar_delete': 'eliminó la foto de', 'content.publish': 'publicó', 'content.delete': 'eliminó', 'content.section_create': 'creó la sección',
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 font-semibold">Historial de acciones</h3>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">Sin acciones registradas.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, 15).map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <span className="font-semibold">{l.actorName}</span>{' '}{actionLabel[l.action] ?? l.action}{' '}<span className="font-semibold">{l.targetLabel}</span>
                {l.reason && <div className="text-xs text-neutral-400">Motivo: {l.reason}</div>}
              </div>
              <span className="whitespace-nowrap text-xs text-neutral-400">{formatDate(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
