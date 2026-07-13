import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { formatCurrency } from '@grootfolio/shared'

const CURRENCIES = ['USD', 'ARS', 'EUR'] as const

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
