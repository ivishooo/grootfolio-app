# @grootfolio/api

API REST en **AdonisJS 6 + TypeScript**, consumida por la web y la mobile. Persistencia en
PostgreSQL 16 mediante el ORM Lucid.

> Este README describe la estructura esperada. El scaffold completo de Adonis se
> genera con el comando oficial una vez clonado el repo (ver seccion "Bootstrap").

## Bootstrap (una sola vez, en el sprint 1)

Dentro de `apps/api/`:

```bash
# Opcion recomendada: pedirle a Claude Code (ver docs/CLAUDE_CODE_PLAN.md, Fase 1)
# o correr manualmente el starter oficial:
pnpm dlx create-adonisjs@latest . --kit=api --adapter=lucid --db=postgres --auth-guard=access_tokens
```

El starter deja:

- `bin/server.ts`, `start/routes.ts`, `start/kernel.ts`
- `config/` (auth, cors, database, hash, logger, session)
- `app/` (controllers, middleware, models, services)
- `database/migrations/`

Tras el scaffold, pegar los contenidos semilla de este repo en las carpetas
correspondientes y ejecutar:

```bash
node ace generate:key
node ace configure @adonisjs/auth
node ace migration:run
```

## Estructura objetivo

```
apps/api/
  app/
    controllers/
      auth_controller.ts
      assets_controller.ts
      portfolio_controller.ts
      quiz_controller.ts
    models/
      user.ts
      asset_catalog.ts
      transaction.ts
      holding.ts
      price_snapshot.ts
      quiz_question.ts
      quiz_response.ts
      risk_profile.ts
      refresh_token.ts
    services/
      portfolio_service.ts
      price_provider/
        coingecko_provider.ts
        yahoo_provider.ts
        frankfurter_provider.ts
        index.ts
      quiz_service.ts
      auth_service.ts
    validators/
      (schemas vinejs - opcional si se usa shared/zod)
    middleware/
      auth_middleware.ts
      rate_limit_middleware.ts
  config/
    app.ts  auth.ts  cors.ts  database.ts  hash.ts  logger.ts
  database/
    migrations/
    seeders/
      asset_catalog_seeder.ts
      quiz_seeder.ts
  start/
    routes.ts
    kernel.ts
```

## Endpoints (referencia para Claude Code)

| Metodo | Ruta                        | Descripcion                                |
|--------|-----------------------------|--------------------------------------------|
| POST   | /auth/register              | Registro de usuario                         |
| POST   | /auth/login                 | Login y emision de JWT + refresh           |
| POST   | /auth/refresh               | Rotacion de refresh token                   |
| POST   | /auth/logout                | Revoca refresh token                        |
| GET    | /me                         | Datos del usuario autenticado               |
| GET    | /assets/catalog             | Busqueda en catalogo de activos             |
| GET    | /portfolio                  | Resumen + holdings + distribucion           |
| GET    | /transactions               | Listado de transacciones                    |
| POST   | /transactions               | Alta de transaccion                         |
| DELETE | /transactions/:id           | Baja logica                                 |
| GET    | /quiz                       | Devuelve las preguntas y opciones activas   |
| POST   | /quiz/submit                | Calcula y persiste el perfil de inversor    |
| GET    | /quiz/result                | Ultimo resultado del usuario                |
