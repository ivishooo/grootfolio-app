import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemeName } from '@grootfolio/tokens'

type ThemeContextValue = {
  theme: ThemeName
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem('grootfolio.theme') as ThemeName | null
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('grootfolio.theme', theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
