/**
 * Tokens del asistente en mobile. Espejo de `apps/web/src/components/assistant/
 * tokens.css`: el acento de marca hace tres trabajos distintos y ninguno de los
 * tres se cubre con un solo valor.
 *
 * Medido con la fórmula de contraste de WCAG sobre los colores reales del tema:
 *
 * - `accent` (brand-500) — formas sólidas sin texto: el launcher. No se toca.
 * - `accentStrong` (brand-700, fijo en los dos temas) — superficies que llevan
 *   texto blanco encima, hoy la burbuja del usuario: 5,18:1. Ojo con usar
 *   `theme.brand.solidActive`: en oscuro es brand-300 y el blanco encima da
 *   1,69:1.
 * - `accentInk` — el acento haciendo de texto sobre `brand.subtle`: en claro
 *   brand-700 (4,52:1; el brand-600 de `subtleText` da 3,11:1 y no llega al
 *   4,5:1 de AA) y en oscuro brand-400 (6,32:1), donde hay que ir para el otro
 *   lado porque el fondo es oscuro.
 */
import { brand } from '@grootfolio/tokens'
import { useTheme } from '@/theme/ThemeProvider'

export function useAssistantTokens() {
  const { theme, themeName } = useTheme()
  const isDark = themeName === 'dark'

  return {
    accent: theme.brand.solid,
    accentStrong: brand[700],
    accentSoft: theme.brand.subtle,
    accentInk: isDark ? brand[400] : brand[700],
    online: theme.chart.positive,
  }
}

/** Alto del launcher; también lo usa el panel para no taparlo. */
export const LAUNCHER_SIZE = 56

/**
 * Espacio que las pantallas con scroll tienen que reservar abajo para que la
 * burbuja del asistente no quede encima del contenido.
 *
 * La burbuja es `position: absolute` sobre el tab bar, así que sin este padding
 * tapaba controles reales: el "Eliminar posición" de la última posición en
 * Activos y el "Abrir →" de la última tarjeta en Contenidos.
 */
export const ASSISTANT_SAFE_BOTTOM = LAUNCHER_SIZE + 32
