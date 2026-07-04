# Deploy del backend (GF-182)

Guía para desplegar `apps/api` (AdonisJS 6) con HTTPS público y Postgres
gestionado. El deploy con HTTPS es **prerequisito** para la web en producción
(GF-183) y para testear la app en el iPhone vía TestFlight (épica GF-252: iOS
ATS exige HTTPS).

## Cómo corre en producción

La API se ejecuta **desde fuente** con el loader TS (igual que en dev):
`node --import=ts-node-maintained/register/esm bin/server.js` (script
`pnpm start`). Motivo: `packages/shared` se consume como TypeScript, así que
compilar a JS plano rompería los imports de la dep de workspace. El `Dockerfile`
instala solo la API y sus workspaces (`pnpm install --filter @grootfolio/api...`).

Archivos de este andamiaje:

- `apps/api/Dockerfile` — imagen (build context = raíz del repo).
- `.dockerignore` (raíz) — excluye node_modules, builds y `.env`.
- `apps/api/fly.toml` — config de Fly.io.
- `apps/api/railway.json` — config de Railway.
- `apps/api/.env.production.example` — variables a setear en la plataforma.

## Variables de entorno

Ver `apps/api/.env.production.example`. Obligatorias: `APP_KEY`, `JWT_SECRET`,
`DATABASE_URL` (o las `DB_*`), y `CORS_ORIGINS` con el origen de la web
desplegada. La conexión soporta dos modos (ver `config/database.ts`):

- **`DATABASE_URL`** (recomendado en deploy) — connection string del Postgres
  gestionado; **activa SSL por default** (`rejectUnauthorized:false`).
- **`DB_*` discretas** — como en local. Forzar/omitir TLS con `DB_SSL`.

Generar secretos:

```bash
node apps/api/ace.js generate:key   # APP_KEY  (o: pnpm --filter @grootfolio/api ace generate:key)
openssl rand -base64 48             # JWT_SECRET
```

---

## Opción A — Railway

1. Crear proyecto en Railway y **agregar un Postgres** (New → Database → Postgres).
   Railway expone `DATABASE_URL` en el servicio de la DB.
2. Crear el servicio de la API desde el repo de GitHub. Railway detecta
   `apps/api/railway.json` y buildea con el `Dockerfile`.
3. En el servicio de la API → **Variables**: setear las de
   `.env.production.example`. Para la DB, referenciar la del Postgres:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
4. Deploy. Cuando esté verde, correr migraciones y seed una vez:

   ```bash
   railway link                                   # elegí el proyecto/servicio API
   railway run pnpm --filter @grootfolio/api migrate
   railway run pnpm --filter @grootfolio/api seed   # opcional: usuario dev + catálogo
   ```
5. Generar el dominio público (Settings → Networking → Generate Domain) y
   verificar: `curl https://<tu-app>.up.railway.app/health` → `{"status":"ok"}`.

> Railway no tiene "release command"; por eso las migraciones se corren a mano
> con `railway run` (o se agregan a un paso de deploy propio).

---

## Opción B — Fly.io

1. `fly launch --no-deploy --copy-config --dockerfile apps/api/Dockerfile`
   (usa el `fly.toml` provisto; confirmá `app` y `primary_region`).
2. Crear y atar Postgres (inyecta `DATABASE_URL` como secreto):

   ```bash
   fly postgres create --name grootfolio-db --region eze
   fly postgres attach grootfolio-db -a grootfolio-api
   ```
3. Setear el resto de secretos:

   ```bash
   fly secrets set APP_KEY=... JWT_SECRET=... CORS_ORIGINS=https://grootfolio.vercel.app
   ```
4. `fly deploy -c apps/api/fly.toml`. El `release_command` corre las
   **migraciones** automáticamente en cada deploy.
5. Seed inicial (una vez): `fly ssh console -C "node --import=ts-node-maintained/register/esm ace.js db:seed"`.
6. Verificar: `curl https://grootfolio-api.fly.dev/health`.

---

## Después del deploy

- **Web (GF-183):** setear `VITE_API_URL=https://<api-desplegada>` en Vercel.
- **Mobile (GF-255):** poner esa URL HTTPS en `apps/mobile/eas.json`
  (`preview`/`production` → `EXPO_PUBLIC_API_URL`).
- **CORS:** agregar el dominio de Vercel a `CORS_ORIGINS` de la API.
- **Smoke:** correr el checklist de regresión de `docs/TESTING_MANUAL.md`
  apuntando a la URL pública.

## Probar la imagen localmente (opcional)

```bash
docker build -f apps/api/Dockerfile -t grootfolio-api .
docker run --rm -p 3333:3333 \
  -e APP_KEY=$(openssl rand -base64 32) -e JWT_SECRET=$(openssl rand -base64 48) \
  -e DATABASE_URL="postgres://grootfolio:grootfolio@host.docker.internal:5433/grootfolio_dev" \
  -e DB_SSL=false -e CORS_ORIGINS=http://localhost:5173 \
  grootfolio-api
curl http://localhost:3333/health
```
