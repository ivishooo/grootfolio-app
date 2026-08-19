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
2. Crear el servicio de la API desde el repo de GitHub (New → GitHub Repository).
3. Servicio de la API → **Settings**, configurar (Railway **no** autodetecta
   `apps/api/railway.json` porque no está en la raíz del repo; se hace a mano):
   - **Source → Branch**: la rama donde vive el `Dockerfile` (`develop` hoy,
     `main` cuando se libere). El default de Railway es `main`.
   - **Source → Root Directory**: `/` (raíz). El Dockerfile necesita todo el
     monorepo como context; **no** poner `apps/api`.
   - **Build → Dockerfile Path**: `apps/api/Dockerfile`.
4. Servicio de la API → **Variables**: setear las de `.env.production.example`
   (`APP_KEY`, `JWT_SECRET`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`,
   `CORS_ORIGINS`) **más `PORT=3333`**. Sin `PORT=3333`, Railway inyecta su
   propio puerto y el dominio da **502** (la app queda escuchando en otro lado).
5. Deploy. Correr **migraciones** con un **Pre-Deploy Command**
   (Settings → Deploy). Ojo con `--force`: en producción Adonis pide
   confirmación interactiva y sin TTY aborta sin migrar.

   ```
   node --import=ts-node-maintained/register/esm ace.js migration:run --force
   ```
   Seed opcional (catálogo de activos + preguntas del quiz), como segunda línea
   o vía la pestaña **Console**:
   `node --import=ts-node-maintained/register/esm ace.js db:seed`.
   `db:seed` **no** acepta `--force` (solo lo lleva `migration:run`); en una
   consola interactiva, si pregunta por producción, respondé `y`. Nota: el
   `dev_user_seeder` está **deshabilitado en producción** a propósito, así que el
   usuario `dev@grootfolio.test` no se crea en prod — registrá un usuario nuevo
   desde la app para logear.
6. **Networking → Generate Domain** (target port **3333**) y verificar:
   `curl https://<tu-app>.up.railway.app/health` → `{"status":"ok"}`.

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
   fly secrets set APP_KEY=... JWT_SECRET=... CORS_ORIGINS=https://grootfolio-app-web.vercel.app
   ```
4. `fly deploy -c apps/api/fly.toml`. El `release_command` corre las
   **migraciones** automáticamente en cada deploy.
5. Seed inicial (una vez): `fly ssh console -C "node --import=ts-node-maintained/register/esm ace.js db:seed"` (sin `--force`; el `dev_user_seeder` no corre en prod).
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
