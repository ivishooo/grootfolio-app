# Design Reference — GrootFolio

Fuente de verdad **visual** para el refinamiento de la app (ver
`../PLAN_CLAUDE_CODE_COMPLETO.md`). Todo lo de esta carpeta vive **dentro del
repo** para que la implementación no dependa de archivos externos.

> Colocar esta carpeta en: **`grootfolio-app/docs/design-reference/`**

## Cómo usar esta referencia

Hay **dos formas** de consultar el diseño, en orden de fidelidad:

1. **Pixel-perfect — abrir los `.dc.html` en el navegador.**
   `screens/GrootFolio Web.dc.html`, `screens/GrootFolio Mobile.dc.html` y
   `screens/Logo.dc.html` se abren **directo en cualquier navegador** (traen su
   runtime `support.js` al lado). Es el diseño real, a escala 1:1, en light y
   dark. **Usalo para medir spacing, tamaños y colores exactos.**
   - Web: lienzo con las 5 pantallas × light/dark (paneable/zoomeable).
   - Asistente: `screens/Asistente GrootFolio.dc.html` — rediseño del chat
     (launcher, panel, burbujas, composer). Su spec está en
     `../SPEC_ASISTENTE_CHAT.md`.
   - Mobile: las 5 pantallas en marco de teléfono (390px).

2. **Diffing rápido — PNGs en `screenshots/`.** Capturas para comparar de un
   vistazo sin abrir el navegador.

## Mapa de PNGs

**`screenshots/web/`** (orden = arriba→abajo del lienzo):
| archivo | pantalla | tema |
|---|---|---|
| `01-screen.png` | Login | light |
| `02-screen.png` | Login | dark |
| `03-screen.png` | Dashboard | light |
| `04-screen.png` | Dashboard | dark |
| `05-screen.png` | Cargar Activo | light |
| `06-screen.png` | Cargar Activo | dark |
| `07-screen.png` | Test de Perfil | light |
| `08-screen.png` | Test de Perfil | dark |
| `09-screen.png` | Resultado | light |
| `10-screen.png` | Resultado | dark |

**`screenshots/mobile/`** (light):
| archivo | pantalla |
|---|---|
| `01-screen.png` | Login |
| `02-screen.png` | Dashboard (activos como tarjetas + 6 meses) |
| `03-screen.png` | Cargar Activo |
| `04-screen.png` | Test de Perfil |
| `05-screen.png` | Resultado |

`screenshots/logo.png` — hoja de marca completa (ícono, imagotipo, variantes, escala).

## Assets de marca — `brand/`

Estos son los **archivos reales** para integrar (no referencia, sino producto).
Logo v2 (rediseño 2026-11, ADR-0006): el gato es la cabeza de Groot, la misma
geometría del avatar pero quieta, sobre el naranja `#F97316` de siempre.
- `icon-app.svg` — 1024², degradé naranja + Groot con bigotes, collar y chapita.
  Base de los app icons y el splash.
- `adaptive-icon.svg` — lo mismo sobre un círculo, para el ícono adaptativo de Android.
- `mark-chip.svg` — chip naranja con la cabeza (sidebar, header, tamaños medianos).
- `mark-solid.svg` — silueta de la cabeza en `currentColor` (recoloreable).
- `favicon.svg` — 64², silueta sólida para 16–32 px.

El imagotipo (chip + wordmark «GrootFolio») ya no es un SVG suelto: lo arma el
componente `Logo` (`variant="lockup"`) en web y mobile.

Destinos en el repo:
- Web → `apps/web/public/` (`favicon.svg`, `icon-app.svg`, `apple-touch-icon.png`)
  + `apps/web/src/components/ui/Logo.tsx` (variantes `mark`, `lockup`, `icon`, `solid`).
- Mobile → PNGs exportados de `icon-app.svg`, `adaptive-icon.svg` y `favicon.svg`
  en `apps/mobile/assets/images/` (`icon`, `adaptive-icon`, `splash-icon`,
  `favicon`), referenciados en `app.json`, + `apps/mobile/src/components/ui/Logo.tsx`.

## Regla de oro

Ante cualquier duda de layout, spacing, color o tamaño: **gana el `.dc.html`
abierto en el navegador + los tokens de `packages/tokens`**. Los PNGs son para
comparación rápida; los `.dc.html` son la medida exacta.
