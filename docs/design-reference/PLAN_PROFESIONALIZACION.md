# GrootFolio — Plan de profesionalización para la entrega (TFC)

> **Qué es este documento.** Un brief accionable para **Claude Code** (y para el
> equipo) cuyo único objetivo es dejar la app web y mobile **lista para la
> defensa de tesis**: fiel al Figma, sin bugs visibles, accesible, consistente
> y con la nueva identidad de marca (logo silueta de gato) aplicada en todos
> lados.
>
> **No reabre decisiones de stack.** Respeta `docs/adr/0001-arquitectura.md`,
> `CLAUDE.md` y el `docs/CLAUDE_CODE_PLAN.md` existente (fases 1–6). Este plan
> se apoya en aquél: cubre el **pulido de cierre** y la **corrección de los
> defectos detectados sobre el Figma actual**, no vuelve a implementar las
> fases ya definidas.
>
> **Idioma de la UI:** español rioplatense. **Convención de commits:**
> conventional commits, un PR por bloque (ver `docs/GIT_WORKFLOW.md`).

---

## 0. Cómo usar este plan con Claude Code

1. Leé primero las lecturas obligatorias del `CLAUDE_CODE_PLAN.md` (§0).
2. Trabajá **bloque por bloque** (B0…B7). Cada bloque tiene: *objetivo*,
   *alcance con rutas de archivos*, *criterios de aceptación* y *entregable*
   (nombre de PR sugerido).
3. No mezcles bloques en un mismo PR salvo que sean triviales.
4. Todo cambio de color/typo/spacing sale de `packages/tokens`. Cero
   `#RRGGBB` sueltos en componentes de pantalla.
5. Al cerrar cada bloque, adjuntá **screenshots Figma vs implementación** y
   actualizá `docs/FIGMA_REFERENCE.md`.

---

## 1. Análisis de mejoras detectadas sobre el diseño actual

Relevamiento hecho sobre las 5 pantallas del Figma (web + mobile, light +
dark). Clasificado por severidad. Cada ítem tiene un ID (`M-xx`) para
referenciarlo en issues y PRs.

### 1.1 Bugs de contenido / datos (alta prioridad — se notan en la defensa)

| ID | Pantalla | Problema | Corrección |
|----|----------|----------|------------|
| **M-01** | Login | Typo: "Ingresa a tu **porfolio**" | "Ingresa a tu **portafolio**" |
| **M-02** | Test de Perfil | Typos: "¿**Que** experiencia previa **tenes** en **inverisones**?" | "¿**Qué** experiencia previa **tenés** en **inversiones**?" |
| **M-03** | Dashboard (tabla) | "US **Tresury**" | "US **Treasury**" |
| **M-04** | Dashboard (tabla) | La columna **Cantidad** muestra `0.5 BTC` en **todas** las filas (Apple, Ethereum, US Treasury, EUR/USD). Es un placeholder repetido. | Cantidad real por activo: `0.5 BTC`, `100 AAPL`, `5 ETH`, `15 bonos`, `8.600 EUR`. Definir la unidad según `assetType`. |
| **M-05** | Dashboard (KPI) | "Mejor Activo: Bitcoin **+15.2%**" repite el mismo % que "Valor Total". Parece placeholder. | Mostrar el rendimiento **real** del mejor activo (Bitcoin `+12.5%`), calculado de los holdings. |
| **M-06** | Mobile Dashboard | La tabla "Mis Activos" **se desborda**: columnas cortadas ("Variació", "-12.5'") y filas repetidas (todo "Bitcoin/Crypto/0.5 BTC"). | En mobile la tabla **no va como tabla**: reemplazar por **lista de tarjetas** (una card por activo con nombre, tipo, valor y variación). Ver B3. |
| **M-07** | Mobile Dashboard | El bar chart muestra **3 barras** vs **6** en desktop (Enero–Junio). | Mostrar los 6 meses (scroll horizontal o barras más finas) para que coincida con el título. |

### 1.2 Consistencia y formato (media prioridad — dan prolijidad)

| ID | Problema | Corrección |
|----|----------|------------|
| **M-08** | Separador de miles inconsistente: `$100.000` (punto) vs `$25,000` / `+$3,709` (coma). | Unificar con `formatCurrency` de `packages/shared` y locale único (`es-AR` → `$100.000`, o `en-US` → `$100,000`). Elegir uno y aplicarlo en todos lados. |
| **M-09** | Taxonomía mezclada: la tarjeta de distribución dice "Criptomonedas / Acciones", la tabla dice "Crypto / Acción", el alta dice "Criptomonedas / Acción". | Definir labels canónicos por `assetType` en un solo lugar (`packages/shared`) y reusarlos. |
| **M-10** | Pie de "Distribución": **Criptomonedas** y **Acciones** usan dos naranjas casi idénticos → cuesta distinguirlos. | Usar la escala `theme.chart` (series1..series4) con hues realmente distintos, y que el color del dot de la leyenda coincida 1:1 con el color del slice. |
| **M-11** | Botón "Ingresar" del login aparece en dos tonos (naranja pleno en desktop, naranja claro en mobile). | Un solo color de botón primario (`brand.solid`) en todos los breakpoints y plataformas. |

### 1.3 Accesibilidad (media/alta — criterio evaluable de calidad)

| ID | Problema | Corrección |
|----|----------|------------|
| **M-12** | Resultado del test: la card "Recomendaciones para ti" tiene **texto gris claro sobre fondo gris** → contraste bajo (no pasa AA). | Subir contraste del texto (usar `text.secondary` sobre `background.muted`) para llegar a ≥ 4.5:1. |
| **M-13** | Inputs sin `<label>` asociado / placeholder como único rótulo (login, alta de activo). | `label` visible + `htmlFor`/`id`, o `aria-label`. El placeholder no reemplaza al label. |
| **M-14** | Opciones del test son `div` clickeables. | Radiogroup accesible: `role="radiogroup"` + `role="radio"` navegables con teclado, o `<input type="radio">` estilado. |
| **M-15** | Toggle de tema es un ícono sin nombre accesible. | `aria-label="Cambiar tema"` + `aria-pressed`. |

### 1.4 Comportamiento / robustez (para que "se sienta pro")

| ID | Problema | Corrección |
|----|----------|------------|
| **M-16** | El toggle de tema debería **persistir** y respetar el sistema. | Guardar preferencia en `localStorage` (web) / `secure-store` o `AsyncStorage` (mobile) y default a `prefers-color-scheme`. |
| **M-17** | Faltan **estados vacíos / carga / error** (portafolio sin activos, test sin responder, error de red). | Skeletons (no spinners), empty states con CTA, errores amigables. Alineado con Fase 6 del plan base. |
| **M-18** | El formulario de alta no valida. | Validación con los schemas Zod de `packages/shared`; errores inline. |

> **Nota de alcance:** M-04, M-05, M-08, M-09 tocan lógica de datos/mocks.
> Mientras no esté la API (Fase 5 del plan base), corregirlos **en los mocks**
> (`apps/web/src/mocks/portfolio.ts`) para que la demo de la defensa sea
> coherente.

---

## 2. Identidad de marca: nuevo logo (silueta de gato)

Se reemplaza el placeholder **"GF"** por una **silueta de gato redondeada y
amigable** (blanca sobre el naranja de marca `#F97316`). El ícono grande (app
icon, splash) lleva **cara** (ojos + nariz); en tamaños chicos (favicon,
sidebar, header) se usa la **silueta sólida** para máxima legibilidad. Las
variantes y la construcción están en `Logo.dc.html`.

**Path SVG canónico (viewBox `0 0 100 100`):**

```
M28 44 Q22 26 30 20 Q37 24 42 33 Q50 30 58 33 Q63 24 70 20 Q78 26 72 44 Q80 58 68 74 Q50 86 32 74 Q20 58 28 44 Z
```

Rasgos de la cara (solo en tamaño grande, **sin ojos ni bigotes**): nariz
triangular `M46 60 L54 60 L50 65 Z` y boca (dos curvas bajo la nariz). Silueta
basada en el gato del autor: orejas altas y bien separadas. Ver geometría
completa y assets exportados (`brand/*.svg`) en
**`docs/PLAN_CLAUDE_CODE_COMPLETO.md` §2**, que es el brief maestro de ejecución.

### Dónde aplicarlo (B1)

- **Ícono de la app / tile:** cuadrado redondeado `radius.lg`/`xl`, fondo
  `brand.solid`, gato blanco. Reemplaza el "GF".
- **Imagotipo horizontal:** ícono + wordmark "Groot**Folio**" (`Groot`
  `text.primary`, `Folio` `brand.solid`).
- **Favicon** web (`apps/web/public/`): exportar 16/32/48 + `apple-touch-icon`
  180 + `favicon.svg`. Reemplazar el actual en `apps/web/index.html`.
- **Mobile** (`apps/mobile/assets/images/`): `icon.png` (1024), `adaptive-icon`
  (foreground gato + fondo naranja), `splash` (gato centrado). Actualizar
  `app.json`.
- **Sidebar web** y **header mobile:** el imagotipo.

**Variantes a exportar:** naranja pleno (default), sobre fondo oscuro (gato
naranja), monocromo (`neutral.900` / `neutral.0`), y contorno.

**Criterio de aceptación B1:** no queda ningún "GF" en el código ni en assets;
favicon y app icon actualizados; el logo se lee bien a 16px.
**Entregable:** PR `feat(brand): logo silueta de gato + favicon/app icons`.

---

## 3. Bloques de trabajo

> Los bloques B2–B7 asumen que la estructura de las fases 1–4 del
> `CLAUDE_CODE_PLAN.md` ya está (o se hace en paralelo). Este plan añade la
> capa de **corrección + pulido + entrega**.

### B0 — Setup de calidad y base de datos coherente

**Objetivo:** que el estado del repo permita medir "profesional".
- Confirmar que `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pasan
  en verde (web + api) y `pnpm -F @grootfolio/mobile typecheck` en mobile.
- Corregir mocks para que la demo sea coherente (M-04, M-05, M-08, M-09).
- Fijar `new Date('2026-...')` en mocks para screenshots reproducibles.

**Aceptación:** CI verde; mocks sin datos repetidos/placeholder.
**Entregable:** PR `chore(mocks): datos de portafolio coherentes + CI verde`.

### B1 — Marca (ver §2). PR `feat(brand): logo silueta de gato`.

### B2 — Corrección de textos y taxonomía

**Alcance:** M-01, M-02, M-03, M-09.
- Fix de typos en las pantallas (`apps/web/src/features/**`,
  `apps/mobile/src/screens/**`).
- Diccionario de labels por `assetType` en `packages/shared` (p. ej.
  `assetTypeLabel[type]`) y consumo en dashboard, alta y distribución.

**Aceptación:** cero typos; misma etiqueta para el mismo tipo en toda la app.
**Entregable:** PR `fix(ui): typos y taxonomía de tipos de activo`.

### B3 — Dashboard mobile: tabla → lista de tarjetas

**Alcance:** M-06, M-07.
- Reemplazar la tabla horizontal por una **lista de cards** (nombre + ícono,
  tipo, valor, variación con color semántico). Sin scroll horizontal.
- Bar chart de rendimiento con los **6 meses** (Ene–Jun) visibles.

**Aceptación:** en un viewport de 375px no hay overflow horizontal; se ven las
5 filas reales y los 6 meses.
**Entregable:** PR `fix(mobile): activos como lista y rendimiento de 6 meses`.

### B4 — Accesibilidad

**Alcance:** M-12, M-13, M-14, M-15.
- Contraste AA en textos (auditar con `axe` en web).
- Labels + aria en inputs; radiogroup accesible en el test; nombres
  accesibles en botones de ícono (tema, menú).
- Foco visible por teclado (ya hay base en `styles.css`; extender a todos los
  interactivos).

**Aceptación:** `axe` sin violaciones críticas; navegación completa por teclado
en web; contraste ≥ 4.5:1 en texto normal.
**Entregable:** PR `fix(a11y): labels, contraste y navegación por teclado`.

### B5 — Theming robusto

**Alcance:** M-10, M-11, M-16.
- Colores de gráficos desde `theme.chart` con hues distinguibles; leyenda
  coincidente con slices.
- Botón primario con un único color en todos los breakpoints.
- Persistencia de tema + default a `prefers-color-scheme`.

**Aceptación:** recargar mantiene el tema; pie chart legible; botones
consistentes.
**Entregable:** PR `feat(theme): persistencia + gráficos consistentes`.

### B6 — Estados y validación

**Alcance:** M-17, M-18 (refuerza Fase 6 del plan base).
- Skeletons para cards/tabla/gráficos; empty states (portafolio vacío, test
  sin responder); errores amigables.
- Validación Zod en alta de activo con errores inline.

**Aceptación:** cada pantalla tiene sus 3 estados (loading/empty/error);
el alta no deja guardar datos inválidos.
**Entregable:** PR `feat(ux): estados de carga/vacío/error + validación`.

### B7 — QA de entrega y material para la defensa

**Alcance:**
- Smoke E2E: web con Playwright (login, alta de activo, test) —ya hay specs en
  `apps/web/e2e/`, dejarlos verdes—; mobile un flujo (login → dashboard).
- **Set de capturas finales** (las 5 pantallas × light/dark × web/mobile) para
  el **Manual de Usuario** de la monografía.
- Deploy preview: web en Vercel desde `develop`; mobile en Expo Go.
- Actualizar `docs/FIGMA_REFERENCE.md` (todos los screens `Done`) y el
  `ONBOARDING.md` (estado del proyecto).

**Aceptación:** E2E en verde; carpeta de capturas completa; previews
accesibles.
**Entregable:** PR `chore(qa): e2e verdes + capturas para monografía`.

---

## 4. Orden sugerido y "definición de terminado"

**Orden:** B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7.
(B1–B5 pueden paralelizarse entre Ivan y Franco; B0 primero y B7 al final.)

**Definición de terminado para la entrega:**
- Las 5 pantallas web + mobile, light y dark, **coinciden con el Figma** y no
  tienen ninguno de los defectos M-01…M-18.
- Logo de gato aplicado en toda la app (favicon, app icon, splash, sidebar,
  header) — sin rastros de "GF".
- `axe` sin críticos; navegación por teclado completa en web.
- `pnpm typecheck/lint/test/build` en verde (web + api) y typecheck de mobile.
- E2E de humo en verde; capturas finales listas para el Manual de Usuario.
- `docs/FIGMA_REFERENCE.md` y `ONBOARDING.md` actualizados.

---

## 5. Trazabilidad (para la monografía)

Este plan aporta material directo a varios capítulos del TFC:
- **Implementación / capa visual:** bloques B1–B6 y sus PRs.
- **Pruebas:** B7 (E2E + criterios de aceptación por bloque).
- **Calidad / accesibilidad:** B4 como evidencia de cumplimiento de criterios
  no funcionales.
- **Manual de usuario:** capturas finales de B7.

Cada defecto `M-xx` corregido puede citarse en el capítulo de implementación
como ejemplo de proceso de QA sobre el prototipo de Figma.
