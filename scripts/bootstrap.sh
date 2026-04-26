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
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -q '^grootfolio-postgres$'; then
    echo "  ! Postgres ya esta corriendo en el contenedor 'grootfolio-postgres'."
  else
    echo "  Levantando Postgres 16 en Docker (puerto 5432)..."
    docker run -d --name grootfolio-postgres \
      -e POSTGRES_USER=grootfolio \
      -e POSTGRES_PASSWORD=grootfolio \
      -e POSTGRES_DB=grootfolio \
      -p 5432:5432 \
      postgres:16 >/dev/null
    echo "  Postgres arrancado."
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
