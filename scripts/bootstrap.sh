#!/usr/bin/env bash
# GrootFolio - bootstrap de entorno local.
# Uso: ./scripts/bootstrap.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Verificando versiones..."
NODE_VERSION="$(node -v 2>/dev/null || echo 'none')"
PNPM_VERSION="$(pnpm -v 2>/dev/null || echo 'none')"

if [[ "$NODE_VERSION" == "none" ]]; then
  echo "  ! Node no esta instalado. Requiere >= 20.11."
  exit 1
fi
if [[ "$PNPM_VERSION" == "none" ]]; then
  echo "  ! pnpm no esta instalado. Instalalo con 'npm i -g pnpm@9.12.0'."
  exit 1
fi
echo "  Node: $NODE_VERSION"
echo "  pnpm: $PNPM_VERSION"

echo "[2/5] Instalando dependencias..."
pnpm install

echo "[3/5] Copiando archivos de entorno si no existen..."
copy_env() {
  local src="$1"
  local dest="$2"
  if [[ -f "$src" && ! -f "$dest" ]]; then
    cp "$src" "$dest"
    echo "  + $dest"
  fi
}
copy_env apps/api/.env.example apps/api/.env
copy_env apps/web/.env.example apps/web/.env.local
copy_env apps/mobile/.env.example apps/mobile/.env

echo "[4/5] Preparando base de datos local (opcional)."
# Usamos puerto 5433 en el host para no chocar con otros Postgres locales.
# El contenedor sigue escuchando en 5432 puertas adentro.
PG_HOST_PORT="${PG_HOST_PORT:-5433}"
PG_CONTAINER="grootfolio-postgres"
PG_VOLUME="grootfolio-postgres-data"

if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    echo "  ! '${PG_CONTAINER}' ya esta corriendo (puerto host ${PG_HOST_PORT})."
  elif docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    echo "  Reiniciando contenedor existente '${PG_CONTAINER}'..."
    docker start "${PG_CONTAINER}" >/dev/null
    echo "  Postgres arrancado en localhost:${PG_HOST_PORT}."
  else
    echo "  Levantando Postgres 16 en Docker (host:${PG_HOST_PORT} -> container:5432)..."
    docker volume create "${PG_VOLUME}" >/dev/null 2>&1 || true
    docker run -d --name "${PG_CONTAINER}" \
      -e POSTGRES_USER=grootfolio \
      -e POSTGRES_PASSWORD=grootfolio \
      -e POSTGRES_DB=grootfolio_dev \
      -p "${PG_HOST_PORT}:5432" \
      -v "${PG_VOLUME}:/var/lib/postgresql/data" \
      postgres:16 >/dev/null
    echo "  Postgres arrancado en localhost:${PG_HOST_PORT}."
    echo "  (Usuario: grootfolio | DB: grootfolio_dev | Volumen: ${PG_VOLUME})"
  fi
else
  echo "  (docker no detectado - saltea Postgres. Instalalo o levanta la DB a mano.)"
fi

echo "[5/5] Build de paquetes compartidos..."
pnpm -F "@grootfolio/tokens" build >/dev/null 2>&1 || true
pnpm -F "@grootfolio/shared" build >/dev/null 2>&1 || true

cat <<'EOF'

Listo. Proximos comandos:
  pnpm dev:api     # backend AdonisJS en http://localhost:3333
  pnpm dev:web     # frontend web en http://localhost:5173
  pnpm dev:mobile  # Expo (scan QR o 'i'/'a')
  pnpm typecheck   # check de tipos de todo el monorepo
EOF
