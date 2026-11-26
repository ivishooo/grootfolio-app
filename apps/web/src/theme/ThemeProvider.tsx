import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemeName } from '@grootfolio/tokens'

/** Lo que elige el usuario en Configuración. `system` sigue al sistema operativo. */
export type ThemePreference = ThemeName | 'system'

type ThemeContextValue = {
  /** Tema efectivo (resuelto), el que se pinta. */
  theme: ThemeName
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'grootfolio.theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage bloqueado: seguimos al sistema.
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)
  const [system, setSystem] = useState<ThemeName>(systemTheme)

  // Con «Sistema» elegido, el tema cambia si cambia el del sistema operativo.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme: ThemeName = preference === 'system' ? system : preference

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // sin persistencia: el tema vale para esta sesión.
    }
  }, [preference])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      toggleTheme: () => setPreference(theme === 'light' ? 'dark' : 'light'),
    }),
    [theme, preference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
