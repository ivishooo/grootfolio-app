import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { themes, fontFamilyMobile, type Theme, type ThemeName } from '@grootfolio/tokens'

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  font: typeof fontFamilyMobile
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [override, setOverride] = useState<ThemeName | null>(null)
  const themeName = override ?? (system === 'dark' ? 'dark' : 'light')
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[themeName],
      themeName,
      font: fontFamilyMobile,
      toggleTheme: () => setOverride(themeName === 'light' ? 'dark' : 'light'),
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
