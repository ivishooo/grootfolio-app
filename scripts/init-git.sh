#!/usr/bin/env bash
# GrootFolio - inicializa el repositorio Git con ramas base.
# Uso: ./scripts/init-git.sh [remote-url]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE_URL="${1:-}"

if [[ -d .git ]]; then
  echo "! Ya existe un repo git en esta carpeta. Salteando 'git init'."
else
  echo "[1/4] git init"
  git init -b main
fi

echo "[2/4] Primer commit (si hay cambios pendientes)"
git add .
if ! git diff --cached --quiet; then
  git commit -m "chore: scaffolding inicial del monorepo GrootFolio

Estructura: apps/api, apps/web, apps/mobile + packages/shared, packages/tokens.
Incluye: theming light/dark, stubs de pantallas, documentacion de arquitectura
y plan para Claude Code.

Co-Authored-By: Claude <noreply@anthropic.com>"
else
  echo "  (no hay cambios para commitear)"
fi

echo "[3/4] Crear ramas de larga vida"
# develop
if ! git show-ref --verify --quiet refs/heads/develop; then
  git branch develop
  echo "  + rama develop"
fi

echo "[4/4] Configurar remoto"
if [[ -n "$REMOTE_URL" ]]; then
  if git remote | grep -q '^origin$'; then
    git remote set-url origin "$REMOTE_URL"
  else
    git remote add origin "$REMOTE_URL"
  fi
  echo "  origin => $REMOTE_URL"
  echo ""
  echo "  Para pushear:"
  echo "    git push -u origin main"
  echo "    git push -u origin develop"
else
  echo "  (no se paso remote-url; agregalo luego con 'git remote add origin <url>')"
fi

cat <<'EOF'

Listo. Acordate de proteger 'main' y 'develop' en GitHub:
- Requerir PR antes de mergear.
- Requerir CI verde.
- Prohibir push directo y force-push.
Ver docs/GIT_WORKFLOW.md para el detalle.
EOF
