# ADR-0001: Arquitectura inicial del MVP

- **Estado:** Aceptado (con sub-decision actualizada en ADR-0002)
- **Fecha:** 2026-04-22
- **Autores:** Ivan Otero, Franco Davicino
- **Reemplaza a:** -
- **Reemplazado por:** -
- **Sub-decisiones actualizadas:** El pin original de Expo SDK 51 / React 18 /
  React Native 0.74 fue actualizado a SDK 55 / React 19 / RN 0.84 en
  [ADR-0002](0002-upgrade-expo-sdk-55.md) por incompatibilidad con Expo Go
  publicado en App Store. La eleccion de stack mobile (RN + Expo) sigue
  vigente; lo unico que cambia es la version pinneada.

## Contexto

GrootFolio es una aplicacion que centraliza inversiones personales (crypto,
acciones, bonos y divisas) con interfaz web y mobile. Se desarrolla como
tesis de la carrera Analisis de Sistemas. Antes de escribir codigo necesitamos
dejar por escrito las decisiones de arquitectura para poder defenderlas en el
documento de tesis y evitar discusiones circulares durante la implementacion.

Las restricciones relevantes son:

- Equipo de 2 personas (Ivan + Franco) con foco parcial.
- Ventana temporal < 6 meses hasta la entrega de avances para revision.
- Necesitamos clientes web y mobile que consuman logica comun.
- La tesis debe poder defenderse con argumentos tecnicos claros, no con
  elecciones "de moda".

## Decision

1. **Monorepo con pnpm workspaces.** Un solo repo `grootfolio-app` con
   `apps/api`, `apps/web`, `apps/mobile` y `packages/shared`, `packages/tokens`.
2. **Backend unico compartido**: AdonisJS 6 + TypeScript, con Lucid ORM sobre
   PostgreSQL 16. Expone una sola API REST que consumen web y mobile.
3. **Frontend web**: React 18 + Vite + TypeScript + TanStack Query + Tailwind
   CSS. Zustand para estado global liviano. Recharts para graficos.
4. **Frontend mobile**: React Native + Expo SDK 51 + TypeScript + React
   Navigation 6 (native stack). victory-native para graficos.
5. **Contratos compartidos**: tipos de dominio, schemas de validacion Zod y
   cliente HTTP basico viven en `packages/shared`. Design tokens en
   `packages/tokens` (incluye un preset para Tailwind).
6. **Auth**: JWT propio con refresh rotatorio. Tokens en `expo-secure-store`
   en mobile y en cookie httpOnly en web (MVP acepta fallback a `localStorage`).
7. **APIs externas de precios**: CoinGecko (crypto), Yahoo Finance 2 / Alpha
   Vantage (acciones y ETFs), Frankfurter y BCRA (divisas). TradingView solo
   como widget web.
8. **Hosting**: Railway o Fly.io para api, Vercel para web, EAS Build para
   mobile.
9. **Observabilidad**: Sentry + pino + health checks basicos.

## Alternativas consideradas

### Backend compartido vs dos backends separados (uno web, uno mobile)

- **Dos backends**: permite optimizar contratos por canal pero duplica codigo
  de dominio (calculo de holdings, cache de precios, auth), duplica superficie
  de testing y reparto de incidentes. Para un equipo de dos personas la carga
  operativa no se justifica.
- **Uno compartido (elegida)**: menor costo de mantenimiento, un solo set de
  tests, una sola fuente de verdad para reglas de negocio. El riesgo de que un
  canal contamine al otro se mitiga con `packages/shared` (tipos) y versionado
  semantico de endpoints.

### AdonisJS vs NestJS vs Express "a mano"

- **Express**: rapido de empezar, pero no trae estructura. Escalar hacia
  guards, pipes, validators, migrations y jobs implicaria inventar patrones.
  Malo para una tesis que quiere mostrar rigor arquitectonico.
- **NestJS**: excelente modularidad y DI, pero la curva de aprendizaje es
  mayor y Franco se esta capacitando en AdonisJS. El ecosistema de Nest es
  potente pero mas verboso.
- **AdonisJS 6 (elegida)**: TypeScript first, ORM (Lucid) integrado, CLI para
  migrations y factories, validator nativo, middleware claro. Permite defender
  en la tesis la eleccion de un framework "full stack batteries included" que
  reduce el bikeshedding.

### Base de datos

- **MySQL 8**: alternativa conocida, soporte solido de tipos basicos pero
  jsonb mas limitado y extensiones menos ricas.
- **PostgreSQL 16 (elegida)**: mejor soporte para json, arrays, CTEs, y ecosistema
  de extensiones (uuid-ossp, pg_trgm). Encaja con la necesidad de modelar
  activos heterogeneos y de cachear respuestas de APIs externas.

### Web: Next.js vs Vite + React Router

- **Next.js**: excelente para apps con SSR/SEO, pero la app es puramente
  privada (dashboard post-login) y el costo cognitivo de App Router, server
  actions, y la separacion server/client no aporta valor al MVP.
- **Vite + React (elegida)**: mas simple, mas rapido de compilar, integra
  sin friccion con Tailwind y con TanStack Query. La tesis lo justifica como
  un cliente SPA clasico que consume la API propia.

### Mobile: React Native Expo vs Flutter

- **Flutter**: perfomance excelente, pero supone un segundo stack (Dart) para
  un equipo que ya tiene React como lingua franca.
- **Expo React Native (elegida)**: reusa conocimiento de web, permite
  compartir tipos y schemas con `packages/shared`, EAS Build simplifica el
  pipeline. Para el alcance del MVP (CRUD + graficos basicos) es suficiente.

## Consecuencias

### Positivas

- Un solo lenguaje (TypeScript) en toda la pila => menos fatiga cognitiva.
- Tipos y schemas compartidos => los cambios en contrato se detectan en tiempo
  de compilacion en los tres apps.
- Design tokens centralizados => dark mode y rebrand futuros son triviales.
- pnpm workspaces + CI unica => onboarding reproducible en minutos.

### Negativas / riesgos

- Acoplamiento entre apps via `packages/shared`. Mitigado con versionado
  semantico interno y con tests en shared.
- Metro (React Native) require config extra para resolver workspaces.
  Mitigado con `metro.config.js` que incluye watchFolders y extraNodeModules.
- Adonis 6 es relativamente nuevo, la cantidad de tutoriales externos es
  menor que Express. Mitigado con ADRs por modulo y revision en pares.

## Revisiones futuras

Este ADR queda congelado como base del MVP. Si en el camino decidimos:

- Separar la API en dos servicios, o
- Migrar de Lucid a Prisma, o
- Reemplazar TanStack Query por RTK Query,

abrimos un nuevo ADR (`0002`, `0003`, ...) que referencie y, si corresponde,
reemplace este.
