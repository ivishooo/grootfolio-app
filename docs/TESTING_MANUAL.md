# Plan de Pruebas — GrootFolio (estado al 2026-06-30)

Documento de QA para testear **todo lo construido hasta hoy**. Apunta a un
testing reproducible: setup del entorno, casos concretos con comandos/pasos, y
resultados esperados para ir tildando. Sirve además como insumo del **Capítulo
de Pruebas de la tesis (GF-240)**.

> **Lectura de 10 segundos:** la app ya está **integrada de punta a punta**.
> Web y mobile consumen la **API real** (AdonisJS) vía `ApiClient` + TanStack
> Query: auth real (JWT + refresh), datos reales de portfolio/holdings/precios,
> y quiz de perfil real. Lo único que sigue mockeado a nivel dato es el
> `monthlyReturn` histórico en escenarios sin cobertura de la API externa y el
> catálogo de assets (endpoint aún no expuesto). Este plan cubre **API + Web +
> Mobile** más los suites **E2E automatizados** (Playwright / Maestro).

---

## 1. Estado de integración (qué se puede testear de verdad)

| Capa | Estado | Qué se testea hoy |
|---|---|---|
| **API backend** | ✅ Funcional end-to-end | Auth, transacciones, holdings, portfolio, precios (crypto/stock/FX), monthlyReturn histórico, quiz de perfil. Testing real con HTTP. |
| **Web (React+Vite)** | ✅ Integrada con API | Login/registro reales, dashboard con datos reales (TanStack Query), alta de activo persistida, quiz real, loading/empty/error states, accesibilidad. |
| **Mobile (Expo)** | ✅ Integrada con API | Login real, dashboard/alta con datos reales, quiz real, navegación por tabs, theming. |

**Cambio respecto a versiones previas de este doc:** ya **no** hay pantallas
"solo mock". Un login en web/mobile valida contra el backend; el dashboard
refleja las transacciones reales del usuario; el quiz calcula el perfil según
las respuestas. Requiere la **API corriendo** (`pnpm dev:api`) con DB migrada y
seedeada.

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
| GF-218 | Precios de acciones (Yahoo) + routing por tipo | API | ✅ |
| GF-219 | FX divisas (Frankfurter/dolarapi/BCRA) + conversión a USD | API | ✅ |
| GF-220 | Cache persistente en `price_snapshots` | API | ✅ |
| GF-221 | Job de actualización periódica de precios | API | ✅ |
| GF-246 | `monthlyReturn` con precios históricos | API | ✅ |
| GF-247 (GF-2) | Backend del cuestionario de perfil de inversor | API | ✅ |
| GF-248/249 | Fixes: 500 en `/portfolio` (Yahoo) y PnL ARS/USD | API | ✅ |
| GF-223/224 | Auth real en web y mobile | Web/Mobile | ✅ |
| GF-225/226 | Datos reales con TanStack Query (web y mobile) | Web/Mobile | ✅ |
| GF-227 | Estados de loading y error en todas las pantallas | Web/Mobile | ✅ |
| GF-245 | Pantalla de registro (web) + wiring "Creala aquí" | Web | ✅ |
| GF-229 | Loading skeletons | Web/Mobile | ✅ |
| GF-230/231 | Empty states + mensajes de error amigables | Web/Mobile | ✅ |
| GF-232 | Pase de accesibilidad (web) | Web | ✅ |
| GF-233 | Tests E2E web (Playwright) | Web | ✅ |
| GF-234 | Tests E2E mobile (Maestro) | Mobile | ✅ |

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

### 3.3 Levantar web y mobile (apuntando a la API)
```bash
pnpm dev:web      # http://localhost:5173  (usa VITE_API_URL=http://localhost:3333)
pnpm dev:mobile   # Expo Metro (8081) + QR   (usa EXPO_PUBLIC_API_URL=http://localhost:3333)
```

> **Mobile en dispositivo físico:** `localhost` apunta al teléfono, no a tu Mac.
> Poné `EXPO_PUBLIC_API_URL=http://<IP-LAN-de-tu-Mac>:3333` en `apps/mobile/.env`
> y reiniciá Metro. En emulador Android usá `http://10.0.2.2:3333`.

### 3.4 Datos sembrados por el seeder
- **Usuario dev:** `dev@grootfolio.test` / `DevPass123!`
- **Catálogo de activos** (`asset_catalog`):

| Symbol | Tipo | Moneda nativa | Provider | Sirve para testear |
|---|---|---|---|---|
| BTC | crypto | USD | coingecko | precio crypto + monthlyReturn |
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
`/holdings`, `/portfolio`, `/quiz*`) son top-level y requieren
`Authorization: Bearer`.

### 4.0 Preparación: obtener un access token
```bash
BASE=http://localhost:3333

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

### 4.5 Portfolio + precios en vivo (GF-214/217/218/219/220/246)

`GET /portfolio` toma los holdings, los enriquece con precio actual y arma
agregados. Shape:
```json
{ "portfolio": {
  "totalValue", "pnlAbsolute", "pnlPercent",
  "bestAsset": {…}|null,
  "distribution": [ {"type","value"} ],
  "monthlyReturn": [ {"month","value"} ],
  "holdings": [ {"assetId","asset","quantity","avgPrice","currentPrice","value","pnl","pnlPercent"} ]
} }
```
Cálculos por holding: `invested = avgPrice·qty`, `value = currentPrice·qty`,
`pnl = value − invested`, `pnlPercent = pnl/invested·100`.

| ID | Caso (cargá una compra del symbol y mirá `/portfolio`) | Esperado |
|---|---|---|
| P1 | Usuario sin transacciones | `200` summary vacío coherente (`totalValue:0`, `bestAsset:null`, `holdings:[]`, `monthlyReturn:[]`) |
| P2 | **BTC** (crypto) | `currentPrice > 0` (CoinGecko); `value/pnl` calculados |
| P3 | **AAPL** (stock USD) | `currentPrice > 0` (Yahoo, USD directo) |
| P4 | **GGAL.BA** (stock ARS) | `currentPrice > 0` y en rango de **USD** (ej. ~3–6), **no** miles → confirma conversión FX ARS→USD |
| P5 | **EUR** (currency) | `currentPrice ≈ 1.05–1.20` (valor de 1 EUR en USD, vía Frankfurter) |
| P6 | **US-T** (bond) | `currentPrice = 0` (unsupported) y **no** suma a `totalValue`/`pnl` |
| P7 | `distribution` | agrupa `value` por tipo; tipos sin valor positivo se omiten |
| P8 | `bestAsset` | el holding con mayor `pnlPercent` entre los priceados; `null` si ninguno tiene precio |
| P9 | `monthlyReturn` (GF-246) | array con puntos mensuales reconstruidos de precios históricos (CoinGecko `market_chart` para crypto). Con BTC cargado hace meses, devuelve la curva de valor por mes; si la API histórica no cubre el activo, ese aporte queda en 0 sin romper |
| P10 | Cache | 2 llamadas seguidas: la 2ª responde más rápido (cache in-memory, TTL 60s) |

> **Nota:** `/portfolio` no expone el `source` del precio (cache/db/coingecko/
> yahoo/fx). Para inspeccionar la fuente exacta está el camino interno
> `getPrices()` (ver §8) o la tabla `price_snapshots`.

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

### 4.7 Quiz de perfil de inversor (GF-247 / GF-2)

Rutas protegidas (requieren `Authorization: Bearer`):
`GET /quiz` (preguntas), `POST /quiz/submit` (califica + persiste),
`GET /quiz/result` (último perfil o `null`).

**Umbrales de clasificación** (suma de `score` de las opciones elegidas):
`conservative <= 8`, `moderate 9–13`, `aggressive >= 14`.

```bash
# 1. Traer preguntas (cada opción trae su score)
curl -s -H "$AUTH" $BASE/quiz | python3 -m json.tool

# 2. Enviar respuestas (una optionId por questionId)
curl -s -X POST $BASE/quiz/submit -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"answers":[{"questionId":"...","optionId":"..."}, ...]}'
```

| ID | Caso | Esperado |
|---|---|---|
| Q1 | `GET /quiz` | `200` `{ questions:[{id,order,text,options:[{id,label,score}]}] }` |
| Q2 | Submit completo (todas las preguntas) | `200` + perfil calculado (`riskProfile` + `riskScore`) y contenido del perfil |
| Q3 | Submit con score ≤ 8 | perfil `conservative` |
| Q4 | Submit con score 9–13 | perfil `moderate` |
| Q5 | Submit con score ≥ 14 | perfil `aggressive` |
| Q6 | Submit incompleto (faltan preguntas) | `422` `QUIZ_INCOMPLETE` |
| Q7 | Submit con `optionId` inexistente | `422` `QUIZ_INVALID_ANSWER` |
| Q8 | `GET /quiz/result` tras un submit | `200` con el último perfil del usuario |
| Q9 | `GET /quiz/result` usuario sin intentos | `200` con `result: null` (o equivalente) |
| Q10 | Persistencia en `user` | tras submit, `GET /me` refleja `riskProfile`/`riskScore` actualizados |
| Q11 | Sin token | `401` en cualquiera de las 3 rutas |

### 4.8 Manejo de errores (GF-215)

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
`VALIDATION_ERROR` (422), `QUIZ_INCOMPLETE` / `QUIZ_INVALID_ANSWER` (422),
`INTERNAL_ERROR` (5xx).

### 4.9 Job de actualización de precios (GF-221)

El scheduler refresca `price_snapshots` periódicamente en background.

| ID | Caso | Esperado |
|---|---|---|
| J1 | Con la API levantada un rato | aparecen/actualizan filas en `price_snapshots` sin pegarle a `/portfolio` (ver §8) |
| J2 | `fetched_at` avanza | en corridas sucesivas, el `fetched_at` de los symbols soportados se actualiza |

---

## 5. Testing Web integrada — `http://localhost:5173`

**Requiere API corriendo.** Todo pega contra `VITE_API_URL`. Rutas:
`/login`, `/register`, `/dashboard`, `/assets/new`, `/profile-test`,
`/profile-test/result`, `/settings`.

| ID | Pantalla | Caso | Esperado |
|---|---|---|---|
| WB1 | Login | email inválido o password < 8 | errores Zod, no llama a la API |
| WB2 | Login | credenciales **incorrectas** válidas de forma | muestra error amigable (401 mapeado), no entra |
| WB3 | Login | `dev@grootfolio.test` / `DevPass123!` | entra al dashboard con datos reales |
| WB4 | Registro (GF-245) | link "Creala aquí" desde Login | navega a `/register` |
| WB5 | Registro | alta con email nuevo + password ≥ 8 | crea usuario (201), queda logueado, va al dashboard |
| WB6 | Registro | email ya existente | error amigable (`AUTH_EMAIL_TAKEN`) |
| WB7 | ProtectedRoute | abrir `/dashboard` sin sesión | redirige a `/login` |
| WB8 | Dashboard | usuario **sin transacciones** | **empty state** (no cards con basura), sin crashear |
| WB9 | Dashboard | usuario con transacciones | 3 stat cards + distribución + monthlyReturn + tabla, **con datos reales** de `/portfolio` |
| WB10 | Dashboard | **loading** | se ven **skeletons** (GF-229) mientras carga la query |
| WB11 | Dashboard | API caída (bajá `dev:api`) | **error state** amigable (GF-231), no pantalla en blanco |
| WB12 | Alta de activo | form con tipo (Crypto/Acción/Bono/Divisa) + Buy/Sell | validación Zod por campo |
| WB13 | Alta de activo | guardar BTC válido | **persiste** (POST real); el dashboard lo refleja al volver (invalidación de query) |
| WB14 | Test de perfil | responder las preguntas → Finalizar | envía a `/quiz/submit`, navega a resultado |
| WB15 | Resultado | ver perfil/asignación/recomendaciones | refleja el perfil **calculado con tus respuestas** (no fijo) |
| WB16 | Resultado | reabrir `/profile-test` | muestra el perfil actual ya calculado (GF-2 fix) |
| WB17 | Settings | cambiar tema claro/oscuro | persiste al refrescar (localStorage) |
| WB18 | Settings | cerrar sesión | limpia sesión y vuelve a `/login` |
| WB19 | Sesión | refrescar con sesión activa | sigue logueado (refresh token) |

### 5.1 Accesibilidad web (GF-232)

| ID | Caso | Esperado |
|---|---|---|
| AX1 | Navegación por teclado | se puede recorrer login/forms/menú con Tab; foco visible |
| AX2 | Labels de formularios | inputs con `label`/`aria-label` asociados |
| AX3 | Roles y landmarks | nav/main con roles correctos; botones son `<button>` |
| AX4 | Contraste | texto sobre fondo cumple AA (paleta naranja `#F97316` sobre neutrales) |
| AX5 | Estados anunciados | errores de form y loading comunicados a lectores de pantalla |

> Pasada rápida: correr Lighthouse (pestaña Accessibility) o axe DevTools sobre
> `/login`, `/dashboard` y `/assets/new`; anotar findings < 100.

---

## 6. Testing Mobile integrada — Expo Go

**Requiere API corriendo** y `EXPO_PUBLIC_API_URL` alcanzable desde el
dispositivo (ver §3.3).

| ID | Pantalla | Caso | Esperado |
|---|---|---|---|
| MB1 | Login | validación email/password (Zod) | errores por campo |
| MB2 | Login | credenciales incorrectas | error amigable, no entra |
| MB3 | Login | dev/DevPass123! | entra a las tabs con datos reales |
| MB4 | Tabs | navegar Dashboard / Cargar / Test / Settings | navegación fluida |
| MB5 | Dashboard | sin transacciones | empty state |
| MB6 | Dashboard | con transacciones | stat cards + distribución + monthlyReturn + tabla reales |
| MB7 | Dashboard | loading | skeletons (GF-229) |
| MB8 | Dashboard | API caída | error state amigable |
| MB9 | Cargar activo | form + tipo + Compra/Venta | validación; submit real persiste y refleja en dashboard |
| MB10 | Test de perfil | responder preguntas → Finalizar | envía a `/quiz/submit`, navega a resultado con perfil calculado |
| MB11 | Resultado | reabrir el test | muestra el perfil actual (GF-2 fix) |
| MB12 | Tema | toggle claro/oscuro | cambia el theming |
| MB13 | Logout | desde el header | vuelve a Login, limpia sesión |

---

## 7. Suites E2E automatizados

### 7.1 Web — Playwright (GF-233)
Specs en `apps/web/e2e/`. **Precondición:** API corriendo + DB seedeada
(usuario dev). Playwright levanta el dev server de Vite solo.

```bash
pnpm dev:api                          # terminal 1 (+ docker db)
pnpm --filter @grootfolio/web e2e     # terminal 2  (playwright test)
```

Cubre: `login.spec.ts` (login dev → dashboard; credenciales inválidas →
error), `add-asset.spec.ts` (alta de transacción → confirmación),
`quiz.spec.ts` (completar quiz → resultado). **4 tests / 3 specs.**

> **Nota CI:** estos specs se excluyen de Vitest (`vite.config.ts` →
> `exclude: [...configDefaults.exclude, 'e2e/**']`). No confundir `pnpm test`
> (Vitest, unit) con `pnpm e2e` (Playwright). Ver GF-250 / PR #83.

### 7.2 Mobile — Maestro (GF-234)
Flow en `apps/mobile/.maestro/login.yaml` (login → dashboard). Requiere Maestro
instalado y la app corriendo en emulador/dispositivo. Ver
`apps/mobile/.maestro/README.md` para el runner.

---

## 8. (Avanzado) Inspeccionar la fuente de precios

`/portfolio` no expone el `source`. Para verificar el ruteo de providers y la
conversión (cache / db / coingecko / yahoo / fx / unsupported), consultá la
tabla `price_snapshots`:

```bash
psql -h localhost -p 5433 -U grootfolio -d grootfolio_dev \
  -c "select a.symbol, p.price, p.currency, p.provider, p.fetched_at
      from price_snapshots p join asset_catalog a on a.id=p.asset_id
      order by p.fetched_at desc limit 20;"
```
Esperado: GGAL.BA persistido con `currency=USD` y `provider=yahoo` (convertido);
EUR con `provider=fx`; BTC con `provider=coingecko`.

---

## 9. Checklist de regresión (smoke E2E completo)

Orden sugerido para una pasada de ~15 min:

1. [ ] `pnpm install`, `docker compose up -d db`, `migrate`, `seed`, `dev:api`.
2. [ ] H1 health OK.
3. [ ] A1 register → A5 login → A7 `/me`.
4. [ ] A10 refresh OK → A11 reuso → 401 + revocación.
5. [ ] T1/T2 crear transacciones → T7 listar → T8 borrar.
6. [ ] W1–W5 secuencia WAC en `/holdings`.
7. [ ] P2 BTC, P3 AAPL, P4 GGAL.BA (FX), P5 EUR, P6 US-T, P9 monthlyReturn en `/portfolio`.
8. [ ] F2 cambiar `FX_ARS_SOURCE` a `oficial` y confirmar que el USD cambia.
9. [ ] Q1→Q2→Q8 quiz: preguntas, submit, result; Q10 refleja en `/me`.
10. [ ] E1–E3 errores con formato uniforme.
11. [ ] **Web**: WB3 login → WB9 dashboard real → WB13 alta persiste → WB14/15 quiz.
12. [ ] **Web**: WB8/WB10/WB11 empty/loading/error states.
13. [ ] **Mobile**: MB3 login → MB6 dashboard → MB9 alta → MB10 quiz.
14. [ ] E2E automatizados: `pnpm --filter @grootfolio/web e2e` verde; Maestro login OK.
15. [ ] §8 verificar `price_snapshots` (provider/currency).

---

## 10. Gaps conocidos y fuera de alcance (a tener presente al testear)

- **Catálogo de assets endpoint:** `/assets/catalog` sigue **comentado** en
  `start/routes.ts` (sin controller). El alta usa el catálogo sembrado + creación
  al vuelo.
- **`monthlyReturn` histórico:** se reconstruye de CoinGecko `market_chart`
  (crypto). Para stocks/FX la cobertura histórica es parcial; los activos sin
  histórico aportan 0 a la curva (no rompen). Sujeto a rate limit de CoinGecko.
- **Bonds:** `US-T` y cualquier `type:bond` quedan `unsupported` (sin provider).
- **Precios dependen de APIs externas:** CoinGecko/Yahoo pueden rate-limitear;
  sin internet, los activos caen al fallback (snapshot/cache stale o unsupported).
- **Node 22:** `yahoo-finance2` v3 pide Node ≥22; el repo corre 20.19.4 con un
  warning por proceso (no bloquea).
- **Accesibilidad:** el pase de GF-232 fue sobre **web**; mobile no tuvo pase
  formal de a11y todavía.
- **Deploy/observabilidad:** aún no hay entorno desplegado ni Sentry cableado
  (épica GF-177 pendiente). Todo el testing es local.

---

## 11. Cómo reportar hallazgos

Por cada bug: ID del caso (ej. `P4`, `WB13`, `Q6`), request/pasos, respuesta
obtenida vs esperada, y entorno (`FX_ARS_SOURCE`, web/mobile, dispositivo) si
aplica. Para issues de API, adjuntar el log de `pnpm dev:api` (pino). Abrir el
bug en Jira (proyecto GF) enlazando la story afectada.

Convención de severidad sugerida: **bloqueante** (rompe un flujo core: auth,
crear transacción, portfolio, quiz), **mayor** (cálculo incorrecto:
WAC/pnl/FX/score de perfil), **menor** (mensajes, formato, UX), **cosmético**
(texto, estilos).
