# GrootFolio

Plataforma que centraliza inversiones personales (crypto, acciones, bonos, divisas)
y ayuda al usuario a entender su rendimiento y su perfil como inversor.

Trabajo Final de Carrera — Analisis de Sistemas
Autores: Ivan Otero y Franco Davicino

## Stack

- **Backend**: AdonisJS 6 + TypeScript, ORM Lucid, PostgreSQL 16.
- **Web**: React 19 + Vite + TypeScript + TanStack Query + Tailwind CSS.
- **Mobile**: React Native 0.81 + Expo SDK 54 + TypeScript + React Navigation 7.
- **Shared**: paquete `@grootfolio/shared` con schemas Zod, tipos de dominio y utils.
- **Tokens**: paquete `@grootfolio/tokens` con los design tokens extraidos del Figma.
- **Monorepo**: pnpm workspaces.

## Estructura

```
grootfolio/
  apps/
    api/            # AdonisJS 6 - API REST compartida por web y mobile
    web/            # React + Vite
    mobile/         # React Native + Expo
  packages/
    shared/         # Schemas Zod, tipos de dominio, utils y cliente API
    tokens/         # Design tokens (colores, tipografia, spacing)
  docs/
    adr/            # Architecture Decision Records
    CLAUDE_CODE_PLAN.md
    GIT_WORKFLOW.md
    FIGMA_REFERENCE.md
  .github/          # Templates de issue / PR y workflows CI
  scripts/          # Scripts de bootstrap e inicializacion
```

## Requisitos

- Node.js 20.11+ (ver `.nvmrc`)
- pnpm 9+ (`corepack enable` + `corepack prepare pnpm@9 --activate`)
- Docker y Docker Compose (opcional, para Postgres local)
- Expo CLI (viene con `pnpm dev:mobile`)
- Cuenta en Expo + EAS para builds mobile

## Primeros pasos

```bash
# 1. Clonar e instalar
git clone <repo>
cd grootfolio-app
cp .env.example .env
pnpm install

# 2. Levantar Postgres (opcional, via docker)
docker compose up -d db

# 3. Correr migraciones
pnpm --filter @grootfolio/api migrate

# 4. Levantar los tres targets (en terminales separadas)
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

## Scripts principales

| Comando | Que hace |
|---------|----------|
| `pnpm dev:api` | Levanta la API AdonisJS en modo watch |
| `pnpm dev:web` | Vite dev server |
| `pnpm dev:mobile` | Expo dev server |
| `pnpm lint` | Corre ESLint en todo el monorepo |
| `pnpm typecheck` | Typecheck sin emitir archivos |
| `pnpm test` | Tests de todos los paquetes |
| `pnpm build` | Build de todos los targets |
| `pnpm format` | Formatea con Prettier |

## Flujo de trabajo

Ver `docs/GIT_WORKFLOW.md` para el modelo de ramas, convenciones de commit y
proceso de PR.

## Arquitectura

Decisiones clave documentadas en `docs/adr/`. El analisis completo y el plan por
sprints estan en el documento `GrootFolio - Analisis y Plan de Implementacion.docx`
del proyecto de tesis.

## Licencia

Uso academico. Ver `LICENSE`.
