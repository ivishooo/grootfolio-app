/**
 * Configuración (rediseño v2, Fase 5). SPEC-pantallas › Configuración.
 * Ancho máximo 680. Perfil (foto, nombre, email que no se cambia),
 * Preferencias (moneda y tema Claro / Oscuro / Sistema), Avisos y «Cerrar
 * sesión» como link.
 *
 * En Avisos solo va «Mostrar a Groot». Los switches que no tienen backend no se
 * dibujan (el SPEC pide ocultarlos, no mostrarlos apagados): «Resumen diario» y
 * «Avisos de bajas fuertes» no tienen endpoint, y «Contenido nuevo» era un
 * `useState` que no guardaba nada.
 */
import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider'
import { useGroot } from '@/components/groot/GrootProvider'
import { useAuth } from '@/auth/AuthProvider'
import { SUPPORTED_CURRENCIES, currencyLabels, formatCurrency } from '@grootfolio/shared'
import type { SupportedCurrency } from '@grootfolio/shared'
import { useMoney } from '@/lib/money'
import { useDeleteAvatar, useUpdateProfile, useUploadAvatar } from '@/lib/queries'
import { useToast } from '@/components/ui/ToastProvider'

const CARD = 'rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,.05)] dark:shadow-none'
const BTN_SEC = 'h-9 rounded-lg border border-ctl bg-surface px-3 text-[13px] font-semibold hover:bg-muted disabled:opacity-50'

function Row({ title, hint, labelId, children }: { title: string; hint?: ReactNode; labelId?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-sm font-medium">{title}</p>
        {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function ProfileSection() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user?.fullName ?? '')

  const initials = ((user?.fullName || user?.email || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase()

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast('La imagen supera los 2 MB.', 'error')
      return
    }
    uploadAvatar.mutate(file, {
      onSuccess: (r) => {
        updateUser(r.user)
        toast('Foto actualizada', 'success')
      },
      onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo subir la foto.', 'error'),
    })
  }
  const removePhoto = () =>
    deleteAvatar.mutate(undefined, {
      onSuccess: (r) => {
        updateUser(r.user)
        toast('Foto eliminada', 'info')
      },
    })
  const saveName = () => {
    if (name.trim().length < 2) {
      toast('El nombre debe tener al menos 2 caracteres.', 'error')
      return
    }
    updateProfile.mutate(
      { fullName: name.trim() },
      {
        onSuccess: (r) => {
          updateUser(r.user)
          toast('Cambios guardados', 'success')
        },
        onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error'),
      },
    )
  }

  return (
    <section className={CARD}>
      <h2 className="mb-4 text-[15px] font-semibold">Perfil</h2>
      <div className="flex items-center gap-4">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-[60px] w-[60px] rounded-full object-cover" />
        ) : (
          <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-brand-subtle text-xl font-bold text-brand-ink">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user?.fullName ?? 'Sin nombre'}</p>
          <p className="truncate text-xs text-ink-3">{user?.email} · el email no se cambia</p>
          <div className="mt-2 flex gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickFile} />
            <button type="button" className={BTN_SEC} onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending}>
              {uploadAvatar.isPending ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            {user?.avatarUrl && (
              <button type="button" className={BTN_SEC} onClick={removePhoto} disabled={deleteAvatar.isPending}>
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="nombre-visible" className="mb-1.5 block text-[13px] font-semibold">Nombre visible</label>
        <div className="flex gap-2">
          <input
            id="nombre-visible"
            className="h-[46px] min-w-0 flex-1 rounded-[10px] border border-ctl bg-surface px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            onClick={saveName}
            disabled={updateProfile.isPending || name.trim() === (user?.fullName ?? '')}
            className="h-[46px] rounded-[10px] bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-ink-3">{name.length}/40 · Lo ve el equipo de GrootFolio y tiene que cumplir las normas de la comunidad.</p>
      </div>
    </section>
  )
}

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]

/** Segmentado del SPEC: contenedor muted, padding 3, radio 10; la opción activa en surface. */
function ThemeSegmented() {
  const { preference, setPreference } = useTheme()
  return (
    <div role="radiogroup" aria-labelledby="theme-label" className="flex gap-[3px] rounded-[10px] bg-muted p-[3px]">
      {THEME_OPTIONS.map(({ value, label }) => {
        const on = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setPreference(value)}
            className={`h-[34px] rounded-lg px-3.5 text-[13px] font-semibold transition-colors ${
              on ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Moneda base. Persiste en el perfil (`PATCH /me`) y se aplica en todas las
 * pantallas vía `useMoney`.
 */
function PreferencesSection() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const updateProfile = useUpdateProfile()
  const money = useMoney()
  const current = (user?.baseCurrency ?? 'USD') as SupportedCurrency

  const change = (next: string) => {
    if (next === current) return
    updateProfile.mutate(
      { baseCurrency: next },
      {
        onSuccess: (r) => {
          updateUser(r.user)
          toast('Moneda actualizada', 'success', { description: `Vas a ver los importes en ${next}.` })
        },
        onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo cambiar la moneda.', 'error'),
      },
    )
  }

  return (
    <section className={CARD}>
      <h2 className="mb-3 text-[15px] font-semibold">Preferencias</h2>
      <Row
        title="Moneda"
        labelId="moneda-label"
        hint={
          <>
            {formatCurrency(1234)} se ve como {money.format(1234)}. Las operaciones se guardan en USD.
            {money.isFallback && <span className="block text-warning-600 dark:text-warning-500">No pudimos obtener la cotización de {money.preferred}; por ahora se muestra en USD.</span>}
          </>
        }
      >
        <select
          aria-labelledby="moneda-label"
          value={current}
          disabled={updateProfile.isPending}
          onChange={(e) => change(e.target.value)}
          className="h-10 rounded-[10px] border border-ctl bg-surface px-3 text-sm disabled:opacity-60"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} · {currencyLabels[c]}
            </option>
          ))}
        </select>
      </Row>
      <Row title="Tema" labelId="theme-label" hint="«Sistema» sigue la configuración de tu dispositivo.">
        <ThemeSegmented />
      </Row>
    </section>
  )
}

/** Switch del SPEC: 46×28, radio 14, perilla de 22 a 3 px; encendido brand.solid, apagado ctl. */
function Switch({ on, onChange, labelledBy }: { on: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-[46px] shrink-0 rounded-[14px] transition-colors ${on ? 'bg-brand-500' : 'bg-ctl'}`}
    >
      <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all ${on ? 'left-[21px]' : 'left-[3px]'}`} />
    </button>
  )
}

export function SettingsPage() {
  const { logout } = useAuth()
  const groot = useGroot()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em] md:text-[28px]">Configuración</h1>

      <ProfileSection />
      <PreferencesSection />

      <section className={CARD}>
        <h2 className="mb-3 text-[15px] font-semibold">Avisos</h2>
        <Row title="Mostrar a Groot" labelId="groot-switch-label" hint="El gato que te cuenta cómo viene el día. Lo podés ocultar cuando quieras.">
          <Switch on={groot.visible} onChange={groot.setVisible} labelledBy="groot-switch-label" />
        </Row>
      </section>

      <button type="button" onClick={handleLogout} className="rounded-lg px-2 py-2 text-sm font-semibold text-neg hover:bg-neg-soft">
        Cerrar sesión
      </button>
    </div>
  )
}
