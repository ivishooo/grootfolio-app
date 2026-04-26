/**
 * GrootFolio - Design Tokens
 *
 * Tokens extraidos del Figma oficial (GrootFolio - Investment Portfolio Manager).
 * Fuente unica para web (Tailwind) y mobile (React Native theme).
 * Cualquier cambio de color, spacing o tipografia empieza aqui.
 */

// ---- Paleta primaria ----
export const brand = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316', // primario usado en logo, botones, acentos
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
} as const

// ---- Estados ----
export const success = {
  500: '#22C55E',
  600: '#16A34A',
  bg: '#DCFCE7',
} as const

export const danger = {
  500: '#EF4444',
  600: '#DC2626',
  bg: '#FEE2E2',
} as const

export const warning = {
  500: '#F59E0B',
  bg: '#FEF3C7',
} as const

export const info = {
  500: '#3B82F6',
  bg: '#DBEAFE',
} as const

// ---- Escala de neutros ----
export const neutral = {
  0: '#FFFFFF',
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#0A0A0A',
} as const

// ---- Temas ----
export const lightTheme = {
  background: {
    canvas: neutral[50],
    surface: neutral[0],
    elevated: neutral[0],
    muted: neutral[100],
    tip: neutral[700],
  },
  text: {
    primary: neutral[900],
    secondary: neutral[600],
    muted: neutral[500],
    onBrand: neutral[0],
    onTip: neutral[0],
  },
  border: {
    default: neutral[200],
    strong: neutral[300],
    focus: brand[500],
  },
  brand: {
    solid: brand[500],
    solidHover: brand[600],
    subtle: brand[100],
    subtleText: brand[600],
  },
  chart: {
    series1: brand[500],
    series2: neutral[900],
    series3: neutral[500],
    series4: neutral[300],
    positive: success[500],
    negative: danger[500],
  },
} as const

export const darkTheme = {
  background: {
    canvas: '#0A0A0A',
    surface: '#17181C',
    elevated: '#1F2024',
    muted: '#2A2B30',
    tip: '#3F4046',
  },
  text: {
    primary: neutral[50],
    secondary: neutral[300],
    muted: neutral[400],
    onBrand: neutral[0],
    onTip: neutral[100],
  },
  border: {
    default: '#2A2B30',
    strong: '#3F4046',
    focus: brand[500],
  },
  brand: {
    solid: brand[500],
    solidHover: brand[400],
    subtle: 'rgba(249, 115, 22, 0.15)',
    subtleText: brand[400],
  },
  chart: {
    series1: brand[500],
    series2: neutral[100],
    series3: neutral[400],
    series4: neutral[700],
    positive: success[500],
    negative: danger[500],
  },
} as const

export type Theme = typeof lightTheme
export type ThemeName = 'light' | 'dark'
export const themes: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
}

// ---- Tipografia ----
export const fontFamily = {
  sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
} as const

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

// ---- Spacing ----
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const

// ---- Radios ----
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  full: 9999,
} as const

// ---- Sombras ----
export const shadow = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.05)',
  md: '0 4px 10px rgba(15, 23, 42, 0.08)',
  lg: '0 10px 25px rgba(15, 23, 42, 0.10)',
  focus: `0 0 0 3px ${brand[500]}33`,
} as const

// ---- Breakpoints (web) ----
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export const tokens = {
  brand,
  success,
  danger,
  warning,
  info,
  neutral,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  radius,
  shadow,
  breakpoints,
}
