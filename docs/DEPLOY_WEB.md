# Deploy de la web en Vercel (GF-183)

Guía para desplegar `apps/web` (React 19 + Vite) en Vercel, consumiendo el
backend ya desplegado (GF-182). Depende de tener la **URL HTTPS del backend**
(hoy `https://grootfolio-app-production.up.railway.app`).

## Cómo buildea

- **Build**: `pnpm run build` (= `vite build`) → sale a `dist/`.
- **SPA**: React Router necesita que todas las rutas caigan en `index.html`;
  eso lo resuelve el `rewrites` de `apps/web/vercel.json`. Sin él, un refresh en
  `/dashboard` da 404.
- **API URL**: la app lee `import.meta.env.VITE_API_URL` y la **hornea en build
  time**. Por eso `VITE_API_URL` debe estar seteada en Vercel *antes* del build;
  cambiarla requiere redeploy.
- **Monorepo**: `apps/web` depende de `@grootfolio/shared` y `@grootfolio/tokens`
  (workspaces pnpm). Vercel detecta el workspace e instala desde la raíz.

Archivo del andamiaje: `apps/web/vercel.json` (framework, build, output, rewrite SPA).

## Pasos

1. En Vercel: **Add New → Project** → importar el repo `ivishooo/grootfolio-app`.
2. **Root Directory**: `apps/web` (importante en un monorepo; ahí vive el
   `vercel.json`). Vercel autodetecta **Vite**.
3. **Production Branch** (Settings → Git): `develop` (donde vive todo hoy;
   cambiar a `main` cuando se libere). El default de Vercel suele ser `main`.
4. **Environment Variables** → agregar:
   ```
   VITE_API_URL = https://grootfolio-app-production.up.railway.app
   ```
   Setearla para Production (y Preview si querés que las branch previews peguen
   al mismo backend).
5. **Deploy**. Al terminar, Vercel te da una URL tipo
   `https://grootfolio.vercel.app`.
6. **CORS en el backend**: en Railway → servicio de la API → Variables, setear
   `CORS_ORIGINS` con el dominio de Vercel (coma-separado si hay varios):
   ```
   CORS_ORIGINS = https://grootfolio.vercel.app
   ```
   Sin esto, la web en producción recibe error de CORS al llamar a la API.
   (Las branch previews de Vercel usan subdominios cambiantes; si querés que
   peguen al backend, agregá también ese patrón o usá un dominio fijo.)
7. **Verificar**: abrir la URL de Vercel, hacer login/registro y ver el
   dashboard con datos reales. Un refresh en `/dashboard` debe seguir andando
   (rewrite SPA OK).

## Notas

- `VITE_API_URL` es build-time: si cambiás el backend de URL, hay que
  **redeploy** de la web (no alcanza con cambiar la env y reiniciar).
- El bundle actual pesa ~750 kB (warning de Vite). No bloquea el deploy; queda
  como mejora futura (code-splitting / `manualChunks`) si hace falta.
