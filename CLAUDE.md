# Proyecto: GrootFolio

## Contexto del producto

GrootFolio es una plataforma que centraliza inversiones personales (crypto,
acciones, bonos y divisas) y ayuda a los usuarios a entender su rendimiento
global y su perfil como inversores. Se desarrolla como tesis de la carrera
Analisis de Sistemas por Ivan Otero y Franco Davicino.

## Equipo y roles

- **Ivan Otero** (`@ivishooo`): product owner, dominio de inversiones, foco en
  UX y reglas de negocio.
- **Franco Davicino** (`@Davichenco`): backend lead, experiencia en Node.js,
  capacitandose en AdonisJS.
- Ambos participan en frontend web y mobile.

## Stack acordado

- **Backend**: AdonisJS 6 + TypeScript. ORM: Lucid (o Prisma, a confirmar).
- **Web**: React 19 + Vite + TypeScript + TanStack Query + Zustand o Redux
  Toolkit.
- **Mobile**: React Native 0.84 + Expo SDK 55 + TypeScript + React Navigation 7.
- **Base de datos**: Postgres 16 preferentemente; MySQL 8 como alternativa si
  se prioriza familiaridad del equipo.
- **APIs externas de precios**: CoinGecko (crypto), Yahoo Finance 2 o Alpha
  Vantage (acciones y ETFs), Frankfurter/BCRA (divisas). TradingView solo
  como widget.
- **Auth**: JWT propio con refresh rotatorio en el MVP.
- **Hosting**: Railway o Fly.io (backend), Vercel (web), EAS Build (mobile).
- **Observabilidad**: Sentry + pino + uptime checks.
- **Monorepo** con pnpm workspaces; paquete `packages/shared` para tipos y
  validadores Zod.

## Como trabajar conmigo (Claude)

- Responde en castellano rioplatense, con tono tecnico pero cercano.
- Antes de proponer cambios de stack, respeta las decisiones tomadas en el
  documento de arquitectura (`docs/adr/0001-arquitectura.md`). Si sugiero
  desviarme, justifica con al menos dos razones concretas.
- Cuando el tema sea academico (capitulos de tesis, fundamentacion, diagramas
  UML), prioriza claridad expositiva y rigor sobre velocidad.
- Cuando el tema sea codigo, prioriza soluciones idiomaticas de AdonisJS y
  React. Evita introducir librerias nuevas sin justificarlas.
- Si una decision no esta tomada, haceme preguntas antes de avanzar; no
  asumas stack.
- Los entregables formales de tesis van como `.docx`; los bocetos rapidos
  pueden ir en markdown.
- Para este monorepo, las dependencias se instalan SOLO con `pnpm install`.
  Nunca uses `npm i` ni `yarn`: rompen los workspaces y crean conflictos de
  lockfile.

## Glosario

- **Activo**: instrumento de inversion (crypto, accion, ETF, bono, divisa).
- **Holding**: posicion agregada de un usuario sobre un activo.
- **Transaction**: operacion individual de compra o venta que compone un
  holding.
- **PriceSnapshot**: precio cacheado consultado a una API externa.
- **Perfil de inversor**: clasificacion (conservador, moderado, agresivo)
  obtenida del cuestionario.

## Fuera de alcance (MVP)

- Ejecucion de operaciones reales o integracion con brokers.
- Chatbot (queda propuesto para v2).
- Analisis tecnico avanzado propio (se delega en widget de TradingView).
- Notificaciones push de alertas de precio (se evaluara como feature de
  cierre).

## Lectura recomendada para colaboradores nuevos

Si recien te incorporas al proyecto (Franco u otros), leete antes de tocar
nada estos documentos en orden:

1. **`docs/ONBOARDING.md`** — snapshot del estado del proyecto, linea de
   tiempo, que esta hecho y que falta.
2. **`docs/adr/0001-arquitectura.md`** — decisiones de stack y arquitectura
   ya tomadas (no se reabren sin un ADR nuevo que las reemplace).
3. **`docs/GIT_WORKFLOW.md`** — flujo de ramas, conventional commits, reglas
   de PR y proteccion de ramas (Rulesets con bypass asimetrico).
4. **`docs/CLAUDE_CODE_PLAN.md`** — plan por fases para construir la capa
   visual.
5. **`docs/FIGMA_REFERENCE.md`** — mapeo de pantallas Figma -> archivos del
   codigo.
6. **`README.md`** — setup local, scripts y estructura del repo.
7. **`GrootFolio - Analisis y Plan de Implementacion.docx`** (raiz del repo)
   — analisis arquitectonico completo que va como capitulo de tesis.
