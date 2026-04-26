import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/assets/new', label: 'Cargar Activo', icon: '+' },
  { to: '/profile-test', label: 'Test de Perfil', icon: '☑' },
  { to: '/settings', label: 'Configuracion', icon: '⚙' },
]

export function AppLayout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <aside className="hidden md:flex w-64 flex-col border-r border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 text-lg font-bold text-brand-500 mb-8">
          <div className="h-8 w-8 rounded-lg bg-brand-500 grid place-items-center text-white">GF</div>
          GrootFolio
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                  isActive ? 'bg-brand-500 text-white' : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                )
              }
            >
              <span className="w-4 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <div className="h-8 w-8 rounded-full bg-brand-500 grid place-items-center text-white text-xs">U</div>
          <div className="text-sm">
            <div className="font-medium">Usuario Demo</div>
            <div className="text-xs text-neutral-500">demo@grootfolio.com</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-8 py-4 bg-white dark:bg-neutral-900">
          <h1 className="text-xl font-bold">GrootFolio</h1>
          <button
            onClick={toggleTheme}
            className="h-10 w-10 rounded-full border border-neutral-200 dark:border-neutral-700 grid place-items-center"
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? '☀' : '☾'}
          </button>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
