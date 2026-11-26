import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Assistant } from '@/components/assistant/Assistant'
import { useAuth } from '@/auth/AuthProvider'
import { useNotifications } from '@/lib/queries'
import { UserMenu } from './UserMenu'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { useIsDesktop } from '@/lib/useMediaQuery'

/* Iconos de línea del sidebar (rediseño v2). Heredan currentColor. Las paths
   son las del prototipo (`P` en GrootFolio Rediseño.dc.html). */
const ICON_PATHS = {
  inicio: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  activos: 'M3 6h18v13H3zM3 10h18M15.4 13.5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0',
  reportes: 'M4 20h16M6 11h3v7H6zM10.5 7h3v11h-3zM15 13h3v5h-3z',
  aprender: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  perfil: 'M5 4h14v17H5zM9 4h6v2.5H9zM8.8 13l1.8 1.8L14 11.2',
  ajustes:
    'M4 8h9M13.8 8a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M4 16h4M8.8 16a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M15 16h5',
  usuarios: 'M5.8 8a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9',
  subir: 'M12 15V4M8 8l4-4 4 4M5 19h14',
  kb: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
} as const

function NavIcon({ name, size = 18 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

type NavItem = { to: string; label: string; icon: keyof typeof ICON_PATHS }

const NAV_MAIN: readonly NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: 'inicio' },
  { to: '/assets', label: 'Activos', icon: 'activos' },
  { to: '/reports', label: 'Reportes', icon: 'reportes' },
  { to: '/content', label: 'Aprender', icon: 'aprender' },
]

const NAV_SECONDARY: readonly NavItem[] = [
  { to: '/profile-test', label: 'Perfil de inversor', icon: 'perfil' },
  { to: '/settings', label: 'Configuración', icon: 'ajustes' },
]

const NAV_ADMIN: readonly NavItem[] = [
  { to: '/admin/users', label: 'Usuarios', icon: 'usuarios' },
  { to: '/admin/content', label: 'Gestión de contenidos', icon: 'subir' },
  { to: '/admin/kb', label: 'Base de conocimiento', icon: 'kb' },
]

/** Nombre de cada ruta para la miga del header («Inicio / Activos»). */
const CRUMBS: ReadonlyArray<[prefix: string, label: string]> = [
  ['/assets/new', 'Cargar activo'],
  ['/assets', 'Activos'],
  ['/reports', 'Reportes'],
  ['/content', 'Aprender'],
  ['/profile-test', 'Perfil de inversor'],
  ['/settings', 'Configuración'],
  ['/admin/users', 'Usuarios'],
  ['/admin/content', 'Gestión de contenidos'],
  ['/admin/kb', 'Base de conocimiento'],
]

function crumbFor(pathname: string): string {
  const hit = CRUMBS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return hit ? `Inicio  /  ${hit[1]}` : 'Inicio'
}

// Ítem activo: fondo brand.subtle y texto brand.ink en 600 (ya no naranja sólido).
const navLinkClass = (secondary: boolean) => ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-[11px] rounded-[9px] px-3 transition-colors ${
    secondary ? 'h-[38px] text-[13.5px]' : 'h-10 text-sm'
  } ${isActive ? 'bg-brand-subtle font-semibold text-brand-ink' : 'font-medium text-ink-2 hover:bg-muted'}`

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
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

  const closeDrawer = () => setDrawerOpen(false)
  const renderItem = ({ to, label, icon }: NavItem, secondary = false) => (
    <NavLink key={to} to={to} onClick={closeDrawer} className={navLinkClass(secondary)}>
      <NavIcon name={icon} size={secondary ? 17 : 18} />
      <span className="flex-1">{label}</span>
      {to === '/content' && unread > 0 && (
        <span
          className="grid h-5 min-w-5 place-items-center rounded-[10px] bg-brand-500 px-1.5 text-[11px] font-bold text-white"
          aria-label={`${unread} sin leer`}
        >
          {unread}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-canvas">
      {/* Backdrop (mobile drawer) */}
      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeDrawer} />}

      {/* Sidebar · 240 px */}
      <aside
        inert={drawerHidden}
        aria-label="Navegación principal"
        className={`fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-line bg-surface transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center px-5 pb-3.5 pt-[18px]">
          <Logo variant="lockup" size={30} />
        </div>

        <div className="px-3 pb-3 pt-1">
          <button
            type="button"
            onClick={() => {
              closeDrawer()
              navigate('/assets/new')
            }}
            className="flex h-10 w-full items-center justify-center gap-[7px] rounded-[10px] bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Cargar activo
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {NAV_MAIN.map((item) => renderItem(item))}
          <div className="mx-1 my-2.5 h-px bg-line" />
          {NAV_SECONDARY.map((item) => renderItem(item, true))}

          {user?.role === 'admin' && (
            <>
              <p className="px-3 pb-1.5 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-3">
                Administración
              </p>
              {NAV_ADMIN.map((item) => renderItem(item, true))}
            </>
          )}
        </nav>

        {/* El usuario, abajo. El menú tiene «Cerrar sesión». */}
        <div className="relative border-t border-line px-4 py-3">
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
        {/* Header · 60 px: miga a la izquierda, campana a la derecha. El tema
            vive en Configuración. */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-surface px-4 md:px-7">
          <button
            className="grid h-10 w-10 place-items-center rounded-[10px] text-xl hover:bg-muted md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <p className="min-w-0 flex-1 truncate whitespace-pre text-[13px] text-ink-3">{crumbFor(pathname)}</p>
          <NotificationBell />
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
