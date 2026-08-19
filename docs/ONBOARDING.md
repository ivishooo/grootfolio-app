# GrootFolio - Onboarding y Estado del Proyecto

*Snapshot actualizado el 18 de agosto de 2026 (el original es del 28 de abril).*

Este documento es el "punto de aterrizaje" para cualquiera que llegue al
proyecto sin haber estado en las decisiones iniciales. Esta pensado
especialmente para que **Franco** (y cualquier futuro colaborador) pueda
arrancar a trabajar sin tener que reconstruir el contexto desde cero.

Si estas leyendo esto:

- Tenes el repo clonado en tu computadora.
- Queres entender donde estamos parados, que decisiones se tomaron y por que,
  y que falta hacer.
- Probablemente vas a abrir Claude Cowork apuntado a esta carpeta para
  trabajar. Cowork lee automaticamente `CLAUDE.md` y este `ONBOARDING.md`
  cuando seleccionas la carpeta como workspace, asi que tu Claude arranca
  con el mismo contexto que el de Ivan.

---

## 1. El proyecto en una pagina

**GrootFolio** es una plataforma multiplataforma (web + mobile) que centraliza
las inversiones personales de un usuario (criptomonedas, acciones, bonos,
divisas) y le ayuda a entender:

- el rendimiento global de su portafolio,
- la distribucion por tipo de activo y por moneda,
- su perfil como inversor (conservador / moderado / agresivo) a partir de un
  cuestionario.

**Es un Trabajo Final de Carrera (TFC) de Analisis de Sistemas**, desarrollado
por Ivan Otero y Franco Davicino. Eso significa que cada decision tecnica
debe poder defenderse con argumentos concretos en la monografia y la defensa
oral.

**Alcance del MVP:**

- CRUD de transacciones (compra/venta) sobre activos de un catalogo predefinido.
- Calculo de holdings (posicion agregada por activo) a partir de transacciones.
- Cache de precios consultando APIs externas (CoinGecko, Yahoo Finance / Alpha
  Vantage, Frankfurter / BCRA).
- Cuestionario de perfil de inversor con resultado y asignacion sugerida.
- Auth con JWT propio + refresh rotatorio.
- Web (SPA privada post-login) + Mobile (Expo).

**Fuera de alcance del MVP** (queda como v2):

- Ejecucion de operaciones reales o integracion con brokers.
- Chatbot. *(Reabierto a proposito en agosto de 2026 como modulo v2: ver
  `docs/adr/0004-chatbot-rag-gemini.md`. Esta implementado y desplegado.)*
- Analisis tecnico avanzado propio (se delega en widget de TradingView).
- Notificaciones push de alertas de precio.

## 2. Equipo y roles

- **Ivan Otero** (`@ivishooo`): product owner, dominio de inversiones, foco en
  UX y reglas de negocio. Lleva el grueso del codigo de web y mobile, y la
  conduccion del proyecto.
- **Franco Davicino** (`@Davichenco`): backend lead, experiencia en Node.js,
  capacitandose en AdonisJS. Apoya en frontend cuando hace falta. En esta
  etapa lidera la documentacion de la tesis.

## 3. Stack acordado (no se reabre sin justificacion)

Las decisiones de stack ya estan tomadas y documentadas en
**`docs/adr/0001-arquitectura.md`**. Resumen:

- **Monorepo** con pnpm workspaces (`apps/*` + `packages/*`).
- **Backend unico compartido** entre web y mobile: AdonisJS 6 + TypeScript +
  Lucid + PostgreSQL 16.
- **Web**: React 19 + Vite + TypeScript + TanStack Query + Tailwind CSS.
- **Mobile**: React Native 0.81 + Expo SDK 54 + React Navigation 7. Los
  graficos son componentes propios sobre `react-native-svg`: `victory-native`
  v41 exige react-native-skia y nunca llego a usarse, asi que se saco.
- **Shared**: tipos de dominio, schemas Zod y cliente HTTP en
  `packages/shared`. Design tokens en `packages/tokens`.
- **Auth**: JWT propio con refresh rotatorio.
- **Hosting**: Railway o Fly.io (api), Vercel (web), EAS Build (mobile).

Si queres proponer cambiar algo de esto, abri un nuevo ADR
(`docs/adr/0002-...`) con la justificacion y al menos dos alternativas
descartadas. No se modifica el ADR-0001.

## 4. Linea de tiempo: como llegamos hasta aca

1. **Definicion del producto y alcance** (Ivan + Franco): se acordo MVP, se
   relevaron pantallas y entidades, se identificaron fuentes de precios.
2. **Analisis arquitectonico** (Ivan + Claude): se compararon backend
   compartido vs dual; AdonisJS vs NestJS vs Express; PostgreSQL vs MySQL;
   Vite vs Next; Expo vs Flutter. El analisis completo quedo en el documento
   `GrootFolio - Analisis y Plan de Implementacion.docx` (raiz del repo).
3. **Diseno del sistema visual** (Ivan + Claude): se extrajeron design tokens
   del Figma (paleta naranja `#F97316`, neutrales, semanticos, light/dark,
   tipografia Inter, spacing, radios, sombras). Se publicaron en
   `packages/tokens` con preset Tailwind.
4. **Scaffolding del monorepo** (Claude): se creo la estructura
   `apps/api + apps/web + apps/mobile + packages/shared + packages/tokens`
   con stubs para todas las pantallas del Figma, modelo de datos inicial,
   rutas REST esqueleto, ESLint + Prettier + tsconfig base, scripts de
   bootstrap y de inicializacion git.
5. **Gobernanza y CI** (Ivan + Claude): se creo workflow de CI con jobs de
   lint+typecheck, tests y build; templates de PR y de issues; CODEOWNERS;
   Dependabot. Se documento el flujo de git (`docs/GIT_WORKFLOW.md`) y se
   creo el plan de implementacion para Claude Code (`docs/CLAUDE_CODE_PLAN.md`).
6. **Subida a GitHub y proteccion de ramas**: el repo se publico en
   `github.com/ivishooo/grootfolio-app`. Se configuraron Rulesets para
   `main` y `develop` (ver detalle en seccion 7).
7. **Fixes post-bootstrap**: se arreglaron problemas de scaffolding
   detectados al correr `pnpm install` y CI por primera vez (peer deps,
   `tsconfig` para el ApiClient, kernel.ts de Adonis, port de Postgres en
   5433 para no chocar con otros proyectos locales). CI quedo verde.
8. **Onboarding** (este documento): se creo `ONBOARDING.md` para que Franco
   tenga el mismo contexto que Ivan al abrir Cowork.
9. **Fases 1 a 6 del CLAUDE_CODE_PLAN** (mayo-junio): design system, navegacion,
   pantallas con datos mock, componentes reutilizables, integracion con la API
   real y QA. El MVP quedo funcionando de punta a punta en web y mobile.
10. **Backend completo** (mayo-julio): auth JWT con refresh rotatorio,
    transacciones, holdings, portfolio, precios con cache (CoinGecko, Yahoo,
    Frankfurter), FX, reportes y cuestionario de perfil.
11. **Despliegue** (julio): API en Railway, web en Vercel, iOS en TestFlight
    via EAS Build. Sentry y observabilidad configurados.
12. **Admin y Contenidos** (julio): panel de administracion con ABM de
    usuarios, suspensiones, audit log, biblioteca de contenidos y
    notificaciones.
13. **Chatbot RAG** (agosto, ADR-0004): el chatbot estaba fuera del alcance del
    MVP y se reabrio a proposito como modulo v2. pgvector sobre el Postgres
    existente + Google Gemini, con dominio acotado a la base de conocimiento
    del equipo. Fases F1 a F7 completas.
14. **Rediseno del asistente** (agosto): burbuja flotante en web y mobile,
    historial, fuentes citadas y feedback.

**Lo proximo es la monografia de tesis** (epic GF-235), que es el pendiente
grueso del proyecto.

## 5. Estado actual del codigo

### Que esta listo

**Todo el MVP, desplegado en las tres superficies.**

- **`apps/api`** (AdonisJS 6 + Lucid + Postgres 16 con pgvector): auth JWT con
  refresh rotatorio, CRUD de transacciones, holdings agregados con costeo
  promedio ponderado, portfolio valuado en USD, precios cacheados de CoinGecko
  / Yahoo / Frankfurter, FX historico, reportes (P&L realizado, ledger, balance
  mark-to-market), cuestionario de perfil, panel de admin, contenidos,
  notificaciones y el chatbot RAG.
- **`apps/web`** (React 19 + Vite + TanStack Query + Tailwind): dashboard,
  activos, reportes, contenidos, perfil, configuracion, panel de admin y el
  asistente como burbuja flotante.
- **`apps/mobile`** (React Native 0.81 + Expo SDK 54): paridad con la web en
  seis pestanas, mas las pantallas de admin y el asistente.
- **`packages/shared` y `packages/tokens`**: tipos, schemas Zod, utils, cliente
  HTTP y design tokens con preset Tailwind.
- **Base de conocimiento del chatbot**: 19 articulos versionados en
  `apps/api/database/kb/`, que se cargan con `node ace kb:seed --index`.
- **Despliegue**: API en Railway, web en Vercel
  (`grootfolio-app-web.vercel.app`), iOS en TestFlight.
- **CI**: lint + typecheck, tests y build, verdes en `develop`.

### Que falta

1. **La monografia de tesis** (GF-235 y sus siete sub-issues). Es el camino
   critico del proyecto.
2. **Billing en Google Cloud** para el chatbot: el free tier de Gemini corta en
   20 generaciones por dia, lo que bloquea la evaluacion definitiva del
   capitulo de pruebas y haria inviable una demo en vivo.
3. **Smoke test en iPhone** del ultimo build de TestFlight (GF-252, GF-259).
4. **Infraestructura y DevOps** (GF-177).

Las fases del `CLAUDE_CODE_PLAN.md` estan todas completas: ese documento queda
como registro historico de la planificacion, no como plan vigente.

### Donde mirar segun que quieras hacer

| Si vas a... | Leete |
|---|---|
| tocar el chatbot | `docs/PLAN_CHATBOT_RAG.md` + `docs/adr/0004-chatbot-rag-gemini.md` |
| escribir contenido de la KB | `apps/api/database/kb/README.md` |
| tocar el asistente en la UI | `docs/SPEC_ASISTENTE_CHAT.md` |
| desplegar | `docs/DEPLOY_BACKEND.md` y `docs/DEPLOY_WEB.md` |
| probar a mano | `docs/TESTING_MANUAL.md` |
| entender una decision de stack | `docs/adr/` |

## 6. Estado de la documentacion de tesis

### Que esta cubierto

- **Documento `GrootFolio - Analisis y Plan de Implementacion.docx`** (raiz
  del repo): cubre analisis arquitectonico completo, comparativa de stack,
  plan por sprints, modelo de datos. Funciona como capitulo "Arquitectura"
  de la monografia o como anexo tecnico.
- **`CLAUDE.md`**: contexto del producto, equipo, stack, glosario.
- **`docs/adr/0001-arquitectura.md`**: ADR formal con las decisiones de
  stack. Util para el capitulo de "Arquitectura" o "Decisiones de diseno".
- **`docs/GIT_WORKFLOW.md`**: flujo de git, conventional commits, Rulesets.
  Util para el capitulo de "Metodologia" o "Proceso de desarrollo".
- **`docs/CLAUDE_CODE_PLAN.md`**: plan de implementacion visual fase a fase.
  Util como anexo de planificacion.
- **`docs/FIGMA_REFERENCE.md`**: mapeo Figma a codigo. Util para el capitulo
  de "Implementacion" cuando se documente la capa visual.

### Que probablemente falta (a alinear con Ivan)

Estos son capitulos / secciones tipicos de un TFC de Analisis de Sistemas
que **todavia no estan escritos**:

- **Marco teorico**: estado del arte de plataformas de gestion de inversiones,
  literatura sobre perfilado de inversores, comparativa de competidores
  (Empiricus, eToro, Trading 212, Personal Capital, etc.).
- **Analisis del problema**: dolor del usuario, encuestas / entrevistas,
  requerimientos funcionales y no funcionales, casos de uso.
- **Modelado**: diagramas UML (casos de uso, clases, secuencia, despliegue).
  Algunos estan en el docx pero hay que ampliarlos o exportarlos como
  imagenes para la monografia.
- **Capitulo de implementacion**: se va llenando a medida que avanzan las
  fases del codigo.
- **Capitulo de pruebas**: estrategia de testing, cobertura, tipos de tests.
- **Capitulo de conclusiones y trabajo futuro**.
- **Manual de usuario**: con capturas de las pantallas finales.

**Antes de empezar a escribir cualquiera de estos, alinea con Ivan**: que
formato prefiere la facultad (Word vs LaTeX), si hay un template institucional,
si hay capitulos que ya se le entregaron al tutor, etc. No reescribas algo
que ya este aprobado.

## 7. Como trabajamos con Git

Detalle completo en **`docs/GIT_WORKFLOW.md`**. Resumen practico:

- **Ramas de larga vida**: `main` (release) y `develop` (integracion).
  Todo cambio entra primero a `develop` via PR, despues a `main` en releases.
- **Ramas de corta vida**: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`,
  `release/<version>`, `hotfix/<slug>`. Todas parten de `develop`.
- **Conventional commits**: `feat(web): ...`, `fix(api): ...`,
  `docs(tesis): ...`, etc.
- **Squash merge** preferido en `develop` (historial lineal).
- **Code Owners**: cada PR requiere review del owner del path tocado.
  El reparto esta en `.github/CODEOWNERS`.

### Importante: asimetria de aprobaciones (Rulesets activos)

Las protecciones se configuraron via **GitHub Rulesets** (no las branch
protection rules clasicas). Hay dos rulesets activos:

- **`Protect main`**: sin bypass. Para mergear a main hace falta CI verde +
  aprobacion del otro integrante. Sin excepciones.
- **`Protect develop`**: con bypass para `Repository admin` (Ivan, como
  owner del repo). Esto significa:
  - Los PRs de Ivan a `develop` se mergean con CI verde, sin aprobacion
    adicional.
  - Los PRs de Franco a `develop` siguen el flujo estandar y requieren la
    aprobacion de Ivan.

Esta asimetria es deliberada: refleja que Ivan es el product owner y
responsable principal del codebase, y evita que el proceso entorpezca el
ritmo cuando el desarrolla solo. Franco puede pedir review en sus PRs sin
problema; Ivan los va a mirar.

## 8. Como trabajar con Claude Cowork en este repo

### Setup

1. Cloná el repo (si todavia no lo hiciste): `git clone git@github.com:ivishooo/grootfolio-app.git`.
2. Abri Cowork en tu Mac.
3. Cuando te pida seleccionar una carpeta, elegi la del repo.
4. Cowork va a leer automaticamente `CLAUDE.md` y este `ONBOARDING.md` como
   parte del contexto del proyecto. Tu Claude arranca con la misma vision
   que el de Ivan.

### Convenciones que te conviene recordarle a Claude

- **Idioma**: castellano rioplatense, tecnico pero cercano. Sin emojis salvo
  que el tema lo amerite.
- **No reabrir decisiones tomadas**: el ADR-0001 esta cerrado. Si Claude te
  sugiere cambiar de stack, recordale que las decisiones estan tomadas.
- **No agregar librerias sin justificacion**: cualquier dependencia nueva en
  cualquier paquete pide un ADR. Esta acordado en CLAUDE.md.
- **Claude NO commitea por su cuenta**: vos sos quien decide cuando se hace
  un commit, en que rama, y con que mensaje. Claude redacta el commit, vos lo
  ejecutas.
- **Cuando trabajes en codigo**, pediles a Claude que respete el flujo de
  ramas: feature/<slug>, conventional commits, PR a develop.

### Para trabajar en documentacion de tesis

Si vas a escribir capitulos o secciones de la monografia:

- **Formato**: confirma con Ivan que pide la facultad. Si es Word (`.docx`),
  Cowork tiene la skill `docx` activada que hace documentos profesionales con
  TOC, headings, page numbers, etc. Decile a Claude "usa la skill docx" si
  detecta que vas a generar un Word.
- **Ubicacion**: los docs cortos (apuntes, drafts, snippets) van en
  `/docs/` como markdown. Los entregables formales (capitulos, monografia
  completa) van como `.docx` en la raiz del repo, con nombres claros tipo
  `GrootFolio - Capitulo X - Marco Teorico.docx`.
- **Coherencia**: leete el docx existente (`GrootFolio - Analisis y Plan de
  Implementacion.docx`) antes de escribir capitulos relacionados, asi
  manten coherencia de tono, vocabulario y estructura.
- **Citas y fuentes**: si la facultad pide formato APA o IEEE, contale a
  Claude el formato esperado y te ayuda a armar la bibliografia consistente.

## 9. Levantar el entorno local

Detalle en `README.md`. Resumen:

```bash
# 1. Asegurate de tener Node 20.11+ y pnpm 9
node --version
pnpm --version

# 2. Instalar pnpm si no lo tenes (usa Corepack)
corepack enable && corepack prepare pnpm@9.12.0 --activate

# 3. Bootstrap del proyecto
./scripts/bootstrap.sh

# 4. Levantar los tres servidores (en terminales separadas)
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

El bootstrap deja Postgres corriendo en `localhost:5433` (no 5432, para no
chocar con otros Postgres). Si tenes otro Postgres en 5433 tambien, podes
overridear con `PG_HOST_PORT=5434 ./scripts/bootstrap.sh`.

## 10. Que NO hacer (lecciones de la primera semana)

- **No usar `npm i` ni `yarn`** en este repo. Solo `pnpm install`. Cualquier
  otra cosa rompe los workspaces y te crea conflictos de lockfile. Si CI
  empieza a quejarse de cosas raras, lo primero a chequear es que no haya un
  `package-lock.json` colado.
- **No pushear directo a `develop` ni a `main`**. Aun sin Rulesets te lo
  rechazaria. Siempre via PR.
- **No tocar `pnpm-lock.yaml` a mano**. Si necesitas actualizar deps, modifica
  el `package.json` que corresponda y corre `pnpm install` para que se
  regenere el lock.
- **No modificar `packages/shared` o `packages/tokens` sin tener claro el
  blast radius**. Cualquier cambio impacta web + mobile + api. En el PR
  aclaralo en la descripcion.
- **No mergear a `main`** sin pasar por una rama `release/<version>` y sin
  aprobacion del otro integrante. Main es la rama de release, no de trabajo
  diario.

## 11. Preguntas abiertas / a alinear con Ivan

Cosas que todavia no decidimos formalmente y que mas vale que charles antes
de avanzar si te tocan:

- **ORM definitivo**: Lucid es el default por venir con AdonisJS, pero esta
  abierta la opcion de Prisma si Franco se siente mas comodo. Si lo cambia,
  va con ADR-0002.
- **Hosting de la api**: Railway vs Fly.io. Hay que probar ambos antes de
  decidir; la decision impacta en como se arma el pipeline de deploy.
- **Persistencia de tokens en web**: cookie httpOnly (mas seguro) vs
  localStorage (mas simple para el MVP). Por ahora se prioriza simplicidad
  pero hay que documentarlo en un ADR cuando se decida.
- **Formato de la tesis**: Word, LaTeX, Google Docs? Confirmar con la
  facultad y con Ivan antes de escribir capitulos largos.
- **Captura de UML / diagramas**: ¿usamos PlantUML, Mermaid, draw.io, o
  Lucidchart? Por ahora hay diagramas embebidos en el .docx pero hay que
  estandarizar para los proximos.

## 12. Anexos: donde esta cada cosa

| Que necesito                                | Donde lo encuentro                                       |
| ------------------------------------------- | -------------------------------------------------------- |
| Contexto del producto, equipo, stack        | `CLAUDE.md`                                              |
| Decisiones de arquitectura                  | `docs/adr/0001-arquitectura.md`                          |
| Flujo de git, ramas, conventional commits   | `docs/GIT_WORKFLOW.md`                                   |
| Plan de fases para la capa visual           | `docs/CLAUDE_CODE_PLAN.md`                               |
| Mapeo Figma -> archivos de codigo           | `docs/FIGMA_REFERENCE.md`                                |
| Analisis arquitectonico completo (tesis)    | `GrootFolio - Analisis y Plan de Implementacion.docx`    |
| Setup local y comandos                      | `README.md`                                              |
| Modelo de datos y migracion inicial         | `apps/api/database/migrations/0001_initial_schema.ts`    |
| Endpoints REST                              | `apps/api/start/routes.ts`                               |
| Tipos del dominio                           | `packages/shared/src/types/index.ts`                     |
| Schemas de validacion (Zod)                 | `packages/shared/src/schemas/index.ts`                   |
| Design tokens y temas                       | `packages/tokens/src/index.ts`                           |
| Pantallas web                               | `apps/web/src/features/*/`                               |
| Pantallas mobile                            | `apps/mobile/src/screens/`                               |
| Mocks de datos                              | `apps/web/src/mocks/portfolio.ts`                        |
| Configuracion de CI                         | `.github/workflows/ci.yml`                               |
| Reparto de Code Owners                      | `.github/CODEOWNERS`                                     |
| Templates de PR / Issues                    | `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/` |
| Scripts de bootstrap e init git             | `scripts/bootstrap.sh`, `scripts/init-git.sh`            |

---

## Cierre

Cualquier duda, pregunta abierta, o sospecha de que algo en este documento
quedo desactualizado, anotala en un issue del repo con tag `documentation`.
La idea es mantener este `ONBOARDING.md` como el documento vivo del estado
del proyecto: cuando alguien hace cambios estructurales (nueva fase cerrada,
nuevo ADR, nuevo paquete), actualiza la seccion correspondiente.

Bienvenido al proyecto.
