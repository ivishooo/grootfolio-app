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

// ---- Estados (paleta extendida para componentes) ----
export const success = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
} as const

export const danger = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
} as const

export const warning = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
} as const

export const info = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
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
// `Theme` describe la forma estructural; los valores quedan como `string` para
// que tanto lightTheme como darkTheme calcen en `Record<ThemeName, Theme>`.
export interface Theme {
  background: {
    canvas: string
    surface: string
    elevated: string
    muted: string
    tip: string
    disabled: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    placeholder: string
    disabled: string
    onBrand: string
    onTip: string
    onSuccess: string
    onDanger: string
    onWarning: string
    onInfo: string
  }
  border: {
    default: string
    strong: string
    focus: string
    disabled: string
  }
  brand: {
    solid: string
    solidHover: string
    solidActive: string
    subtle: string
    subtleText: string
  }
  success: { solid: string; solidHover: string; subtle: string; subtleText: string }
  danger: { solid: string; solidHover: string; subtle: string; subtleText: string }
  warning: { solid: string; solidHover: string; subtle: string; subtleText: string }
  info: { solid: string; solidHover: string; subtle: string; subtleText: string }
  chart: {
    series1: string
    series2: string
    series3: string
    series4: string
    positive: string
    negative: string
  }
}

export type ThemeName = 'light' | 'dark'

export const lightTheme: Theme = {
  background: {
    canvas: neutral[50],
    surface: neutral[0],
    elevated: neutral[0],
    muted: neutral[100],
    tip: neutral[700],
    disabled: neutral[100],
  },
  text: {
    primary: neutral[900],
    secondary: neutral[600],
    muted: neutral[500],
    // neutral[400] daba 2,34:1 sobre el fondo de los inputs: muy por debajo del
    // 4,5:1 que pide WCAG AA para texto normal. Con neutral[500] sobre un input
    // blanco da 4,76:1 y sigue leyendose mas claro que el texto real, que es
    // para lo que existe un placeholder.
    placeholder: neutral[500],
    disabled: neutral[300],
    onBrand: neutral[0],
    onTip: neutral[0],
    onSuccess: success[700],
    onDanger: danger[700],
    onWarning: warning[700],
    onInfo: info[700],
  },
  border: {
    default: neutral[200],
    strong: neutral[300],
    focus: brand[500],
    disabled: neutral[200],
  },
  brand: {
    solid: brand[500],
    solidHover: brand[600],
    solidActive: brand[700],
    subtle: brand[100],
    subtleText: brand[600],
  },
  success: { solid: success[500], solidHover: success[600], subtle: success[50], subtleText: success[700] },
  danger: { solid: danger[500], solidHover: danger[600], subtle: danger[50], subtleText: danger[700] },
  warning: { solid: warning[500], solidHover: warning[600], subtle: warning[50], subtleText: warning[700] },
  info: { solid: info[500], solidHover: info[600], subtle: info[50], subtleText: info[700] },
  chart: {
    series1: brand[500],
    series2: info[500],
    series3: warning[500],
    series4: neutral[400],
    positive: success[500],
    negative: danger[500],
  },
}

export const darkTheme: Theme = {
  background: {
    canvas: '#0A0A0A',
    surface: '#17181C',
    elevated: '#1F2024',
    muted: '#2A2B30',
    tip: '#3F4046',
    disabled: '#1F2024',
  },
  text: {
    primary: neutral[50],
    secondary: neutral[300],
    muted: neutral[400],
    // neutral[500] daba 2,97:1 sobre background.muted. neutral[400] sube a
    // 5,51:1 en el peor fondo y queda por debajo de secondary (neutral[300]),
    // asi que la jerarquia se mantiene.
    placeholder: neutral[400],
    disabled: neutral[600],
    onBrand: neutral[0],
    onTip: neutral[100],
    onSuccess: success[100],
    onDanger: danger[100],
    onWarning: warning[100],
    onInfo: info[100],
  },
  border: {
    default: '#2A2B30',
    strong: '#3F4046',
    focus: brand[500],
    disabled: '#2A2B30',
  },
  brand: {
    solid: brand[500],
    solidHover: brand[400],
    solidActive: brand[300],
    subtle: 'rgba(249, 115, 22, 0.15)',
    subtleText: brand[400],
  },
  success: { solid: success[500], solidHover: success[600], subtle: 'rgba(34,197,94,0.15)', subtleText: success[100] },
  danger: { solid: danger[500], solidHover: danger[600], subtle: 'rgba(239,68,68,0.15)', subtleText: danger[100] },
  warning: { solid: warning[500], solidHover: warning[600], subtle: 'rgba(245,158,11,0.15)', subtleText: warning[100] },
  info: { solid: info[500], solidHover: info[600], subtle: 'rgba(59,130,246,0.15)', subtleText: info[100] },
  chart: {
    series1: brand[500],
    series2: info[500],
    series3: warning[500],
    series4: neutral[400],
    positive: success[500],
    negative: danger[500],
  },
}

export const themes: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
}

// ---- Tipografia ----
export const fontFamily = {
  sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
} as const

// Nombres concretos para expo-font / useFonts en React Native
export const fontFamilyMobile = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
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
