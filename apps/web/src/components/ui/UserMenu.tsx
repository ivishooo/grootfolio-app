import { useEffect, useRef } from 'react'

interface UserMenuProps {
  user: { name: string; email: string } | null
  open: boolean
  onToggle: () => void
  onLogout: () => void
}

export function UserMenu({ user, open, onToggle, onLogout }: UserMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onToggle])

  const initials = user?.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white hover:bg-brand-600"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-neutral-500">{user?.email}</p>
          <hr className="my-2 border-neutral-200 dark:border-neutral-700" />
          <button
            onClick={onLogout}
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/15"
          >
            Cerrar sesion
          </button>
        </div>
      )}
    </div>
  )
}
