# GrootFolio - Plan de implementacion para Claude Code

Este documento es el brief que le pasamos a **Claude Code** (y a cualquier
colaborador humano) para desarrollar la capa visual de GrootFolio a partir
del Figma ya existente. No cubre la logica del backend ni la integracion con
APIs externas mas alla de lo imprescindible: el foco es **levantar web y
mobile con pantallas navegables, theming completo y datos mockeados**.

## 0. Antes de empezar

**Lecturas obligatorias:**

1. `CLAUDE.md` - contexto del producto, stack acordado, como trabajar con
   el equipo.
2. `docs/adr/0001-arquitectura.md` - decisiones de arquitectura ya tomadas.
   **No se reabren salvo justificacion tecnica fuerte.**
3. `docs/GIT_WORKFLOW.md` - flujo de ramas y convencion de commits.
4. `docs/FIGMA_REFERENCE.md` - mapeo de pantallas Figma -> archivos de codigo.
5. Link al Figma:
   https://www.figma.com/design/O6cIXsG4QHLIF8gmc9ip4T/GrootFolio---Investment-Portfolio-Manager

**Setup local:**

```bash
./scripts/bootstrap.sh   # instala dependencias y prepara envs
pnpm dev:web             # arranca web en http://localhost:5173
pnpm dev:mobile          # arranca Expo (escaneo QR o 'i'/'a' para simulador)
pnpm dev:api             # arranca Adonis en http://localhost:3333
```

**Reglas generales:**

- Todo en TypeScript estricto. Nada de `any` salvo en adaptadores de librerias
  sin tipos (y justificarlo con comentario).
- Idioma de la UI: **espanol rioplatense**. Textos tecnicos pueden quedar en
  ingles (p. ej. "stablecoin").
- Cada fase tiene **criterios de aceptacion** y **entregable**. No avanzar
  a la siguiente sin cerrar la anterior.
- Un PR por fase (o sub-fase si la fase es grande). Commits siguiendo
  conventional commits.
- Si algo del Figma no se entiende o hay contradicciones, abrir issue con
  tag `question` y etiquetar a @ivishooo.

## Fase 1 - Design system compartido

**Objetivo:** dejar todos los tokens visuales listos para que web y mobile
los consuman sin copiar-pegar.

**Alcance:**

1. Revisar `packages/tokens/src/index.ts`: confirmar que cubre todos los
   colores usados en el Figma (hover, disabled, focus ring).
2. Generar `packages/tokens/src/tailwind-preset.ts` con el mapeo a utilidades
   de Tailwind (`colors`, `borderRadius`, `fontFamily`, `boxShadow`).
3. Definir la tipografia Inter:
   - Web: importar desde `@fontsource/inter` y configurar `tailwind.config.ts`.
   - Mobile: cargar con `expo-font` (`Inter_400Regular`, `Inter_500Medium`,
     `Inter_600SemiBold`, `Inter_700Bold`).
4. Exponer un `ThemeProvider` en web similar al de mobile
   (`apps/mobile/src/theme/ThemeProvider.tsx`) y una clase `dark` en
   `<html>` para que Tailwind active `dark:`.
5. Smoke test visual: un snippet en `apps/web/src/design-system.tsx` (no
   ruteado, solo import manual) que renderiza los swatches de color y los
   heading levels para validar a ojo.

**Criterios de aceptacion:**

- `pnpm -F @grootfolio/tokens build` pasa sin warnings.
- En web, cambiar `document.documentElement.classList.toggle('dark')` cambia
  el tema entero sin recargar.
- En mobile, alternar con el toggle del sistema cambia el tema.
- No hay colores hardcodeados (`#XXXXXX`) en componentes de pantalla. Solo
  se permiten en `tokens`.

**Entregable:** PR `feat(tokens): design system + theming web/mobile`.

## Fase 2 - Navegacion y layouts base

**Objetivo:** estructura esqueleto para que cada pantalla tenga su "casa".

**Alcance web:**

1. Rutas con React Router en `apps/web/src/app/App.tsx` (ya existen como
   stubs; confirmar):
   - `/` -> redirect a `/login` si no auth, a `/dashboard` si auth.
   - `/login`
   - `/dashboard`
   - `/assets/new`
   - `/profile-test`, `/profile-test/result`
   - `/settings`
2. `AppLayout` con sidebar fija (240px), header (56px), y area de contenido
   con padding responsivo. En `< md` el sidebar colapsa a drawer.
3. `ProtectedRoute` que lee un flag mock de auth (luego reemplazado por el
   store real).
4. Placeholder de componente `UserMenu` en el header (avatar + dropdown
   stub).

**Alcance mobile:**

1. `RootNavigator` con native-stack (ya existe); confirmar que `initialRoute`
   es `Login`.
2. Mover Dashboard a un stack con bottom tab navigator (`@react-navigation/bottom-tabs`)
   que exponga: Dashboard, Cargar Activo, Perfil. Login queda fuera del tab.
3. Header global con logo `GF` + boton de theme toggle en el top-right.

**Criterios de aceptacion:**

- Navegar manualmente entre todas las rutas web/mobile sin romper.
- En mobile, el stack de auth (`Login`) no muestra los tabs; el stack
  autenticado si.
- Deep link a `/assets/new` abre el layout completo, no solo la pagina
  suelta.

**Entregable:** PR `feat(app): shell de navegacion web y mobile`.

## Fase 3 - Pantallas visuales con datos mock

**Objetivo:** clonar el Figma pixel-aware (no pixel-perfect; respetar
proporciones, colores y jerarquia visual) con datos locales.

**Prioridad:**

1. **Login** (web + mobile)
2. **Dashboard**: cards de KPIs, pie chart de distribucion, bar chart de
   rendimiento, tabla de holdings.
3. **Add Asset**: tabs por tipo (crypto/accion/bono/divisa) + formulario con
   validacion Zod usando los schemas de `packages/shared`.
4. **Profile Test**: progress bar + una pregunta a la vez, 4 opciones.
   Persistir respuestas en estado local.
5. **Profile Result**: hero con perfil (conservador/moderado/agresivo) +
   asignacion sugerida en grafico de barras.
6. **Settings (solo web)**: perfil, preferencias (tema, moneda base), cerrar
   sesion.

**Datos mock:**

- Usar los valores exactos del Figma: `totalValue: 100000`, `pnl: 3709`,
  `growth: 15.2%`, holdings (BTC, AAPL, ETH, US-T, EUR).
- Web: `apps/web/src/mocks/portfolio.ts` (ya creado).
- Mobile: mantener mocks inline en cada screen hasta Fase 5.

**Graficos:**

- Web: `recharts`. Usar colores de `theme.chart`.
- Mobile: `victory-native`. Si hay problemas de setup, documentar fallback
  a SVG a mano en el propio PR.

**Criterios de aceptacion:**

- Todas las pantallas del Figma estan presentes y son navegables.
- Light + dark mode se ven correctos en todas las pantallas (contraste >= AA).
- Formularios muestran errores inline al enviar con campos invalidos.
- Cero warnings de accesibilidad criticos en la consola de Chrome (`axe`) en
  web.

**Entregable:** PRs por pantalla:

- `feat(web+mobile): pantalla de login`
- `feat(web+mobile): dashboard con mocks`
- `feat(web+mobile): alta de activo`
- `feat(web+mobile): test y resultado de perfil`
- `feat(web): pantalla de settings`

## Fase 4 - Componentes reutilizables

**Objetivo:** sacar a primitivos los patrones que se repiten.

**Web:** `apps/web/src/components/ui/`

- `Button` (variants: primary/secondary/ghost/destructive; sizes sm/md/lg)
- `Input`, `Select`, `Textarea`, `DatePicker`
- `Card`, `Stat`, `Badge`, `ProgressBar`, `Tabs`
- `Table` con tipado generico via props

**Mobile:** `apps/mobile/src/components/`

- Equivalentes de Button, Input, Card, Tabs, ProgressBar, Badge.
- Un `Screen` wrapper con `SafeAreaView` + padding default + manejo de
  teclado (`KeyboardAvoidingView`).

**Criterios de aceptacion:**

- Al menos 3 pantallas de la Fase 3 se refactorizaron para consumir estos
  componentes.
- Cada componente tiene su `.tsx` + props tipadas + documentacion inline
  minima (una frase por componente).
- Tailwind sigue compilando sin warnings de clases dinamicas.

**Entregable:** PR `refactor(ui): extrae primitivos web y mobile`.

## Fase 5 - Integracion con API real (opcional para la capa visual)

**Nota:** esta fase **no corresponde a Claude Code si el alcance pedido es
solo visual**. Se incluye para dar contexto de que sigue. Solo arrancar si
se habilita explicitamente.

**Alcance:**

- Levantar auth real contra `apps/api`.
- Reemplazar mocks por `useQuery` de TanStack Query en web y mobile.
- Cache compartida de precios: el api ya debe exponer `GET /portfolio` con
  valores actualizados.
- Agregar estados `loading` y `error` a todas las pantallas.

**Criterios de aceptacion:**

- Login real persistido (cookie httpOnly en web, secure-store en mobile).
- Deslogueo limpio (clean de cache + redirect).
- No hay llamadas al fetch sin estar envueltas en un query/mutation.

## Fase 6 - Pulido y QA

**Alcance:**

- Loading skeletons para cards, tablas y graficos (no spinners genericos).
- Empty states (sin holdings, sin transacciones, test sin responder).
- Mensajes de error amigables (no toast de stack trace).
- Pase final de accesibilidad: labels en todos los inputs, foco visible,
  navegacion con teclado funcional en web.
- Smoke tests E2E:
  - Web: Playwright, tres flujos (login, add asset, run quiz).
  - Mobile: Detox o Maestro, un flujo (login -> dashboard).

**Entregable:** PR `chore(qa): loading/empty/error states + e2e basicos`.

## Convenciones para Claude Code

- **Mockear el tiempo:** cuando uses fechas, `new Date('2026-04-22')` para
  que los screenshots y tests sean reproducibles.
- **No inventes pantallas**. Si falta algo en el Figma, abrir issue antes
  de inventarlo.
- **Preferir composicion a props magicas.** Ej: `<Card><Card.Header>...`
  en vez de `<Card title="..." subtitle="..." />` con mil props.
- **Commits chicos.** Cada commit deberia poder revertirse sin romper el
  build.
- **No agregues dependencias sin ADR.** Si necesitas una libreria nueva,
  crea `docs/adr/000X-libreria-<nombre>.md` con la justificacion y dos
  alternativas descartadas.
- **Al terminar cada fase**, actualiza `docs/FIGMA_REFERENCE.md` marcando
  los screens como `Stub` -> `WIP` -> `Done`.

## Criterios de "done" del alcance visual (fin Fase 4)

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pasan en web y
  api, y `pnpm -F @grootfolio/mobile typecheck` pasa en mobile.
- Web desplegada en Vercel preview desde `develop`.
- Mobile corriendo en Expo Go con todas las pantallas accesibles desde
  navegacion (sin deep links manuales).
- Screenshots comparativas Figma vs implementacion adjuntas al PR de cierre.

---

Cualquier duda sobre este plan, preguntar en el issue que acompana cada fase
o dejar un comentario en el PR. El responsable humano del review de esta
capa es @ivishooo; el responsable del backend y los contratos es
@Davichenco.
