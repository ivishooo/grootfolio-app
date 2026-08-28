import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Assistant } from '@/components/assistant/Assistant'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/auth/AuthProvider'
import { useNotifications } from '@/lib/queries'
import { UserMenu } from './UserMenu'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { useIsDesktop } from '@/lib/useMediaQuery'

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

const UsersIcon = () => (
  <Svg>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" />
  </Svg>
)
const UploadIcon = () => (
  <Svg>
    <path d="M12 15V4" />
    <path d="M8 8l4-4 4 4" />
    <path d="M5 19h14" />
  </Svg>
)

const ContentIcon = () => (
  <Svg>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
)

const KbIcon = () => (
  <Svg>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Svg>
)

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/assets', label: 'Activos', Icon: AssetsIcon },
  { to: '/reports', label: 'Reportes', Icon: ReportsIcon },
  { to: '/content', label: 'Contenidos', Icon: ContentIcon },
  { to: '/profile-test', label: 'Test de Perfil', Icon: QuizIcon },
  { to: '/settings', label: 'Configuración', Icon: SettingsIcon },
] as const

const ADMIN_ITEMS = [
  { to: '/admin/users', label: 'Usuarios', Icon: UsersIcon },
  { to: '/admin/content', label: 'Gestión de contenidos', Icon: UploadIcon },
  { to: '/admin/kb', label: 'Base de conocimiento', Icon: KbIcon },
] as const

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-brand-500 font-medium text-white'
      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`

export function AppLayout() {
  const { theme: themeName, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: notif } = useNotifications()
  const unread = notif?.unreadCount ?? 0
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)
  const isDesktop = useIsDesktop()
  // En mobile el drawer cerrado se corre fuera de pantalla con un translate,
  // pero seguia siendo tabulable y visible para lectores de pantalla: se
  // recorrian 9 links invisibles antes de llegar al contenido. `inert` lo saca
  // del arbol de foco y de accesibilidad sin tocar la animacion.
  const drawerHidden = !isDesktop && !drawerOpen

  // Escape cierra el drawer, como cualquier panel superpuesto.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Con el drawer abierto el fondo no debe scrollear detras del panel.
  useEffect(() => {
    if (!drawerOpen || isDesktop) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen, isDesktop])

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
        inert={drawerHidden}
        aria-label="Navegación principal"
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
            <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={navLinkClass}>
              <Icon />
              <span className="flex-1">{label}</span>
              {to === '/content' && unread > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: '#F97316' }}>
                  {unread}
                </span>
              )}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <div className="pt-4">
              <p
                className="px-3 pb-1.5 font-semibold uppercase text-neutral-400"
                style={{ fontSize: '10.5px', letterSpacing: '0.09em' }}
              >
                Administración
              </p>
              {ADMIN_ITEMS.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={navLinkClass}>
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User info at bottom with menu */}
        <div className="relative border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          {user?.role === 'admin' && (
            <span
              className="mb-2 inline-block rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide"
              style={{ color: '#8B5CF6', background: 'rgba(139,92,246,0.14)' }}
            >
              Admin
            </span>
          )}
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
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold">GrootFolio</h1>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Cambiar tema"
              aria-pressed={themeName === 'dark'}
            >
              {themeName === 'light' ? '☀' : '☾'}
            </button>
          </div>
        </header>

        {/* Content */}
        {/* pb-24: la burbuja del asistente es `fixed` abajo a la derecha y quedaba
            encima de la ultima fila de las tablas. El padding le da lugar propio. */}
        <main className="gf-app-main flex-1 p-4 pb-24 transition-[padding] duration-200 md:p-6 md:pb-24 lg:p-8 lg:pb-24">
          <Outlet />
        </main>

        {/* Asistente: launcher flotante sobre toda la app autenticada. */}
        <Assistant />
      </div>
    </div>
  )
}
