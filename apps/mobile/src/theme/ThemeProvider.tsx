import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { themes, fontFamilyMobile, type Theme, type ThemeName } from '@grootfolio/tokens'

/** Lo que elige el usuario en Configuración. `system` sigue al sistema operativo. */
export type ThemePreference = ThemeName | 'system'

interface ThemeContextValue {
  theme: Theme
  /** Tema efectivo (resuelto), el que se pinta. */
  themeName: ThemeName
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  font: typeof fontFamilyMobile
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Persistencia del tema (M-16): la preferencia se guarda y sobrevive a
// reinicios. Sin preferencia guardada, o con «Sistema», se sigue al sistema.
const THEME_KEY = 'grootfolio.theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored)
      })
      .catch(() => {})
  }, [])

  const themeName: ThemeName = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next)
      SecureStore.setItemAsync(THEME_KEY, next).catch(() => {})
    }
    return {
      theme: themes[themeName],
      themeName,
      preference,
      setPreference,
      font: fontFamilyMobile,
      toggleTheme: () => setPreference(themeName === 'light' ? 'dark' : 'light'),
    }
  }, [themeName, preference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
