# Plan de Testing Manual — GrootFolio (estado al 2026-06-19)

Documento de QA para testear **todo lo construido hasta hoy** antes de seguir
con nuevas features. Apunta a un testing manual reproducible: setup del entorno,
casos concretos con comandos, y resultados esperados para ir tildando.

> **Lectura de 10 segundos:** lo único integrado de punta a punta hoy es el
> **backend (API AdonisJS)**. La **web** y la **mobile** son cascarones de UI
> con **datos mockeados**: NO llaman a la API. Por eso el grueso de este plan
> es testing de API (con `curl`/Postman), más checklists de UI/validación para
> web y mobile.

---

## 1. Estado de integración (qué se puede testear de verdad)

| Capa | Estado | Qué se testea hoy |
|---|---|---|
| **API backend** | ✅ Funcional end-to-end | Auth, transacciones, holdings, portfolio, precios (crypto/stock/FX). Testing real con requests HTTP. |
| **Web (React+Vite)** | 🟡 Solo UI con mocks | Navegación, validación de forms (Zod), theming. **No conecta a la API.** |
| **Mobile (Expo)** | 🟡 Solo UI con mocks | Navegación por tabs, validación de forms, theming. **No conecta a la API.** Settings es placeholder. |

**Implicancia:** un "login" en web/mobile acepta cualquier email válido + 8
caracteres sin tocar el backend. El dashboard muestra siempre los mismos números
ficticios. Eso es esperado en esta etapa (integración front+back es GF-222→227).

---

## 2. Backlog de features cubiertas por este plan

| Story | Feature | Capa | Estado |
|---|---|---|---|
| GF-206/207/208/209 | Auth: register / login / refresh rotatorio / logout / me | API | ✅ |
| GF-211/212 | Modelos Asset/Transaction + CRUD de transacciones + seeder | API | ✅ |
| GF-213 | Holdings agregados (WAC) + `GET /holdings` | API | ✅ |
| GF-214 | `GET /portfolio` con precios en vivo y agregados | API | ✅ |
| GF-215 | Handler global de errores + mensajes en español | API | ✅ |
| GF-217 | Precios crypto (CoinGecko) + cache in-memory | API | ✅ |
| GF-220 | Cache persistente en `price_snapshots` | API | ✅ |
| GF-218 | Precios de acciones (Yahoo) + routing por tipo | API | ✅ |
| GF-219 | FX divisas (Frankfurter/dolarapi/BCRA) + conversión a USD | API | ✅ |
| Fase visual | Pantallas web/mobile con datos mock | Web/Mobile | 🟡 mock |

---

## 3. Setup del entorno de testing

### 3.1 Requisitos
- Node `>= 20.19.4` (el repo pinnea `20.19.4` en `.nvmrc`).
- pnpm `>= 9.12.0` (`corepack enable && corepack prepare pnpm@9.12.0 --activate`).
- Docker (para Postgres local).
- Conexión a internet (las APIs de precios son externas).

### 3.2 Levantar API + base de datos
Desde la raíz del repo (`grootfolio-app/`):

```bash
# 1. Dependencias (SOLO pnpm; nunca npm/yarn)
pnpm install

# 2. Postgres 16 en Docker (host 5433 -> container 5432)
docker compose up -d db
#   o el bootstrap completo: ./scripts/bootstrap.sh

# 3. Migraciones + datos de prueba
pnpm --filter @grootfolio/api migrate
pnpm --filter @grootfolio/api seed

# 4. Levantar la API (watch) -> http://localhost:3333
pnpm dev:api
```

> Si `apps/api/.env` no existe, copialo de `.env.example` y generá la `APP_KEY`
> con `pnpm --filter @grootfolio/api ace generate:key`. El `.env.example` ya
> trae los defaults de DB (5433), JWT y precios.

### 3.3 (Opcional) Levantar web y mobile
```bash
pnpm dev:web      # http://localhost:5173
pnpm dev:mobile   # Expo Metro (8081) + QR para Expo Go
```

### 3.4 Datos sembrados por el seeder
- **Usuario dev:** `dev@grootfolio.test` / `DevPass123!`
- **Catálogo de activos** (`asset_catalog`):

| Symbol | Tipo | Moneda nativa | Provider | Sirve para testear |
|---|---|---|---|---|
| BTC | crypto | USD | coingecko | precio crypto |
| ETH | crypto | USD | coingecko | precio crypto |
| AAPL | stock | USD | yahoo | acción USD directa |
| GGAL.BA | stock | **ARS** | yahoo | **conversión FX ARS→USD** |
| US-T | bond | USD | manual | activo **unsupported** (sin precio) |
| EUR | currency | — | frankfurter | **holding de divisa** (precio = FX) |

> Cargar una transacción con un `symbol`+`type` nuevo crea el asset al vuelo
> (`firstOrCreate`), pero solo los symbols conocidos por cada provider devuelven
> precio (ej. crypto del mapa CoinGecko, stocks del whitelist Yahoo).

---

## 4. Testing del Backend API (núcleo)

Base URL: `http://localhost:3333`. **No hay prefijo `/api/v1`** — las rutas son
directas. Rutas de auth bajo `/auth/*`; el resto (`/me`, `/transactions`,
`/holdings`, `/portfolio`) son top-level y requieren `Authorization: Bearer`.

### 4.0 Preparación: obtener un access token
```bash
BASE=http://localhost:3333

# Login con el usuario dev sembrado
ACCESS=$(curl -s -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@grootfolio.test","password":"DevPass123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
echo "TOKEN=$ACCESS"

AUTH="Authorization: Bearer $ACCESS"
```

### 4.1 Health y raíz

| ID | Caso | Comando | Esperado |
|---|---|---|---|
| H1 | Health check | `curl -s $BASE/health` | `200` `{"status":"ok","uptime":<n>}` |
| H2 | Raíz/metadata | `curl -s $BASE/` | `200` `{"name":"GrootFolio API","version":"0.1.0"}` |

### 4.2 Auth (GF-206→209)

Formato de respuesta de auth (register/login):
```json
{ "user": { "id","email","fullName","riskProfile","riskScore","createdAt" },
  "accessToken": "eyJ...", "refreshToken": "..." }
```

| ID | Caso | Cómo | Esperado |
|---|---|---|---|
| A1 | Registro OK | `POST /auth/register` con email nuevo, `password>=8` | `201` + `user` + par de tokens |
| A2 | Email duplicado | A1 dos veces con el mismo email | `409` `code: AUTH_EMAIL_TAKEN` |
| A3 | Password corto | `POST /auth/register` `password:"123"` | `422` `code: VALIDATION_ERROR` |
| A4 | Email inválido | `register` con `email:"noesmail"` | `422` `VALIDATION_ERROR` |
| A5 | Login OK | `POST /auth/login` dev/DevPass123! | `200` + tokens |
| A6 | Login mal | password incorrecto | `401` `AUTH_INVALID_CREDENTIALS` (genérico, no revela si el email existe) |
| A7 | `GET /me` con token | `curl -H "$AUTH" $BASE/me` | `200` `{ user: {...} }` |
| A8 | `GET /me` sin token | `curl $BASE/me` | `401` `AUTH_NO_TOKEN` |
| A9 | `GET /me` token roto | `Authorization: Bearer xxx` | `401` `AUTH_INVALID_TOKEN` |

**Refresh rotatorio (lo más interesante de auth):**

```bash
# Tomá un refreshToken del login
REFRESH=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"dev@grootfolio.test","password":"DevPass123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['refreshToken'])")
```

| ID | Caso | Cómo | Esperado |
|---|---|---|---|
| A10 | Refresh OK | `POST /auth/refresh` `{"refreshToken":"$REFRESH"}` | `200` + **nuevo** par de tokens |
| A11 | **Reuso de token** | Volvé a usar el `$REFRESH` viejo (ya rotado en A10) | `401` `AUTH_INVALID_REFRESH` + **revoca toda la familia de sesiones** del usuario |
| A12 | Refresh inválido | `{"refreshToken":"basura"}` | `401` `AUTH_INVALID_REFRESH` |
| A13 | Logout | `POST /auth/logout` `{"refreshToken":"<vigente>"}` | `204` (idempotente: repetir → `204`) |
| A14 | Refresh post-logout | refresh con un token ya deslogueado | `401` `AUTH_INVALID_REFRESH` |

> A11 es el caso de seguridad clave: detectar **robo de token**. Tras detectar
> reuso, todos los refresh tokens del usuario quedan revocados; hay que volver a
> loguear.

### 4.3 Transactions (GF-212)

```bash
# Crear una compra de BTC
curl -s -X POST $BASE/transactions -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "symbol":"BTC","type":"crypto","kind":"buy",
  "quantity":0.5,"unitPrice":40000,"fee":100,
  "purchasedAt":"2026-01-15T10:00:00.000Z","notes":"primera compra"
}'
```

Body de `POST /transactions`:

| Campo | Regla | Req. |
|---|---|---|
| `symbol` | string 1–20 | ✓ |
| `type` | `crypto`\|`stock`\|`bond`\|`currency` | ✓ |
| `quantity` | número `> 0` | ✓ |
| `unitPrice` | número `>= 0` | ✓ |
| `kind` | `buy`\|`sell` (default `buy`) | ✗ |
| `fee` | número `>= 0` (default 0) | ✗ |
| `purchasedAt` | fecha ISO 8601 | ✓ |
| `notes` | string ≤ 500 | ✗ |

| ID | Caso | Esperado |
|---|---|---|
| T1 | Crear compra (BTC) | `201` `{ transaction: {...,asset:{...}} }` |
| T2 | Crear con symbol+type nuevos | `201` + asset creado al vuelo en el catálogo |
| T3 | `quantity:0` o negativa | `422` `VALIDATION_ERROR` |
| T4 | `unitPrice` negativo | `422` `VALIDATION_ERROR` |
| T5 | `type` inválido (`"foo"`) | `422` `VALIDATION_ERROR` |
| T6 | `purchasedAt` no-ISO (`"15/01/2026"`) | `422` (`VALIDATION_ERROR` o `TX_INVALID_DATE`) |
| T7 | `GET /transactions` | `200` lista del usuario, orden `purchasedAt` DESC, con `asset` embebido |
| T8 | `DELETE /transactions/:id` propia | `204` (soft-delete) |
| T9 | DELETE de id inexistente/UUID inválido | `404` `TX_NOT_FOUND` |
| T10 | DELETE dos veces el mismo id | 1ª `204`, 2ª `404` (ya borrada) |
| T11 | DELETE sin token | `401` |
| T12 | Aislamiento por usuario | Con token de otro usuario, no ve ni borra transacciones ajenas (`404`) |

### 4.4 Holdings — costo promedio ponderado / WAC (GF-213)

`GET /holdings` agrega las transacciones por activo con **WAC**. En este endpoint
`currentPrice/value/pnl = 0` (los precios en vivo se ven en `/portfolio`).

**Reglas WAC a verificar:**
- **BUY**: suma cantidad y costo, **fee incluido en el costo base**.
  `avgPrice = (Σ qty·precio + fee) / Σ qty`.
- **SELL**: baja cantidad y costo proporcional; **no cambia** el `avgPrice` del
  remanente; el fee de venta **no** afecta el promedio.
- **Cierre** (qty ≤ 0): resetea posición; el próximo BUY arranca un promedio nuevo.

| ID | Escenario (cargar estas transacciones y mirar `GET /holdings`) | Esperado |
|---|---|---|
| W1 | BUY 1 BTC @40000 fee100 | `qty=1`, `avgPrice=40100` |
| W2 | + BUY 0.5 BTC @45000 fee50 | `qty=1.5`, `avgPrice≈41766.67` |
| W3 | + SELL 0.5 BTC | `qty=1`, `avgPrice≈41766.67` (no cambia) |
| W4 | + SELL 1 BTC | posición cerrada (`qty=0`) — no aparece o aparece en 0 |
| W5 | + BUY 2 BTC @50000 fee0 | `qty=2`, `avgPrice=50000` (promedio nuevo) |
| W6 | Varios activos | holdings ordenados alfabéticamente por symbol |

> Tip: empezá con una base limpia (usuario nuevo vía `register`) para que los
> números den exactos sin transacciones previas.

### 4.5 Portfolio + precios en vivo (GF-214/217/218/219/220)

`GET /portfolio` toma los holdings, los enriquece con precio actual y arma
agregados. Shape:
```json
{ "portfolio": {
  "totalValue", "pnlAbsolute", "pnlPercent",
  "bestAsset": {…}|null,
  "distribution": [ {"type","value"} ],
  "monthlyReturn": [],
  "holdings": [ {"assetId","asset","quantity","avgPrice","currentPrice","value","pnl","pnlPercent"} ]
} }
```
Cálculos por holding: `invested = avgPrice·qty`, `value = currentPrice·qty`,
`pnl = value − invested`, `pnlPercent = pnl/invested·100`.

| ID | Caso (cargá una compra del symbol y mirá `/portfolio`) | Esperado |
|---|---|---|
| P1 | Usuario sin transacciones | `200` summary vacío coherente (`totalValue:0`, `bestAsset:null`, `holdings:[]`) |
| P2 | **BTC** (crypto) | `currentPrice > 0` (CoinGecko); `value/pnl` calculados |
| P3 | **AAPL** (stock USD) | `currentPrice > 0` (Yahoo, USD directo) |
| P4 | **GGAL.BA** (stock ARS) | `currentPrice > 0` y en rango de **USD** (ej. ~3–6), **no** miles → confirma conversión FX ARS→USD |
| P5 | **EUR** (currency) | `currentPrice ≈ 1.05–1.20` (valor de 1 EUR en USD, vía Frankfurter) |
| P6 | **US-T** (bond) | `currentPrice = 0` (unsupported) y **no** suma a `totalValue`/`pnl` |
| P7 | `distribution` | agrupa `value` por tipo; tipos sin valor positivo se omiten |
| P8 | `bestAsset` | el holding con mayor `pnlPercent` entre los priceados; `null` si ninguno tiene precio |
| P9 | `monthlyReturn` | `[]` por ahora (requiere precios históricos — fuera de alcance) |
| P10 | Cache | 2 llamadas seguidas: la 2ª responde más rápido (cache in-memory, TTL 60s) |

> **Nota:** `/portfolio` no expone el `source` del precio (cache/db/coingecko/
> yahoo/fx). Para inspeccionar la fuente exacta está el camino interno
> `getPrices()` (ver §6). En el endpoint, la verificación práctica de la
> conversión FX es que GGAL.BA dé un `currentPrice` en magnitud de dólares.

### 4.6 FX / divisas (GF-219) — verificación directa de fuentes

La conversión usa fuentes externas según `FX_ARS_SOURCE` en `apps/api/.env`:
- `ccl` (default) → **dolarapi** `/contadoconliqui`
- `oficial` → **BCRA** `estadisticascambiarias`
- principales (EUR, GBP, BRL…) → **Frankfurter**

| ID | Caso | Cómo | Esperado |
|---|---|---|---|
| F1 | CCL por default | `/portfolio` con GGAL.BA, `FX_ARS_SOURCE=ccl` | precio convertido a USD con dólar CCL |
| F2 | Oficial (BCRA) | poné `FX_ARS_SOURCE=oficial`, reiniciá la API, repetí | el USD de GGAL.BA cambia (BCRA < CCL ⇒ **mayor** valor en USD) |
| F3 | EUR vía Frankfurter | `/portfolio` con EUR | `currentPrice` ≈ paridad EUR/USD del día |
| F4 | Sin internet / API caída | cortá la red y repetí | usa tasa cacheada (stale) si existe; si no, el activo cae a `unsupported` sin romper el portfolio |

> Smoke en vivo de referencia (2026-06-19): CCL 1 USD≈1508 ARS, BCRA≈1451,
> 1 EUR≈1.146 USD; GGAL.BA ARS→USD da `source:yahoo` (convertido), EUR `source:fx`.

### 4.7 Manejo de errores (GF-215)

Todos los errores siguen el formato uniforme:
```json
{ "code":"...", "message":"<en español>", "details": { "errors": {…} } }
```

| ID | Caso | Esperado |
|---|---|---|
| E1 | Validación fallida | `422` `VALIDATION_ERROR` con `details.errors` por campo, mensajes en español |
| E2 | Ruta inexistente | `404` con formato uniforme |
| E3 | Token ausente en ruta protegida | `401` `AUTH_NO_TOKEN` |
| E4 | Body JSON malformado | `400/422` con `code` y `message` |

Códigos de referencia: `AUTH_EMAIL_TAKEN` (409), `AUTH_INVALID_CREDENTIALS`,
`AUTH_INVALID_REFRESH`, `AUTH_NO_TOKEN`, `AUTH_INVALID_TOKEN`,
`AUTH_USER_NOT_FOUND` (401), `TX_NOT_FOUND` (404), `TX_INVALID_DATE` /
`VALIDATION_ERROR` (422), `INTERNAL_ERROR` (5xx).

---

## 5. Testing Web (UI / mock) — `http://localhost:5173`

**Recordá:** todo es mock; no hay red. Se testea UI, validación y navegación.

| ID | Pantalla | Caso | Esperado |
|---|---|---|---|
| WB1 | Login | email inválido o password < 8 | muestra errores Zod, no avanza |
| WB2 | Login | email válido + password ≥ 8 (cualquiera) | entra al dashboard (mock, no valida credenciales reales) |
| WB3 | Rutas protegidas | abrir `/dashboard` sin "loguear" | redirige a `/login` |
| WB4 | Dashboard | ver 3 stat cards + pie de distribución + barras mensuales + tabla de 5 activos | datos fijos (mock) |
| WB5 | Cargar activo | tipo (Crypto/Acción/Bono/Divisa) + Buy/Sell + form | validación Zod por campo |
| WB6 | Cargar activo | guardar con datos válidos | mensaje "guardado correctamente (mock)" + reset (no persiste) |
| WB7 | Test de perfil | responder las 4 preguntas → Finalizar | navega al resultado |
| WB8 | Resultado | ver perfil/asignación/recomendaciones | siempre "Conservador" (no calcula con tus respuestas) |
| WB9 | Settings | cambiar tema claro/oscuro | **persiste** al refrescar (localStorage) |
| WB10 | Settings | cambiar moneda base | solo UI, no persiste |
| WB11 | Settings | cerrar sesión | vuelve a `/login` |
| WB12 | General | refrescar la página | se pierde la "sesión" y datos (no hay persistencia salvo tema) |

---

## 6. Testing Mobile (UI / mock) — Expo Go

**Recordá:** 100% mock, sin backend. Settings es placeholder ("Próximamente").

| ID | Pantalla | Caso | Esperado |
|---|---|---|---|
| MB1 | Login | validación email/password (Zod) | errores por campo |
| MB2 | Login | credenciales válidas (cualquiera) | entra a las tabs (mock) |
| MB3 | Tabs | navegar Dashboard / Cargar / Test / Settings | navegación fluida |
| MB4 | Dashboard | stat cards + distribución + barras + tabla | datos fijos (mock) |
| MB5 | Cargar activo | form + tipo + Compra/Venta | validación; submit muestra Alert "Éxito" (no guarda) |
| MB6 | Test de perfil | 4 preguntas con progreso → Finalizar | navega a resultado (siempre "Conservador") |
| MB7 | Settings | abrir | placeholder "Próximamente" |
| MB8 | Tema | toggle claro/oscuro desde header | cambia (sin persistencia) |
| MB9 | Logout | desde el header | vuelve a Login |

---

## 7. (Avanzado) Inspeccionar la fuente de precios

`/portfolio` no expone el `source`. Para verificar el ruteo de providers y la
conversión (cache / db / coingecko / yahoo / fx / unsupported), se puede correr
un script puntual contra `getPrices()` o consultar la tabla `price_snapshots`:

```bash
# Ver últimos snapshots persistidos (provider + currency normalizada a USD)
psql -h localhost -p 5433 -U grootfolio -d grootfolio_dev \
  -c "select a.symbol, p.price, p.currency, p.provider, p.fetched_at
      from price_snapshots p join asset_catalog a on a.id=p.asset_id
      order by p.fetched_at desc limit 20;"
```
Esperado: GGAL.BA persistido con `currency=USD` y `provider=yahoo` (convertido);
EUR con `provider=fx`; BTC con `provider=coingecko`.

---

## 8. Checklist rápido de regresión (smoke E2E backend)

Orden sugerido para una pasada completa de ~10 min:

1. [ ] `pnpm install`, `docker compose up -d db`, `migrate`, `seed`, `dev:api`.
2. [ ] H1 health OK.
3. [ ] A1 register usuario nuevo → A5 login → A7 `/me`.
4. [ ] A10 refresh OK → A11 reuso → 401 + revocación.
5. [ ] T1/T2 crear transacciones → T7 listar → T8 borrar.
6. [ ] W1–W5 secuencia WAC en `/holdings`.
7. [ ] P2 BTC, P3 AAPL, P4 GGAL.BA (FX), P5 EUR, P6 US-T en `/portfolio`.
8. [ ] F2 cambiar `FX_ARS_SOURCE` a `oficial` y confirmar que el USD cambia.
9. [ ] E1–E3 errores con formato uniforme.
10. [ ] §7 verificar `price_snapshots` (provider/currency).

---

## 9. Gaps conocidos y fuera de alcance (a tener presente al testear)

- **Web/Mobile no integradas:** no hay `VITE_API_URL`/`EXPO_PUBLIC_API_URL` en
  uso; `ApiClient` y TanStack Query están instalados pero **sin usar**. La
  integración real es GF-222→227.
- **Quiz/perfil de inversor:** las rutas (`/quiz`, `/quiz/submit`, `/quiz/result`)
  están **comentadas** en `start/routes.ts` — sin backend aún. El test de perfil
  en web/mobile es 100% mock.
- **Catálogo de assets endpoint:** `/assets/catalog` también comentado.
- **`monthlyReturn`** del portfolio devuelve `[]` (faltan precios históricos).
- **Bonds:** `US-T` y cualquier `type:bond` quedan `unsupported` (sin provider).
- **Precios dependen de APIs externas:** CoinGecko/Yahoo pueden rate-limitear;
  sin internet, los activos caen al fallback (snapshot/cache stale o unsupported).
- **Node 22:** `yahoo-finance2` v3 pide Node ≥22; el repo corre 20.19.4 con un
  warning por proceso (no bloquea).

---

## 10. Cómo reportar hallazgos

Por cada bug: ID del caso (ej. `P4`), request enviado, respuesta obtenida vs
esperada, y `FX_ARS_SOURCE`/entorno si aplica. Para issues de API, adjuntar el
log de la consola de `pnpm dev:api` (pino) ayuda a rastrear.
```

Convención de severidad sugerida: **bloqueante** (rompe un flujo core: auth,
crear transacción, portfolio), **mayor** (cálculo incorrecto: WAC/pnl/FX),
**menor** (mensajes, formato, UX), **cosmético** (texto, estilos).
```
