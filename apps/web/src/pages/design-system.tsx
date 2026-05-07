/**
 * Smoke test visual del design system.
 * No esta ruteado — importar manualmente para validar tokens a ojo.
 * Uso: cambiar el import en App.tsx temporalmente, o abrir en dev tools.
 *
 * Comando rapido:
 *   En App.tsx, reemplazar <App /> por <DesignSystemPreview /> para ver.
 */
import {
  brand, neutral, success, danger, warning, info,
  lightTheme, darkTheme, fontFamily, fontSize, fontWeight, spacing, radius,
  type Theme,
} from '@grootfolio/tokens'

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-md border border-neutral-200 dark:border-neutral-700"
        style={{ backgroundColor: hex }}
      />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-neutral-500">{hex}</p>
      </div>
    </div>
  )
}

function PaletteSection({ title, colors }: { title: string; colors: Record<string, string> }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(colors).map(([k, v]) => (
          <ColorSwatch key={k} name={`${title.toLowerCase()}.${k}`} hex={v} />
        ))}
      </div>
    </div>
  )
}

function ThemeTokens({ name, theme }: { name: string; theme: Theme }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Object.entries(theme.background).map(([k, v]) => (
          <ColorSwatch key={k} name={`bg.${k}`} hex={v} />
        ))}
        {Object.entries(theme.text).map(([k, v]) => (
          <ColorSwatch key={k} name={`text.${k}`} hex={v} />
        ))}
        {Object.entries(theme.border).map(([k, v]) => (
          <ColorSwatch key={k} name={`border.${k}`} hex={v} />
        ))}
        {Object.entries(theme.brand).map(([k, v]) => (
          <ColorSwatch key={k} name={`brand.${k}`} hex={v} />
        ))}
      </div>
    </div>
  )
}

export function DesignSystemPreview() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 p-8 space-y-10">
      <div>
        <h1 className="text-4xl font-bold">GrootFolio Design System</h1>
        <p className="text-neutral-500 mt-2">Smoke test visual de tokens — Fase 1</p>
      </div>

      {/* Tipografia */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-neutral-200 dark:border-neutral-700 pb-2">Tipografia</h2>
        <p className="text-xs">Font family: {fontFamily.sans.join(', ')}</p>
        <div className="space-y-2">
          {Object.entries(fontSize).map(([name, size]) => (
            <p key={name} style={{ fontSize: size }}>
              <span className="text-neutral-400 w-16 inline-block">{name} ({size}px)</span>{' '}
              The quick brown fox jumps over the lazy dog
            </p>
          ))}
        </div>
        <div className="flex gap-6 mt-4">
          {Object.entries(fontWeight).map(([name, weight]) => (
            <span key={name} style={{ fontWeight: Number(weight) }}>
              {name} ({weight})
            </span>
          ))}
        </div>
      </section>

      {/* Paletas */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-neutral-200 dark:border-neutral-700 pb-2">Paletas de color</h2>
        <PaletteSection title="Brand" colors={brand} />
        <PaletteSection title="Neutral" colors={neutral} />
        <PaletteSection title="Success" colors={success} />
        <PaletteSection title="Danger" colors={danger} />
        <PaletteSection title="Warning" colors={warning} />
        <PaletteSection title="Info" colors={info} />
      </section>

      {/* Temas */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-neutral-200 dark:border-neutral-700 pb-2">Temas semanticos</h2>
        <ThemeTokens name="Light Theme" theme={lightTheme} />
        <ThemeTokens name="Dark Theme" theme={darkTheme} />
      </section>

      {/* Spacing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-neutral-200 dark:border-neutral-700 pb-2">Spacing</h2>
        <div className="flex flex-wrap items-end gap-3">
          {Object.entries(spacing).map(([name, px]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div
                className="bg-brand-500"
                style={{ width: px || 2, height: px || 2 }}
              />
              <span className="text-xs text-neutral-500">{name} ({px}px)</span>
            </div>
          ))}
        </div>
      </section>

      {/* Radios */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-neutral-200 dark:border-neutral-700 pb-2">Border Radius</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(radius).map(([name, px]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 bg-brand-500"
                style={{ borderRadius: px }}
              />
              <span className="text-xs text-neutral-500">{name} ({px}px)</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
