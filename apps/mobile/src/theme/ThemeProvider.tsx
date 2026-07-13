import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { themes, fontFamilyMobile, type Theme, type ThemeName } from '@grootfolio/tokens'

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  font: typeof fontFamilyMobile
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Persistencia del tema (M-16): la preferencia manual se guarda y sobrevive a
// reinicios; sin preferencia guardada, se sigue el esquema del sistema.
const THEME_KEY = 'grootfolio.theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [override, setOverride] = useState<ThemeName | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setOverride(stored)
      })
      .catch(() => {})
  }, [])

  const themeName = override ?? (system === 'dark' ? 'dark' : 'light')
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[themeName],
      themeName,
      font: fontFamilyMobile,
      toggleTheme: () => {
        const next: ThemeName = themeName === 'light' ? 'dark' : 'light'
        setOverride(next)
        SecureStore.setItemAsync(THEME_KEY, next).catch(() => {})
      },
    }),
    [themeName],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
