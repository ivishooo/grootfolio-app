# Plan de implementación — Mejoras de carga, gestión y reportes de activos

> Documento operativo para ejecutar con Claude Code sobre `grootfolio-app`.
> Alcance: web (`apps/web`), mobile (`apps/mobile`) y API (`apps/api`) + contrato
> compartido (`packages/shared`). Objetivo final: dejar todo mergeado en `develop`,
> desplegado en el ambiente de desarrollo (Railway/Fly + Vercel) y subido a
> TestFlight para testeo en device.

---

## 0. Contexto y diagnóstico

**Stack relevante** (confirmado en el repo):

- **API**: AdonisJS 6 + Lucid + Postgres. Precios vía `price_service` con routing por
  tipo (`crypto→coingecko`, `stock→yahoo`, `currency→fxProvider`, `bond→unsupported`).
  Moneda base **USD**. FX vía `fx_service` (`getRateToUsd`).
- **Web**: React 19 + Vite + TanStack Query + Zustand + Recharts + react-router.
- **Mobile**: Expo SDK 54 + React Navigation 7 (bottom-tabs) + TanStack Query.
- **Contrato**: `@grootfolio/shared` (tipos + schemas Zod). Cualquier cambio acá
  impacta los tres apps a la vez — declararlo en el PR (regla de `GIT_WORKFLOW.md`).

**Modelo de datos actual** (`transactions` + `asset_catalog`):

- `transactions`: `kind` (buy/sell), `quantity`, `unit_price`, `fee`, `purchased_at`,
  `deleted_at` (soft delete). **`unit_price` se asume siempre en USD.**
- `asset_catalog`: `symbol`, `name`, `type`, `currency`, `preferred_provider`.
  El controller hace `firstOrCreate` por `(symbol, type)` y, si el activo no existe,
  lo crea con `name = symbol.toUpperCase()` y `currency = 'USD'` **fijo**.

### 0.1 Causa raíz del bug del punto 2 (rentabilidad -99.9% en USD)

Reproducción del caso del usuario (compra de 50 USD a "precio 1450"):

1. Se crea el activo `USD` tipo `currency` con `currency = 'USD'` (default del controller).
2. `price_service` rutea `currency → fxProvider`; `getRateToUsd('USD') = 1` ⇒ `currentPrice = 1`.
3. `holdings_service` calcula `avgPrice = totalCost/qty = (50×1450)/50 = 1450`.
4. `portfolio_service` (línea 42-50): `rate = 1` (moneda USD) ⇒ `avgPrice` queda 1450;
   `invested = 1450 × 50 = 72.500`; `value = 1 × 50 = 50`; `pnl = 50 − 72.500 = −72.450`;
   `pnlPercent = −99.9%`.

Coincide **exactamente** con la captura (`US$ 50` / `-99.9%` / `-US$ 72.450`).

**El problema de fondo**: el formulario tiene un único campo "Precio unitario (USD)" y el
modelo asume que `unit_price` está en USD. Para una divisa, el usuario ingresa lo que
pagó en **otra moneda** (1450 ARS por dólar), pero el sistema lo interpreta como 1450 USD.
Falta el concepto de **moneda de cotización / moneda del precio** por transacción.

### 0.2 Convenciones de trabajo (de `GIT_WORKFLOW.md`)

- Ramas `feature/*` y `fix/*` parten de `develop`. Conventional commits. **Squash merge**.
- CI obligatorio en verde: `Lint + typecheck`, `Unit tests`, `Build web + api`.
- Ivan tiene bypass de review en `develop` (CI verde + checklist alcanza).
- Correr siempre antes de pushear: `pnpm typecheck && pnpm lint && pnpm test`.
- Instalar deps **solo con `pnpm install`** (nunca npm/yarn — rompe workspaces).
- Cambios en `packages/shared` → aclararlo en el PR (impacta web+mobile+api).

---

## 1. Orden de ejecución y dependencias

El orden minimiza retrabajo: el modelo de "moneda del precio" (Fase 2) es la base del
cálculo correcto y de los reportes, así que va temprano.

| # | Fase | Rama sugerida | Depende de | Toca shared/migración |
|---|------|---------------|------------|------------------------|
| A | Spacing tabla dashboard | `fix/dashboard-table-spacing` | — | No |
| B | Settings mobile | `feature/mobile-settings` | — | No |
| C | Moneda del precio + formularios por tipo + fix rentabilidad | `feat/typed-asset-forms` | — | **Sí** (shared + migración) |
| D | Autocomplete de activos | `feat/asset-autocomplete` | C (recomendado) | **Sí** (shared) |
| E | Sección "Activos" (CRUD) + toast + redirect | `feat/assets-management` | C, D | **Sí** (shared: PATCH) |
| F | Reportes / histórico mark-to-market | `feat/reports` | C | **Sí** (shared + migración) |
| G | Deploy desa + TestFlight | `chore/release-*` | A–F mergeadas | No |

A y B son independientes y sirven para calentar el pipeline de CI/deploy con cambios chicos.

---

## Fase A — Corregir el espaciado de la tabla "Mis Activos"

**Objetivo**: eliminar el espacio vacío sin sentido entre columnas (captura del punto 3).

**Causa**: `apps/web/src/features/dashboard/DashboardPage.tsx` usa una `<table className="min-w-full">`
con 6 columnas sin control de ancho ni alineación; con contenido corto, el navegador estira
las columnas y deja huecos grandes. Los `<td>` numéricos quedan alineados a la izquierda.

**Cambios (`DashboardPage.tsx`, bloque `<table>` líneas ~93-118)**:

- Usar `w-full` + `table-auto` y **alinear a la derecha** las columnas numéricas
  (`Cantidad`, `Valor`, `Variación`, `Rentabilidad`) con `text-right`; dejar `Activo` y
  `Tipo` a la izquierda.
- Agregar padding horizontal consistente por celda (`px-3 py-2`) tanto en `<th>` como `<td>`.
- Que la primera columna (`Activo`) absorba el ancho sobrante (`w-full` en ese `th`, o
  `whitespace-nowrap` en las numéricas) para que los números queden juntos a la derecha
  en vez de dispersos.
- Verificar en dark mode (los borders ya usan `dark:border-neutral-800`).

**Mobile**: `DashboardScreen.tsx` ya usa filas tipo card (`holdingRow`) sin este problema;
solo revisar visualmente que el `paddingVertical` y el borde superior se vean parejos.

**Tests**: no requiere unit test nuevo; validación visual + snapshot Playwright existente
(`web/e2e`) no debería romperse. Screenshot antes/después en el PR.

---

## Fase B — Construir el apartado de Configuración en mobile

**Objetivo**: reemplazar el placeholder "Próximamente..." de `apps/mobile/src/screens/SettingsScreen.tsx`
por una pantalla funcional espejo de la web (`SettingsPage.tsx`).

**Contexto**: la web ya tiene Apariencia (toggle tema), Preferencias (moneda base) y
Cuenta (nombre/email + logout). Mobile tiene `ThemeProvider` con `toggleTheme` y un
`AuthProvider` con `user`/`logout` disponibles.

**Cambios (`SettingsScreen.tsx`)**:

- **Apariencia**: fila con label "Tema" + botón que llama `toggleTheme()` (mostrar
  ☀ Claro / ☾ Oscuro según `themeName`). Reusar tokens de `useTheme()`.
- **Preferencias**: selector de "Moneda base" (USD/ARS/EUR). Igual que en web hoy es
  solo preview de `formatCurrency` (estado local); **no** conectar a persistencia todavía
  (la moneda base real es alcance de la Fase F si se decide monetizar la preferencia).
  Dejar TODO comentado apuntando a esa fase.
- **Cuenta**: nombre y email desde `useAuth().user`; botón "Cerrar sesión" que llama
  `logout()` y navega al login (el `RootNavigator` ya conmuta por estado de auth).
- Estilos con `StyleSheet` usando `theme.background.surface`, `theme.border.default`,
  `theme.text.*`, consistentes con las otras screens.

**Tests**: agregar (o extender) un flow Maestro en `apps/mobile/.maestro/` que abra la tab
Config, togglee el tema y verifique el logout. Unit no aplica.

---

## Fase C — Moneda del precio + formularios por tipo + fix de rentabilidad

> **La fase clave.** Corrige el bug del punto 2 y sienta la base contable para las Fases E y F.

### C.1 Contrato compartido (`packages/shared`)

**`src/schemas/index.ts`** — extender `createTransactionInputSchema`:

- Agregar `priceCurrency: z.string().length(3).default('USD')` — moneda en la que están
  expresados `unitPrice` y `fee`. Para crypto/stock/bond en USD queda `'USD'`.
- (Opcional recomendado) validación cruzada: si `type === 'currency'`, `symbol` (la moneda
  comprada) debe ser distinto de… no necesariamente; permitir comprar USD contra ARS.
  La regla real es `priceCurrency !== symbol` para divisas (no tiene sentido "pagar USD por USD").

**`src/types/index.ts`** — agregar `priceCurrency: string` a `Transaction`.

**`src/utils/index.ts`** — `averageCost` hoy suma `quantity*unitPrice+fee` asumiendo USD.
Documentar que a partir de ahora el costo se normaliza a USD **antes** de agregar (la
conversión vive en el service de la API, no acá), o mover la firma a recibir montos ya en USD.

### C.2 Migración (`apps/api/database/migrations`)

Nueva migración `0003_add_price_currency_to_transactions.ts`:

- `alter table transactions add column price_currency varchar(10) not null default 'USD'`.
- Backfill implícito por default (las transacciones viejas quedan en USD, que es la
  suposición actual — no cambia su comportamiento).

Modelo `apps/api/app/models/transaction.ts`: agregar `@column({ columnName: 'price_currency' }) declare priceCurrency: string`.

Validator `apps/api/app/validators/transaction.ts`: agregar `priceCurrency` (vine, string,
default 'USD', uppercase, longitud 3).

### C.3 Cálculo de costo en USD (el fix real)

El principio: **el costo (`avgPrice`) siempre se agrega en USD base**. Hoy
`holdings_service` suma `unit_price` crudo y `portfolio_service` intenta corregir con el FX
de `asset.currency` — mezcla responsabilidades y falla para divisas.

Cambio propuesto (decisión de diseño → merece nota breve en `docs/adr/`):

- Convertir cada transacción a USD **en el momento de agregar**, usando el FX de su
  `priceCurrency`. Para MVP: **FX actual** (`getRateToUsd(priceCurrency)`), consistente con
  cómo el resto del sistema valúa. Documentar la limitación (no usa FX de la fecha de compra;
  eso se resuelve en la Fase F con snapshots históricos si se quiere precisión temporal).
- `apps/api/app/services/portfolio/holdings_service.ts`: `aggregateHoldings` pasa a recibir
  (o a resolver) un mapa `fxByCurrency` y calcular `totalCost += quantity*unitPriceUsd + feeUsd`
  donde `unitPriceUsd = unitPrice * rate(priceCurrency)`. La función sigue pura: el controller
  le inyecta las tasas (mismo patrón que `portfolio_service` ya usa con `fxRates`).
- `apps/api/app/services/portfolio/portfolio_service.ts`: **quitar** la reconversión por
  `asset.currency` (líneas 42-43). El `avgPrice` ya llega en USD; solo compara contra
  `currentPrice` (USD). Esto elimina el doble manejo de moneda que produce el −99.9%.

**Caso divisa `USD`**: comprar 50 USD pagando 1450 ARS ⇒ `priceCurrency='ARS'`,
`unitPrice=1450`. `rate(ARS)≈0.00069` ⇒ `unitPriceUsd≈1.0` ⇒ costo ≈ 50 USD; `value = 50×1`
(rate USD=1) ⇒ `pnl≈0`, `pnlPercent≈0%`. Bug resuelto.

**Caso divisa `EUR`** (comprar 100 EUR pagando USD a 1.08): `priceCurrency='USD'`,
`unitPrice=1.08`, `symbol='EUR'` (currency del activo 'USD' en el seed) ⇒ costo 108 USD;
`currentPrice = rate(EUR→USD)` ⇒ pnl según movimiento del euro. Coherente.

### C.4 Controller (`transactions_controller.ts`)

- `store`: propagar `priceCurrency` al `Transaction.create`.
- Al hacer `firstOrCreate` del asset: para `type === 'currency'`, setear `asset.currency`
  = **la moneda comprada** (el `symbol`), no 'USD' fijo. Ej: activo `EUR` → `currency='EUR'`
  no tiene sentido para pricing FX (el fxProvider necesita saber que se valúa contra USD).
  **Revisar `fxProvider`/`fx_provider.ts`** para confirmar cómo mapea `symbol`→par FX y
  ajustar el seed si hace falta (hoy `EUR` tiene `currency:'USD'`, o sea "se valúa en USD",
  que es la convención correcta; mantenerla y **no** derivar `currency` del symbol para divisas).
  → Acción concreta: dejar `currency='USD'` para activos `currency` (se valúan en USD) y que
  el fxProvider resuelva el par por `symbol`. El costo se maneja por `priceCurrency`, no por
  `asset.currency`.

### C.5 Formularios por tipo (web + mobile)

Hoy `AddAssetPage.tsx` / `AddAssetScreen.tsx` muestran los mismos campos para los 4 tipos,
con "Precio unitario (USD)" y "Comisión (USD)" hardcodeados. Rediseño por tipo:

- **crypto**: Cantidad · Precio unitario (USD) · Comisión (USD) · Fecha. (sin cambios de labels)
- **stock**: Cantidad · Precio unitario + **selector de moneda del precio** (USD/ARS) ·
  Comisión (misma moneda) · Fecha. Cubre acciones .BA en ARS.
- **bond**: como stock; nota inline "los bonos aún no tienen precio en vivo (valuación
  manual)" porque `price_service` los marca `unsupported`.
- **currency (Divisa)**: relabelar para que se entienda. Ej:
  - `symbol` → "Moneda que compraste" (ej. USD, EUR).
  - `quantity` → "Cantidad comprada".
  - `unitPrice` + selector → "Precio pagado por unidad" + "Moneda con la que pagaste"
    (`priceCurrency`, default ARS para el caso del usuario).
  - Texto de ayuda: "Ej: compraste 50 USD pagando 1450 ARS cada uno".
  - Validación: `priceCurrency !== symbol`.

Implementación: derivar los campos visibles y labels de `activeType` (un objeto de
configuración por tipo). Mantener el mismo `createTransactionInputSchema` (ahora con
`priceCurrency`). En mobile replicar con `FormField` + un `Select`/`Picker` para la moneda.

### C.6 Tests

- **API (Japa, `apps/api/tests/unit`)**: nuevos specs para `holdings_service` y
  `portfolio_service` cubriendo: divisa USD comprada en ARS (pnl≈0), stock en ARS, crypto en
  USD, y la regresión exacta del −99.9% (assert que ya no ocurre). Reusar el patrón de
  `fx_rates.spec.ts`.
- **Web (Vitest + Playwright)**: `web/e2e/add-asset.spec.ts` extendido con el flujo de divisa.
- **Mobile (Maestro)**: alta de una divisa.

---

## Fase D — Autocomplete del nombre de activo

> Decisión tomada: **catálogo local primero, búsqueda externa después** (dos sub-fases).

### D.1 Backend — endpoint de búsqueda (sub-fase local)

- Habilitar la ruta ya prevista (comentada en `start/routes.ts` línea 44). Nueva
  `AssetsController` con `GET /assets/search?q=&type=` (autenticada):
  - Query sobre `asset_catalog`: `where('type', type?)` + `whereILike('name', %q%)` OR
    `whereILike('symbol', %q%)`, `limit 10`.
  - Devuelve `{ results: Array<{ symbol, name, type, currency }> }`.
- **Ampliar el seed** `asset_catalog_seeder.ts`: pasar de 6 a ~top 50-100 activos por
  categoría (cripto principales, acciones US + algunas .BA, divisas mayores, bonos comunes).
  Mantener idempotencia (`updateOrCreate` por `symbol,type`). Correr el seed en desa.

### D.2 Backend — proveedores externos (sub-fase 2)

- Extender `AssetsController.search`: si el catálogo local devuelve pocos resultados,
  consultar el provider según `type`:
  - crypto → CoinGecko `/search` (ya existe `coingecko_client.ts` + `coingecko_symbol_map.ts`).
  - stock → Yahoo search (ya existe `yahoo_provider.ts` + `yahoo_symbol_map.ts`).
  - currency → lista fija de divisas soportadas por `fx_service` (`FRANKFURTER_KNOWN` + ARS).
- **Persistir** en `asset_catalog` (`firstOrCreate`) los activos elegidos desde búsqueda
  externa, con `name`/`currency`/`preferred_provider` correctos — así se resuelve de paso el
  problema de que hoy el `name` queda como el symbol en mayúscula.
- Cachear resultados externos con TTL corto para no pegarle a los rate limits.

### D.3 Contrato (`packages/shared`)

- `src/api/index.ts`: agregar el tipo de respuesta de búsqueda y (si se usa) el path.
- Considerar agregar `assetId` opcional a `createTransactionInputSchema` para que, al
  seleccionar del autocomplete, el front mande el id del catálogo y el back no dependa de
  re-resolver por symbol. (Alternativa: seguir con symbol+type, más simple; el autocomplete
  garantiza que el symbol es válido.)

### D.4 Frontend

- **Web**: componente `AssetAutocomplete` (nuevo, en `components/ui/`): input con debounce
  (~250ms) → `useAssetSearch(q, type)` (TanStack Query) → dropdown de resultados; al
  seleccionar, setea `symbol` (+ name/currency) y **bloquea** el `type` al del activo elegido.
  Reemplaza el `<Input label="Nombre del activo">` de `AddAssetPage.tsx`.
- **Mobile**: mismo patrón con un dropdown/`FlatList` bajo el `FormField` en `AddAssetScreen.tsx`.
- Hooks: agregar `useAssetSearch` en `web/src/lib/queries.ts` y `mobile/src/lib/queries.ts`.

### D.5 Tests

- API: spec de `AssetsController.search` (match local, límite, filtro por tipo).
- Web: test del componente autocomplete (debounce, selección) + e2e de alta usando el picker.

---

## Fase E — Sección "Activos" (CRUD) + toast de éxito + redirect

> Decisión tomada: **editar = editar transacciones individuales** (agregar PATCH).

### E.1 Backend

- **Nuevo endpoint** `PUT/PATCH /transactions/:id` en `transactions_controller.ts`:
  `update` con `updateTransactionValidator` (campos editables: `quantity`, `unitPrice`,
  `priceCurrency`, `fee`, `purchasedAt`, `kind`, `notes`). Owner-scope igual que `destroy`
  (filtrar por `user_id`, `whereNull('deleted_at')`, 404 si no es del usuario).
- `DELETE /transactions/:id` ya existe (soft delete). Para "eliminar un activo" (posición
  completa): opción (a) borrar transacción por transacción desde el detalle; opción (b)
  endpoint `DELETE /assets/:assetId/transactions` que soft-deletea todas las del usuario para
  ese activo. Recomendado ofrecer ambas: borrar transacción puntual + "eliminar posición".
- Registrar rutas en `start/routes.ts`.
- Contrato: `updateTransactionInputSchema` en `packages/shared`.

### E.2 Estructura de navegación

**Web** (`apps/web/src/app/App.tsx` + `components/ui/AppLayout.tsx`):

- Cambiar el ítem de nav "Cargar Activo" (`/assets/new`) por **"Activos"** (`/assets`).
- Nueva ruta `/assets` → `AssetsPage` (listado). `/assets/new` sigue existiendo pero **no**
  está en el nav; se llega por botón.
- `AssetsPage`: lista los holdings actuales (o transacciones agrupadas por activo). Cada fila
  se expande a sus transacciones con acciones **Editar** (abre form precargado, reusa la
  lógica de `AddAssetPage`) y **Eliminar** (confirmación → DELETE). Botón "Cargar activo"
  arriba que va a `/assets/new`.
- **Botón "Cargar activo" bajo la tabla "Mis Activos"** del dashboard
  (`DashboardPage.tsx`, dentro del `Card title="Mis Activos"`, también cuando hay holdings,
  no solo en el empty state).

**Mobile** (`apps/mobile/src/navigation/TabNavigator.tsx`):

- Renombrar la tab "Cargar Activo" (`AddAsset`) a **"Activos"** apuntando a un nuevo
  `AssetsScreen` (listado con editar/eliminar).
- `AddAssetScreen` deja de ser tab: se navega vía botón (FAB o botón en header) desde
  Dashboard y desde Activos. Mover a un stack (`RootNavigator` o un stack anidado) para
  poder push/pop. Ajustar `TabParamList`.

### E.3 Toast de éxito + redirect + refresh

- **Web**: al `onSuccess` de `useCreateTransaction`, mostrar un **toast** de "Activo cargado
  correctamente" y `navigate('/dashboard')`. El `invalidateQueries(['portfolio'])` ya
  refresca el dashboard automáticamente. Implementar un `ToastProvider` liviano (context +
  portal, sin librería nueva salvo justificación) o un toast inline reutilizable.
  Quitar el mensaje `success` inline actual de `AddAssetPage`.
- **Mobile**: reemplazar `Alert.alert('Éxito'…)` por un toast no bloqueante y luego
  `navigation.navigate('Dashboard')`. Las queries ya se invalidan.

### E.4 Tests

- API: specs de `update` (happy path, 404 ajeno, validación) y del delete de posición.
- Web: e2e de editar y eliminar un activo; e2e de "cargar → toast → vuelve al dashboard con
  el activo nuevo".
- Mobile: Maestro de alta con redirect.

---

## Fase F — Reportes / histórico (full mark-to-market)

> Decisión tomada: **balance histórico mes a mes valuado con precios y FX de cada fecha**,
> además del ledger y el P&L realizado. Es la fase más pesada; apoyarse en lo ya existente.

### F.1 Qué ya existe y hay que aprovechar

- `apps/api/app/services/portfolio/monthly_return.ts` (`computeMonthlyReturn`).
- `apps/api/app/services/prices/price_history.ts` (histórico de precios).
- Migración `0002_add_is_historical_to_price_snapshots.ts` (snapshots marcados históricos).
- `price_snapshots` con `fetched_at` para reconstruir valuaciones pasadas.

### F.2 Concepto de P&L realizado (posiciones cerradas)

Hoy `holdings_service` descarta posiciones con `qty<=0` (`continue`, línea 60), perdiendo la
ganancia realizada. Nuevo servicio `reports_service.ts`:

- Recorre **todas** las transacciones (incluidas las de posiciones ya cerradas) por activo,
  método WAC. En cada `sell` calcula `realized = proceeds_usd − cost_basis_usd_vendido`
  (con `proceeds_usd = quantity*unitPriceUsd(priceCurrency, fechaVenta)` menos fees).
- Acumula: P&L realizado por activo, P&L realizado total, y una serie temporal de P&L
  realizado acumulado (para el gráfico de trayectoria).
- Reutiliza la conversión a USD de la Fase C; para precisión temporal usar FX/precio de la
  fecha de la transacción (ver F.4).

### F.3 Balance histórico mark-to-market

- Serie mensual del **valor total del portfolio** valuado con el precio y FX **de cada mes**
  (no el actual). Requiere, por cada activo tenido en ese mes, el snapshot histórico más
  cercano a fin de mes. Extender/segir el patrón de `computeMonthlyReturn` + `price_history`.
- Si faltan snapshots históricos para algún activo/mes, degradar con nota (no inventar) y
  marcar el punto como estimado. Documentar esta limitación.
- Considerar un job/seed que backfille snapshots históricos de los activos que el usuario
  tiene (CoinGecko y Yahoo permiten histórico; FX vía Frankfurter time-series).

### F.4 FX/precio por fecha

- `fx_service` hoy cachea la tasa **actual**. Para reportes históricos precisos agregar
  `getRateToUsdAt(currency, date)` (Frankfurter soporta fecha; ARS histórico es más difícil —
  degradar a la tasa disponible más cercana con nota). Esto también mejora el costo histórico
  de la Fase C si se decide después.

### F.5 Endpoints y contrato

- `GET /reports/transactions` — ledger completo (todas las transacciones no borradas del
  usuario, incluidas las de posiciones cerradas), con enriquecimiento USD.
- `GET /reports/summary` — `{ realizedByAsset[], realizedTotal, historicalBalance[], ... }`.
- Tipos nuevos en `packages/shared` (`ReportSummary`, `RealizedPnl`, etc.).

### F.6 Frontend

- **Web**: nueva ruta `/reports` + ítem de nav "Reportes". Página con: tarjetas de P&L
  realizado total, tabla/ledger de transacciones históricas, gráfico de balance histórico
  (Recharts, reusar estilo del `BarChart`/`LineChart` del dashboard), y P&L realizado por
  activo (incluidos los que ya no tenés).
- **Mobile**: tab o screen "Reportes" equivalente (listas + barras nativas como el dashboard).

### F.7 Tests

- API: specs de `reports_service` (realizado en cierre parcial y total, múltiples compras/ventas,
  divisas). Casos borde: vender más de lo que tenés, posición reabierta.
- Web/Mobile: smoke de que la página carga y grafica.

---

## Fase G — Deploy a desarrollo y TestFlight

### G.1 Merge a `develop`

- Cada fase entra por su PR a `develop` (squash, CI verde). Declarar en el PR de C, D, E y F
  que tocan `packages/shared` (impacto web+mobile+api). Si C o F agregan un ADR, incluirlo.

### G.2 API → ambiente de desarrollo (Railway o Fly)

Según `docs/DEPLOY_BACKEND.md` (deploy corre desde `develop` hoy):

- Push a `develop` dispara el redeploy del servicio de API.
- **Correr migraciones** (Fases C y F agregan columnas/uso de snapshots):
  - Railway: Pre-Deploy Command `node --import=ts-node-maintained/register/esm ace.js migration:run --force`.
  - Fly: el `release_command` de `fly.toml` ya corre migraciones en cada deploy.
- **Re-seedear** el catálogo ampliado (Fase D):
  `node --import=ts-node-maintained/register/esm ace.js db:seed`.
- Verificar `GET /health` y un `GET /assets/search?q=bit` contra la URL pública.

### G.3 Web → Vercel (preview de desa)

Según `docs/DEPLOY_WEB.md`: el deploy de `develop` genera el preview de Vercel apuntando a
`VITE_API_URL` de la API de desa. Verificar que `CORS_ORIGINS` de la API incluya ese origen.

### G.4 Mobile → TestFlight (EAS)

Según `apps/mobile/EAS_SETUP.md`, pendientes que hay que completar (requieren credenciales):

1. `eas init` en `apps/mobile` (setea `extra.eas.projectId`, hoy `REPLACE_ME`).
2. Poner la **URL HTTPS** de la API de desa en `eas.json` (`preview` y/o `production` →
   `EXPO_PUBLIC_API_URL`). Sin HTTPS la app no conecta en device (ATS).
3. Registrar la app en App Store Connect (Bundle ID `com.grootfolio.app`) + App Store Connect
   API Key (`.p8`) en `eas.json → submit.production.ios` (no commitear el `.p8`).
4. Build + submit:
   ```bash
   cd apps/mobile
   eas build -p ios --profile production
   eas submit -p ios --profile production
   ```
5. En App Store Connect → TestFlight: grupo de testers internos (Ivan + Franco), notas de
   build, invitaciones. Instalar desde TestFlight (OTA).

> Para iteración rápida de testeo interno se puede usar el perfil `preview` (internal
> distribution) contra la API de desa, y reservar `production` para el TestFlight formal.

### G.5 Regresión final

- Correr el checklist de `docs/TESTING_MANUAL.md` apuntando a las URLs públicas.
- Smoke específico de estas mejoras: autocomplete, alta de divisa (pnl coherente, sin −99.9%),
  editar/eliminar activo, toast+redirect, y que la sección Reportes muestre P&L realizado de un
  activo comprado y luego vendido.

---

## 2. Riesgos y decisiones abiertas

- **FX de la fecha de compra (Fase C)**: el MVP usa FX actual para el costo. Si el histórico
  de la Fase F exige precisión temporal, conviene unificar y usar `getRateToUsdAt` también
  para el costo. Definir si se retrofitea o se deja documentado.
- **ARS histórico**: Frankfurter no cubre ARS; el CCL/oficial histórico es más difícil.
  Degradar con nota en los reportes.
- **`asset.currency` para divisas**: mantener la convención "se valúa en USD" (`currency='USD'`)
  y manejar la moneda pagada por `priceCurrency`. No derivar `currency` del symbol.
- **Backfill de snapshots históricos**: la Fase F puede requerir un job de backfill;
  dimensionar aparte si el histórico sale pobre.
- **Toasts sin librería nueva**: preferir un provider propio liviano; si se justifica una
  lib, documentarlo (regla de CLAUDE.md: no meter deps sin justificar).

## 3. Resumen de archivos por fase (mapa rápido para Claude Code)

- **A**: `apps/web/src/features/dashboard/DashboardPage.tsx`.
- **B**: `apps/mobile/src/screens/SettingsScreen.tsx` (+ Maestro).
- **C**: `packages/shared/src/{schemas,types,utils}/index.ts`; `apps/api/database/migrations/0003_*`;
  `apps/api/app/models/transaction.ts`; `apps/api/app/validators/transaction.ts`;
  `apps/api/app/controllers/transactions_controller.ts`;
  `apps/api/app/services/portfolio/{holdings_service,portfolio_service}.ts`;
  `apps/web/src/features/assets/AddAssetPage.tsx`; `apps/mobile/src/screens/AddAssetScreen.tsx`;
  tests en `apps/api/tests/unit`. (posible ADR nuevo)
- **D**: `apps/api/app/controllers/assets_controller.ts` (nuevo); `apps/api/start/routes.ts`;
  `apps/api/database/seeders/asset_catalog_seeder.ts`; providers en `apps/api/app/services/prices/*`;
  `packages/shared/src/api/index.ts`; `components/ui/AssetAutocomplete` (web/mobile);
  `apps/{web,mobile}/src/lib/queries.ts`.
- **E**: `apps/api/app/controllers/transactions_controller.ts` (+`update`); `apps/api/start/routes.ts`;
  `packages/shared/src/schemas/index.ts`; `apps/web/src/app/App.tsx`;
  `apps/web/src/components/ui/AppLayout.tsx`; `apps/web/src/features/assets/AssetsPage.tsx` (nuevo);
  `apps/web/src/features/dashboard/DashboardPage.tsx` (botón); `ToastProvider` (nuevo);
  `apps/mobile/src/navigation/{TabNavigator,RootNavigator}.tsx`;
  `apps/mobile/src/screens/AssetsScreen.tsx` (nuevo).
- **F**: `apps/api/app/services/portfolio/reports_service.ts` (nuevo);
  `apps/api/app/services/prices/{price_history,fx/fx_service}.ts`;
  `apps/api/app/controllers/reports_controller.ts` (nuevo); `apps/api/start/routes.ts`;
  `packages/shared/src/types/index.ts`; `apps/web/src/features/reports/*` (nuevo);
  `apps/mobile/src/screens/ReportsScreen.tsx` (nuevo).
- **G**: `apps/mobile/eas.json`, `apps/mobile/app.json`; deploy Railway/Fly + Vercel; docs.
