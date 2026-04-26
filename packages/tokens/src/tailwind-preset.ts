import { brand, neutral, success, danger, warning, info, fontFamily, fontSize, spacing, radius, shadow } from './index'

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand,
        neutral,
        success,
        danger,
        warning,
        info,
      },
      fontFamily: {
        sans: fontFamily.sans,
        mono: fontFamily.mono,
      },
      fontSize: Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, `${v}px`])),
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, `${v}px`])),
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, typeof v === 'number' ? `${v}px` : v])),
      boxShadow: shadow,
    },
  },
} as const
