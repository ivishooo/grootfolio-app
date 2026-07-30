import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { formatCurrency } from '@grootfolio/shared'
import { useDeleteAvatar, useUpdateProfile, useUploadAvatar } from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'
import { Button } from '@/components/ui/Button'

const CURRENCIES = ['USD', 'ARS', 'EUR'] as const

function ProfileSection() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user?.fullName ?? '')
  const [contentNotifs, setContentNotifs] = useState(true)

  const initials = ((user?.fullName || user?.email || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase()

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('La imagen supera los 2 MB.', 'error'); return }
    uploadAvatar.mutate(file, {
      onSuccess: (r) => { updateUser(r.user); toast('Foto actualizada', 'success') },
      onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo subir la foto.', 'error'),
    })
  }
  const removePhoto = () =>
    deleteAvatar.mutate(undefined, { onSuccess: (r) => { updateUser(r.user); toast('Foto eliminada', 'info') } })
  const saveName = () => {
    if (name.trim().length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return }
    updateProfile.mutate(name.trim(), {
      onSuccess: (r) => { updateUser(r.user); toast('Cambios guardados', 'success') },
      onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error'),
    })
  }

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold">Perfil</h3>
        <p className="mb-4 text-xs text-neutral-500">Tu foto y nombre son visibles para el equipo de GrootFolio.</p>

        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-[74px] w-[74px] rounded-full object-cover" />
          ) : (
            <span className="grid h-[74px] w-[74px] place-items-center rounded-full text-2xl font-bold text-white" style={{ background: '#8B5CF6' }}>{initials}</span>
          )}
          <div>
            <p className="text-sm text-neutral-500">JPG o PNG, máximo 2 MB. Se recorta en círculo.</p>
            <div className="mt-2 flex gap-2">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickFile} />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending}>↑ Subir foto</Button>
              {user?.avatarUrl && <Button variant="secondary" size="sm" onClick={removePhoto} disabled={deleteAvatar.isPending}>Quitar</Button>}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium">Nombre visible</label>
          <input className="h-[42px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-800" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          <p className="mt-1 text-xs text-neutral-400">{name.length}/40 · Debe cumplir las normas de la comunidad.</p>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input className="h-[42px] w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/50" value={user?.email ?? ''} disabled />
          <p className="mt-1 text-xs text-neutral-400">El email no se puede modificar.</p>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveName} disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-4 text-lg font-semibold">Notificaciones</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Nuevo contenido publicado</p>
            <p className="text-xs text-neutral-500">Recibí un aviso cuando el equipo publique material.</p>
          </div>
          <button
            role="switch"
            aria-checked={contentNotifs}
            onClick={() => setContentNotifs((v) => !v)}
            className="relative h-[25px] w-[44px] rounded-full transition-colors"
            style={{ background: contentNotifs ? '#F97316' : 'rgb(212 212 216)' }}
          >
            <span className="absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white transition-all" style={{ left: contentNotifs ? '22px' : '3px' }} />
          </button>
        </div>
      </section>
    </>
  )
}

export function SettingsPage() {
  const { theme: themeName, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [currency, setCurrency] = useState('USD')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Configuración</h2>

      <ProfileSection />

      {/* Apariencia */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold mb-4">Apariencia</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-neutral-500">Seleccioná el modo visual de la aplicación</p>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            aria-pressed={themeName === 'dark'}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {themeName === 'light' ? '☀ Claro' : '☾ Oscuro'}
          </button>
        </div>
      </section>

      {/* Preferencias */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold mb-4">Preferencias</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Moneda base</p>
            <p className="text-xs text-neutral-500">
              Preview: {formatCurrency(1234)}
            </p>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Moneda base"
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Cuenta */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold mb-4">Cuenta</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Nombre</span>
            <span className="text-sm font-medium">{user?.fullName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Email</span>
            <span className="text-sm font-medium">{user?.email ?? '—'}</span>
          </div>
          <hr className="border-neutral-200 dark:border-neutral-700" />
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-danger-500 px-4 py-2 text-sm font-medium text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/15"
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  )
}
