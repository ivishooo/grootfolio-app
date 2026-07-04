# Deploy del backend (apps/api). El build context es la RAIZ del monorepo,
# porque la API depende del workspace packages/shared.
#
#   docker build -f apps/api/Dockerfile -t grootfolio-api .
#   docker run --rm -p 3333:3333 --env-file apps/api/.env.production grootfolio-api
#
# La API corre desde fuente con el loader TS (igual que en dev). Motivo:
# packages/shared se consume como TypeScript (su `exports` apunta a src/*.ts),
# asi que compilar la API a JS plano rompe al importar shared. Correr desde
# fuente evita bundlear la dep de workspace y mantiene un unico modo.
FROM node:20.19.4-slim

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    PORT=3333 \
    HOST=0.0.0.0 \
    TZ=America/Argentina/Buenos_Aires

RUN corepack enable
WORKDIR /app

# Copiamos todo el monorepo (node_modules/build quedan fuera via .dockerignore)
# e instalamos SOLO la API y sus workspaces (--filter ...), evitando las deps
# pesadas de web/mobile (expo, react-native, etc.).
# --prod=false: la API corre desde fuente con ts-node-maintained, que es una
# devDependency; sin esto (NODE_ENV=production) pnpm la omitiria y el arranque
# fallaria con "Cannot find package 'ts-node-maintained'".
COPY . .
RUN pnpm install --frozen-lockfile --prod=false --filter @grootfolio/api...

# Recien despues del install fijamos production (para el runtime de la app).
# Defaults no-secretos: asi en la plataforma solo hay que setear los secretos
# reales (APP_KEY, JWT_SECRET, DATABASE_URL, CORS_ORIGINS). Overrideables.
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    JWT_ACCESS_TTL=15m \
    JWT_REFRESH_TTL=30d

WORKDIR /app/apps/api
EXPOSE 3333

# Healthcheck del contenedor (las plataformas ademas chequean /health por HTTP).
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3333)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "start"]
