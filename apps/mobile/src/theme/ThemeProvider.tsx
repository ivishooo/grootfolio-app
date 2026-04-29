import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { fontFamilyMobile, themes, type Theme, type ThemeName } from '@grootfolio/tokens'

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  toggleTheme: () => void
  /**
   * Nombres concretos de las fuentes Inter para React Native.
   * Cada peso es su propio `fontFamily` porque RN no soporta el
   * sistema CSS de family + weight.
   * Uso: `<Text style={{ fontFamily: font.medium }}>...</Text>`
   */
  font: typeof fontFamilyMobile
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
      toggleTheme: () => setOverride(themeName === 'light' ? 'dark' : 'light'),
      font: fontFamilyMobile,
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
