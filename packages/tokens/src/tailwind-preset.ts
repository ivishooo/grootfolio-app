import { brand, neutral, success, danger, warning, info, fontFamily, fontSize, spacing, radius, shadow, lightTheme, darkTheme } from './index'
import type { Theme } from './index'

/**
 * Tokens semanticos que cambian entre claro y oscuro. Tailwind no conoce el
 * tema activo, asi que se publican como variables CSS en `:root` y `.dark`
 * (el `darkMode: 'class'` de la web) y las clases apuntan a la variable:
 * `text-ink-3`, `bg-surface`, `border-line`, `text-brand-ink`, `bg-groot-ground`.
 * Los valores salen de `lightTheme` / `darkTheme`: un solo set para web y mobile.
 */
const themeVars = (t: Theme): Record<string, string> => ({
  '--tk-canvas': t.background.canvas,
  '--tk-surface': t.background.surface,
  '--tk-muted': t.background.muted,
  '--tk-line': t.border.default,
  '--tk-ctl': t.border.strong,
  '--tk-ink': t.text.primary,
  '--tk-ink-2': t.text.secondary,
  '--tk-ink-3': t.text.muted,
  '--tk-brand-ink': t.brand.ink,
  '--tk-brand-tint': t.brand.tint,
  '--tk-brand-subtle': t.brand.subtle,
  '--tk-pos': t.trend.pos,
  '--tk-neg': t.trend.neg,
  '--tk-pos-soft': t.trend.posSoft,
  '--tk-neg-soft': t.trend.negSoft,
  '--tk-groot-ground': t.groot.ground,
})

type AddBase = (base: Record<string, Record<string, string>>) => void

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand: {
          ...brand,
          ink: 'var(--tk-brand-ink)',
          tint: 'var(--tk-brand-tint)',
          subtle: 'var(--tk-brand-subtle)',
        },
        neutral,
        success,
        danger,
        warning,
        info,
        canvas: 'var(--tk-canvas)',
        surface: 'var(--tk-surface)',
        muted: 'var(--tk-muted)',
        line: 'var(--tk-line)',
        ctl: 'var(--tk-ctl)',
        ink: {
          DEFAULT: 'var(--tk-ink)',
          2: 'var(--tk-ink-2)',
          3: 'var(--tk-ink-3)',
        },
        pos: { DEFAULT: 'var(--tk-pos)', soft: 'var(--tk-pos-soft)' },
        neg: { DEFAULT: 'var(--tk-neg)', soft: 'var(--tk-neg-soft)' },
        groot: { ground: 'var(--tk-groot-ground)' },
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
  plugins: [
    ({ addBase }: { addBase: AddBase }) => {
      addBase({ ':root': themeVars(lightTheme), '.dark': themeVars(darkTheme) })
    },
  ],
} as const
