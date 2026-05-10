# Fase 5 - Backend e integracion frontend/backend

> Documento de trabajo. Reemplaza al apartado "Fase 5" de
> `docs/CLAUDE_CODE_PLAN.md` con un desglose ejecutable. Si entra en conflicto
> con el plan original, manda este.

## Por que este documento

`CLAUDE_CODE_PLAN.md` describe Fase 5 como "Integracion con API real" y asume
que existe un backend funcional. Hoy `apps/api` solo tiene el scaffolding
(migracion inicial, rutas declaradas como contrato, middleware stub). Antes
de poder integrar hace falta levantar el backend completo.

Por eso Fase 5 se ejecuta en cuatro bloques secuenciales:

1. **Bloque A - GF-204** Auth backend (modelos, JWT, refresh rotatorio).
2. **Bloque B - GF-210** Portfolio backend (transactions, holdings).
3. **Bloque C - GF-216** APIs de precios (CoinGecko, Yahoo/Alpha, Frankfurter).
4. **Bloque D - GF-222** Integracion frontend con auth y queries reales.

Cada story se entrega en un PR cortito contra `develop`. El front sigue
funcionando con mocks hasta el bloque D.

## Pre-requisitos

- Postgres 16 corriendo en `localhost:5433` (compose ya esta).
- `pnpm install` actualizado en la raiz.
- `apps/api/.env` configurado a partir de `.env.example` (con `DB_PORT=5433`).
- `pnpm -F @grootfolio/api migrate` ejecutable contra la DB local.

## Decisiones tecnicas (cerradas el 2026-05-09)

| # | Decision | Resolucion |
|---|----------|------------|
| D1 | Estrategia de access tokens | **JWT propio** con `jsonwebtoken`, payload `{ sub, email, exp }`, vida 15 min. Refresh opaco rotatorio guardado hasheado (`bcrypt` o `crypto.scrypt`) en `refresh_tokens`. Alineado con ADR-0001. |
| D2 | Algoritmo de hashing de passwords | **scrypt** via Adonis `hash` service (default). |
| D3 | Storage de tokens en web | **`localStorage`** para access, refresh tambien en `localStorage` (MVP). Cookie httpOnly queda como mejora post-MVP en ADR futuro. |
| D4 | Storage de tokens en mobile | **`expo-secure-store`**. |
| D5 | Cache de precios | **Tabla `price_snapshots`** con TTL leido por servicio. Job manual con `node ace prices:refresh`. |
| D6 | Datos seed iniciales | **Si**: `AssetCatalogSeeder.ts` (BTC, ETH, AAPL, US-T, EUR del Figma) y `QuizSeeder.ts` (5 preguntas x 4 opciones). |

Si alguna decision tiene que reabrirse, hacerlo via ADR nuevo
(p. ej. `docs/adr/0003-cookies-httponly.md`) y no en el PR de la story.

## Bloque A - GF-204 Auth backend

**Sprint:** GF Sprint 2 (id=6, state=future hasta que arrancamos).
**Salida:** registro, login, refresh y logout funcionando contra `apps/api`,
con tests unitarios minimos y middleware JWT real.

| Story | PR | Alcance |
|-------|----|---------|
| GF-205 | `feat(api): modelo User y servicio de hashing` | `app/models/user.ts` con Lucid, password hasheada al setearse, helper `verifyPassword`. Configurar `config/hash.ts` (scrypt default). Smoke test que crea un user y verifica password. |
| GF-206 | `feat(api): registro de usuarios` | `auth_controller.register`. Vine validator (mirror del Zod en `packages/shared/registerInputSchema`). Devuelve `{ user, accessToken, refreshToken }`. Conflict si email ya existe. |
| GF-207 | `feat(api): login JWT` | `auth_controller.login`. Genera access JWT (15 min) y refresh opaco (30 dias) hasheado y persistido en `refresh_tokens`. Test: credenciales validas/invalidas. |
| GF-208 | `feat(api): refresh rotatorio + logout` | `auth_controller.refresh` y `.logout`. Refresh consume el viejo (lo marca con `revoked_at` y setea `replaced_by`), emite par nuevo. Detecta reuso (token revocado) y revoca toda la familia. `logout` revoca el refresh activo. |
| GF-209 | `feat(api): middleware auth real + me` | Reemplaza el stub: lee `Authorization: Bearer`, valida JWT, hidrata `ctx.auth.user`. `auth_controller.me` devuelve el user actual. 401 con shape `ApiError` consistente. |

**Criterios de aceptacion del bloque A:**
- `pnpm -F @grootfolio/api typecheck && pnpm -F @grootfolio/api lint` pasan.
- `pnpm -F @grootfolio/api migrate` aplica limpio.
- Suite minima de tests Japa: register OK, register duplicate, login OK,
  login wrong password, refresh OK, refresh reuso revoca familia, me con/sin
  token.
- Todas las stories con comentario en Jira linkeando al PR y transicion a Done.

## Bloque B - GF-210 Portfolio backend

**Salida:** CRUD de transactions, agregado a holdings, endpoint
`GET /portfolio` consumible por web y mobile.

| Story | PR | Alcance |
|-------|----|---------|
| GF-211 | `feat(api): modelos Transaction y AssetCatalog + seeder` | `app/models/transaction.ts`, `app/models/asset_catalog.ts`. `AssetCatalogSeeder` con activos del Figma (BTC, ETH, AAPL, US-T, EUR). `pnpm -F @grootfolio/api seed` ejecutable. |
| GF-212 | `feat(api): CRUD de transactions` | Endpoints `GET/POST/DELETE /transactions`. Vine validator alineado a `createTransactionInputSchema` de shared. Soft delete via `deleted_at`. Tests basicos de owner-scope (un user no ve transactions de otro). |
| GF-213 | `feat(api): servicio de holdings` | `app/services/portfolio_service.ts`: dada lista de transactions de un user, devuelve holdings agregados (qty, avg price, etc). Sin precios todavia: `currentPrice = avgPrice` como placeholder. Unit test con casos: buy puro, buy+sell, multi-asset. |
| GF-214 | `feat(api): endpoint GET /portfolio` | Combina `portfolio_service` con la firma de `PortfolioSummary` de shared/types. Responde KPIs, distribucion por tipo, holdings. `monthlyReturn` queda como array vacio hasta tener historico real (post-MVP). |
| GF-215 | `feat(api): validators y errores uniformes` | Refactor: todos los controllers usan Vine + handler global de errores que serializa al shape `ApiError`. Lint zero warnings. |

**Criterios:**
- `GET /portfolio` con un user de prueba (creado en seeder dev) responde la
  estructura completa que consume el dashboard.
- Owner-scope verificado en CRUD: ningun endpoint expone data de otro user.

## Bloque C - GF-216 APIs de precios

**Salida:** servicios que consultan APIs externas, cachean en
`price_snapshots`, y retroalimentan `currentPrice` del portfolio.

| Story | PR | Alcance |
|-------|----|---------|
| GF-217 | `feat(api): provider CoinGecko` | `app/services/prices/coingecko_provider.ts`. Interfaz comun `PriceProvider`. Test con respuesta mockeada (vitest o nock). |
| GF-218 | `feat(api): provider acciones` | Yahoo Finance 2 como default; fallback a Alpha Vantage si requiere API key. Documentar en el PR cual quedo. |
| GF-219 | `feat(api): provider divisas` | Frankfurter (sin auth) y BCRA para ARS. |
| GF-220 | `feat(api): cache de PriceSnapshot` | `price_cache_service`: lookup por `(asset_id)` con TTL (5 min crypto, 15 min stock/currency, 24 hs bond). Si stale, llama provider y persiste snapshot. |
| GF-221 | `feat(api): job de refresh + portfolio con precios reales` | Comando `node ace prices:refresh` que itera asset_catalog y precachea. Integrar al endpoint `GET /portfolio`: holdings traen `currentPrice` real, KPIs reales. |

**Criterios:**
- `GET /portfolio` con user real devuelve PnL coherente con precios actuales.
- Si una API externa falla, devolvemos el ultimo snapshot con `staleSince` y
  sin tirar 500.

## Bloque D - GF-222 Integracion frontend con backend

**Salida:** la app usa la API real end-to-end. Adios mocks (excepto los de
test).

| Story | PR | Alcance |
|-------|----|---------|
| GF-223 | `feat(web): auth real` | `apps/web/src/auth/AuthProvider.tsx` + store Zustand con access+refresh, hooks `useLogin/useRegister/useLogout`. Reemplaza `ProtectedRoute` mock. Refresh silencioso al expirar access. |
| GF-224 | `feat(mobile): auth real` | Equivalente con `expo-secure-store`. Persistencia entre reinicios. |
| GF-225 | `feat(web): TanStack Query para portfolio y quiz` | `usePortfolioQuery`, `useTransactionsQuery`, `useCreateTransaction`, `useQuizQuestions`, `useSubmitQuiz`. Reemplaza `apps/web/src/mocks/portfolio.ts`. Skeletons en cards. |
| GF-226 | `feat(mobile): queries reales` | Idem con TanStack Query en mobile. Reemplaza mocks inline en pantallas. |
| GF-227 | `feat(app): loading + error states unificados` | Skeletons (Card, Stat, Table, Chart), empty states (sin holdings, sin respuestas), error toasts con mensaje del `ApiError`. Verificar light+dark. |

**Criterios de "fin de Fase 5":**
- Login real persistido en web y mobile, deslogueo limpio.
- Dashboard con datos reales (creados via POST `/transactions`).
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` verde en api+web.
- `pnpm -F @grootfolio/mobile typecheck` verde.
- Cero `mocks/portfolio.ts` referenciado en codigo de produccion.

## Riesgos / cosas que pueden trabarnos

- **Yahoo Finance 2** suele rate-limitear y romper sin aviso. Mitigacion:
  fallback a Alpha Vantage (5 req/min en plan free) o cachear agresivamente.
- **CORS** entre web (5173) y api (3333) en dev. Configurar `@adonisjs/cors`
  con whitelist de localhost.
- **Migrate de Adonis** sobre la DB ya existente: si Postgres tiene state de
  pruebas, considerar `pnpm -F @grootfolio/api rollback --batch 0` antes del
  primer migrate de Bloque A.
- **JWT secret**: que `JWT_SECRET` quede solo en `.env`, nunca commiteado.
  Documentar generacion (`openssl rand -base64 48`).

## Tracking en Jira

- Sprint 2 (id=6) arranca cuando empieza Bloque A; meterle GF-205..GF-209.
- Al cerrar cada story: comentario con link al PR + transicion a Done.
- Al cerrar bloque: epica a Done. Si surgen bugs durante integracion, abrir
  como Bug bajo la epica que corresponda y al sprint vivo.

## Asignaciones

Todo Ivan + Claude (segun aclaracion del 2026-05-09). Franco solo participa
en GF-235 (DOCUMENTACION DE TESIS), que corre en paralelo y no bloquea.
