import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { UserMenu } from './UserMenu'
import { Logo } from './Logo'

/* Iconos de línea del sidebar (rediseño GF). Heredan currentColor. */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  )
}

const DashboardIcon = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
)
const AssetsIcon = () => (
  <Svg>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="13.5" r="1.1" />
  </Svg>
)
const ReportsIcon = () => (
  <Svg>
    <path d="M4 20h16" />
    <rect x="6" y="11" width="3" height="7" rx="1" />
    <rect x="10.5" y="7" width="3" height="11" rx="1" />
    <rect x="15" y="13" width="3" height="5" rx="1" />
  </Svg>
)
const QuizIcon = () => (
  <Svg>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4h6v2.5H9z" />
    <path d="M8.8 13l1.8 1.8L14 11.2" />
  </Svg>
)
const SettingsIcon = () => (
  <Svg>
    <path d="M4 8h9" />
    <circle cx="16" cy="8" r="2.2" />
    <path d="M4 16h4" />
    <circle cx="11" cy="16" r="2.2" />
    <path d="M15 16h5" />
  </Svg>
)

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/assets', label: 'Activos', Icon: AssetsIcon },
  { to: '/reports', label: 'Reportes', Icon: ReportsIcon },
  { to: '/profile-test', label: 'Test de Perfil', Icon: QuizIcon },
  { to: '/settings', label: 'Configuración', Icon: SettingsIcon },
] as const

export function AppLayout() {
  const { theme: themeName, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Backdrop (mobile drawer) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-neutral-200 bg-white transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-900 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center px-5 py-4">
          <Logo variant="lockup" size={28} />
        </div>

        {/* Nav */}
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-500 font-medium text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom with menu */}
        <div className="relative border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <UserMenu
            user={user}
            open={sidebarMenuOpen}
            onToggle={() => setSidebarMenuOpen((v) => !v)}
            onLogout={handleLogout}
            position="top"
          />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-col md:ml-[240px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold">GrootFolio</h1>
          </div>

          <button
            onClick={toggleTheme}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Cambiar tema"
            aria-pressed={themeName === 'dark'}
          >
            {themeName === 'light' ? '☀' : '☾'}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
