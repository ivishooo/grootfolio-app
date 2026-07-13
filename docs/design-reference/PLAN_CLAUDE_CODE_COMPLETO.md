# GrootFolio — Plan completo de refinamiento para Claude Code

> **Objetivo.** Dejar **toda la app refinada, web y mobile**, lista para la
> defensa del TFC: fiel al Figma, con la **nueva identidad de marca** (logo
> silueta de gato), sin los defectos detectados, accesible (AA), consistente
> entre plataformas y con material de entrega listo.
>
> Este documento es **autocontenido y ejecutable de punta a punta**. Consolida
> y reemplaza como brief operativo a `docs/PLAN_PROFESIONALIZACION.md`
> (del que hereda la numeración de defectos `M-xx`) y se apoya en el
> `docs/CLAUDE_CODE_PLAN.md` (fases 1–6 de construcción) sin reabrir stack.

---

## 0. Cómo ejecutar este plan

1. **No cambies el stack** (respetá `docs/adr/0001-arquitectura.md` y `CLAUDE.md`).
2. Trabajá **fase por fase** (F0 → F8). Una fase = uno o pocos PRs.
   Conventional commits, un PR por fase (ver `docs/GIT_WORKFLOW.md`).
3. **Toda constante de estilo sale de `packages/tokens`.** Cero `#RRGGBB`,
   spacing o radios mágicos en componentes de pantalla.
4. Idioma de UI: **español rioplatense** (voseo). Sin typos.
5. Al cerrar cada fase: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
   en verde; adjuntá capturas Figma vs implementación y actualizá
   `docs/FIGMA_REFERENCE.md`.
6. **Fuentes de verdad visuales** de este refinamiento, **incluidas en el repo**
   en `docs/design-reference/` (ver su `README.md`):
   - `screens/GrootFolio Web.dc.html` (5 pantallas × light/dark),
     `screens/GrootFolio Mobile.dc.html` (5 pantallas), `screens/Logo.dc.html`
     (marca) — **se abren directo en el navegador** (traen `support.js`) y son
     la referencia pixel-perfect a escala 1:1.
   - `screenshots/web/*` y `screenshots/mobile/*` — PNGs para diffing rápido.
   - `brand/*.svg` — assets reales de marca a integrar.
   Ante duda de layout/spacing/color, ganan estos archivos + los tokens.

---

## 1. Fuentes de verdad

| Qué | Dónde |
|-----|-------|
| Referencia visual (pixel-perfect + PNGs) | `docs/design-reference/` (abrir los `.dc.html` en el navegador) |
| Colores, spacing, radios, tipografía, temas light/dark | `packages/tokens/src/index.ts` |
| Schemas de validación (Zod) y tipos | `packages/shared/src/schemas`, `.../types` |
| Utils compartidos (formateo, etc.) | `packages/shared/src/utils` |
| Componentes UI web | `apps/web/src/components/ui/*` |
| Componentes UI mobile | `apps/mobile/src/components/ui/*` |
| Theming | `apps/web/src/theme/ThemeProvider.tsx`, `apps/mobile/src/theme/ThemeProvider.tsx` |

**Paleta clave (de tokens):** `brand.500 #F97316` (primario), `brand.600 #EA580C`
(hover/press), neutros `neutral.0…950`, semánticos `success.600 #16A34A` /
`danger.600 #DC2626` (y `success.500 #22C55E` / `danger.500 #F87171` en dark).
Tipografía **Inter**.

---

## 2. Identidad de marca — logo silueta de gato

Reemplaza el placeholder **"GF"**. Silueta **basada en el gato del autor**
(gato naranja): cabeza redondeada, **orejas altas, puntiagudas y bien
separadas**, cachetes llenos. En tamaño grande lleva **cara sin ojos** (nariz
triangular y boca), y en tamaños chicos se usa la **silueta sólida**.

**Assets exportados y listos** (carpeta `docs/design-reference/brand/` en el repo):
- `brand/icon-app.svg` — 1024², fondo naranja + gato blanco **con cara (sin ojos)**.
- `brand/favicon.svg` — 64², silueta sólida (favicon / tamaños chicos).
- `brand/mark-solid.svg` — silueta en `currentColor`, transparente (recoloreable).
- `brand/logo-lockup.svg` — imagotipo horizontal (chip + wordmark).

**Geometría canónica (viewBox `0 0 100 100`):**

- Silueta: `M25 50 Q21 30 21 14 Q22 11 25 13 L41 34 Q50 30 59 34 L75 13 Q78 11 79 14 Q79 30 75 50 Q81 65 68 79 Q59 89 50 89 Q41 89 32 79 Q19 65 25 50 Z`
- Nariz (triangular): `M46 60 L54 60 L50 65 Z`
- Boca: `M50 65 L50 68 M50 68 Q46 71 43 68.5 M50 68 Q54 71 57 68.5` (stroke 1.7)
- **Sin ojos ni bigotes** (decisión de marca): solo silueta, nariz y boca.

### Integración — Fase F1

**Web** (`apps/web`):
- Copiar `favicon.svg`, `icon-app.svg` a `apps/web/public/`. En
  `apps/web/index.html`: `<link rel="icon" href="/favicon.svg">` +
  `apple-touch-icon` (PNG 180 desde `icon-app.svg`).
- Crear `apps/web/src/components/ui/Logo.tsx` que renderice la silueta
  (`mark-solid`) + wordmark, con prop `variant: 'mark' | 'lockup'` y tamaño.
  Usar `brand.500` de tokens, no hex suelto.
- Reemplazar el "GF" en `AppLayout.tsx` (sidebar) y en `LoginPage.tsx` /
  `RegisterPage.tsx` por `<Logo variant="lockup" />`.

**Mobile** (`apps/mobile`):
- Generar PNGs desde `icon-app.svg`: `icon.png` (1024), `adaptive-icon`
  foreground (gato) + fondo `#F97316`, `splash` (gato centrado sobre naranja o
  `neutral.950` en dark). Guardar en `apps/mobile/assets/images/` y apuntar en
  `app.json` (`icon`, `android.adaptiveIcon`, `splash`).
- Componente `Logo` mobile (react-native-svg) equivalente, usado en
  `navigation/AppHeader.tsx` y `screens/LoginScreen.tsx`.

**Aceptación F1:** no queda ningún "GF" en código ni assets; favicon, app icon
y splash actualizados; el logo se lee bien a 16px. **PR:** `feat(brand): logo gato + favicon/app icons`.

---

## 3. Defectos a corregir (consolidado)

### Contenido / datos — alta prioridad
- **M-01** Login: "porfolio" → "portafolio".
- **M-02** Test: "¿Que…tenes…inverisones?" → "¿Qué…tenés…inversiones?".
- **M-03** Dashboard: "US Tresury" → "US Treasury".
- **M-04** Dashboard: columna *Cantidad* repite "0.5 BTC" en todas las filas →
  cantidades reales por activo (`0.5 BTC`, `100 AAPL`, `5 ETH`, `15 bonos`,
  `8.600 EUR`), unidad según `assetType`.
- **M-05** KPI "Mejor Activo" muestra `+15.2%` (copiado de "Valor Total") →
  rendimiento real del mejor activo (`+12.5%`).

### Consistencia / formato — media
- **M-08** Separador de miles inconsistente (`$100.000` vs `$25,000`) →
  `formatCurrency` de `packages/shared` con **un** locale.
- **M-09** Labels de tipo mezcladas ("Crypto"/"Criptomonedas",
  "Acción"/"Accion") → diccionario único `assetTypeLabel[type]` en
  `packages/shared`, consumido en dashboard, alta y distribución. (De paso,
  `AddAssetPage.tsx` tiene `label: 'Accion'` sin tilde → "Acción".)
- **M-10** Pie de distribución: Criptomonedas y Acciones usan naranjas casi
  iguales → serie de colores distinguibles (`theme.chart`), dot de leyenda = color del slice.
- **M-11** Botón "Ingresar" en dos tonos entre desktop/mobile → único
  `brand.500` en todos los breakpoints.

### Accesibilidad — media/alta
- **M-12** Resultado del test: "Recomendaciones" gris sobre gris (bajo
  contraste) → texto `neutral.600/300` sobre `background.muted` para ≥ 4.5:1.
  *(Ya aplicado en la recreación dark; replicar en el código.)*
- **M-13** Inputs sin label asociado → `label`+`htmlFor`/`id` o `aria-label`.
- **M-14** Opciones del test son `div` clickeables → radiogroup accesible.
- **M-15** Toggle de tema sin nombre accesible → `aria-label` + `aria-pressed`.

### Mobile — alta
- **M-06** Dashboard mobile: la tabla se desborda (columnas cortadas, filas
  repetidas) → **lista de tarjetas** (nombre+ícono, tipo, valor, variación con
  color semántico). Sin scroll horizontal. *(Patrón ya definido en `GrootFolio Mobile.dc.html`.)*
- **M-07** Bar chart mobile muestra 3 barras vs 6 meses del título → 6 barras
  (Ene–Jun) con etiquetas.

### Robustez — media
- **M-16** Tema no persiste → guardar en `localStorage` (web) /
  `AsyncStorage`/`secure-store` (mobile), default a `prefers-color-scheme`.
- **M-17** Faltan estados vacío/carga/error → usar `Skeleton`/`States` ya
  existentes en cada pantalla.
- **M-18** Alta de activo sin validación visible → Zod
  (`createTransactionInputSchema`) con errores inline.

> **Mientras no esté la API:** corregir M-04, M-05, M-08, M-09 en los mocks
> (`apps/web/src/mocks`, `apps/mobile/src/mocks`) para una demo coherente.

---

## 4. Refinamiento por pantalla

Para **cada** pantalla: revisar contra el `.dc.html` correspondiente en
**light y dark**, web y mobile. Checklist por pantalla:

**Login** (`features/auth/LoginPage.tsx`, `screens/LoginScreen.tsx`)
- Logo lockup nuevo (F1). Fix M-01. Labels accesibles (M-13). Botón primario
  único tono (M-11). Card centrada, glow naranja de fondo como en el diseño.

**Dashboard** (`features/dashboard/DashboardPage.tsx`, `screens/DashboardScreen.tsx`)
- 3 KPIs (Valor Total, Ganancia/Pérdida, Mejor Activo) con `StatCard`.
- Fix M-05 (rendimiento real), M-03 (US Treasury), M-04 (cantidades), M-08
  (formato), M-09 (labels), M-10 (colores de gráfico).
- **Web:** tabla "Mis Activos" con columnas Activo/Tipo/Cantidad/Valor/
  Variación/Rentabilidad. **Mobile:** M-06 lista de tarjetas + M-07 6 meses.
- Estados carga/vacío (M-17): usar `DashboardSkeleton` y empty state.

**Cargar Activo** (`features/assets/AddAssetPage.tsx`, `screens/AddAssetScreen.tsx`)
- Selector de tipo (chips) con estado activo naranja. Formulario con labels
  (M-13). Validación Zod inline (M-18). Bloque "Consejos". Fix M-09 (tilde en
  "Acción").

**Test de Perfil** (`features/profile-test/ProfileTestPage.tsx`, `screens/ProfileTestScreen.tsx`)
- Barra de progreso (`ProgressBar`), 1 de 4, 25%. Fix M-02. Opciones como
  radiogroup accesible (M-14), estado seleccionado naranja con check.

**Resultado** (`features/profile-test/ProfileResultPage.tsx`, `screens/ProfileResultScreen.tsx`)
- Ícono escudo, perfil (badge naranja), recomendaciones (fix contraste M-12),
  CTA "Hacer el test nuevamente".

**Layout/Nav**
- Web: `AppLayout.tsx` sidebar (logo, 4 items, usuario) + toggle de tema
  (M-15/M-16). Mobile: `TabNavigator.tsx` (Inicio/Cargar/Perfil) + `AppHeader.tsx`.

---

## 5. Reglas transversales

- **Tokens:** todo color/spacing/radio/tipografía desde `packages/tokens`.
- **Theming:** un solo `ThemeProvider` por app; superficies dark
  `background.canvas #0A0A0A` / `surface #17181C` / borde `#2A2B30`.
  Persistencia + default a sistema (M-16).
- **Formato de números/moneda:** `formatCurrency`/`formatPercent` de
  `packages/shared`, un locale único, signo y color semántico para +/−.
- **Accesibilidad:** contraste AA (auditar con `axe` en web), foco visible en
  todo interactivo, navegación completa por teclado, `aria-label` en botones
  de ícono, radiogroup en el test.
- **Estados:** loading = skeleton (no spinner), empty con CTA, error amigable.

---

## 6. Fases de ejecución

| Fase | Contenido | Defectos | PR sugerido |
|------|-----------|----------|-------------|
| **F0** | CI en verde + mocks coherentes (fijar fechas para capturas) | M-04,05,08,09 | `chore: mocks coherentes + CI verde` |
| **F1** | Marca: logo, favicon, app icons, splash, `Logo.tsx` web+mobile | §2 | `feat(brand): logo gato` |
| **F2** | Textos y taxonomía (diccionario de labels) | M-01,02,03,09 | `fix(ui): typos y taxonomía` |
| **F3** | Dashboard mobile: tarjetas + 6 meses | M-06,07 | `fix(mobile): activos lista + 6 meses` |
| **F4** | Accesibilidad (labels, contraste, radiogroup, teclado) | M-12,13,14,15 | `fix(a11y)` |
| **F5** | Theming: colores de gráfico, botón único, persistencia | M-10,11,16 | `feat(theme)` |
| **F6** | Estados (skeleton/empty/error) + validación Zod | M-17,18 | `feat(ux): estados + validación` |
| **F7** | Paridad final web↔mobile, light↔dark vs `.dc.html` | — | `polish: paridad de diseño` |
| **F8** | QA de entrega: E2E, capturas, previews, docs | — | `chore(qa): entrega` |

**Orden:** F0 primero, F8 al final. F1–F6 paralelizables entre el equipo.

---

## 7. Definición de terminado

- Las 5 pantallas, **web y mobile, light y dark**, coinciden con los `.dc.html`
  de referencia y no tienen ninguno de los defectos M-01…M-18.
- Logo de gato en toda la app (favicon, app icon, splash, sidebar, header,
  login) — sin rastros de "GF".
- `axe` sin violaciones críticas; navegación por teclado completa en web;
  contraste ≥ 4.5:1 en texto normal.
- `pnpm lint/typecheck/test/build` en verde (web + api) y typecheck de mobile.
- Tema persiste y respeta `prefers-color-scheme`.
- E2E de humo en verde (web: login → alta → test; mobile: login → dashboard).

---

## 8. QA para la defensa (F8)

- **E2E:** dejar verdes los specs de `apps/web/e2e/`; un flujo mobile.
- **Capturas finales:** 5 pantallas × light/dark × web/mobile → carpeta para el
  **Manual de Usuario** de la monografía.
- **Previews:** web en Vercel desde `develop`; mobile en Expo Go.
- **Docs:** `docs/FIGMA_REFERENCE.md` (todo `Done`) y `docs/ONBOARDING.md`
  (estado actualizado).

---

## 9. Trazabilidad para la monografía

- **Implementación / capa visual:** F1–F7 y sus PRs.
- **Pruebas:** F8 (E2E + criterios de aceptación por fase).
- **Calidad / accesibilidad:** F4 como evidencia de requisitos no funcionales.
- **Manual de usuario:** capturas de F8.
- Cada defecto `M-xx` corregido es citable como ejemplo del proceso de QA
  sobre el prototipo de Figma.
