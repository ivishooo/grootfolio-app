# Plan de implementación — Chatbot RAG (v3)

> Decisión de arquitectura: [ADR-0004](adr/0004-chatbot-rag-gemini.md).
> Alcance: chatbot de dominio **acotado** que responde solo sobre (a) uso de la
> app y (b) temas de inversión documentados por el equipo en una **base de
> conocimiento (KB) dedicada** en markdown. Superficies: **web y mobile**.

## Reglas de trabajo

- Rama por fase desde `develop`, conventional commits, squash merge, PR con CI
  verde. `pnpm typecheck && pnpm lint` antes de pushear. **Un commit por fase.**
- **Parar después de cada fase** para revisión (igual que el feature Admin).
- Este feature **cambia el contrato de la API** (nuevos endpoints) → se
  actualiza `packages/shared` y `apps/api/requests.http`.

## Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Fuente de conocimiento | KB dedicada (`kb_articles`, markdown) |
| Vector store | `pgvector` sobre el Postgres existente |
| Proveedor IA | Google Gemini (SDK `@google/genai`) |
| Modelos | `gemini-embedding-001` a 768 dims + `gemini-3.6-flash` |
| Superficies | Web y mobile |
| Grounding | Umbral de similitud + system prompt estricto + citas + fallback |

## Decisiones cerradas antes de F3 (2026-08-11)

1. **Modelo de embeddings: `gemini-embedding-001` truncado a 768 dimensiones**
   (vía Matryoshka / `outputDimensionality`). Mantiene la columna `vector(768)`
   creada en F1 — sin migración de la columna ni del índice — y la pérdida de
   calidad frente a 3072 es marginal.
   - **Verificado contra la API** (2026-08-11): nativo 3072 con norma L2 = 1;
     truncado a 768 la norma cae a ≈ 0.60, es decir **el truncado no viene
     re-normalizado**.
   - Con `<=>` y `vector_cosine_ops` eso **no altera el ranking ni el score**
     (la distancia coseno divide por las normas), así que re-normalizar no es
     obligatorio. Se hace igual al indexar, por dos razones: deja los vectores
     comparables entre sí y habilita cambiar a `<#>` (inner product, más
     barato) sin recalcular nada.
   - **Usar `taskType`**: `RETRIEVAL_DOCUMENT` al indexar chunks y
     `RETRIEVAL_QUERY` al embeber la pregunta. Medido, ensancha el margen entre
     in-scope y out-of-scope de ~0.02 a ~0.06 (ver "Sonda de retrieval").
2. **Las conversaciones se persisten** (tablas `chat_conversations` y
   `chat_messages`). Motivos: material real para el capítulo de evaluación,
   habilita el rate limit por usuario casi gratis, y permite mostrar el
   historial al reabrir el chat.
3. **Indexación sincrónica al publicar, con estado persistido**
   (`kb_articles.indexed_at` / `indexing_error`). La KB es de decenas de
   artículos: no justifica un job en background, y el estado sirve para mostrar
   "indexado ✓" o el error en el panel de admin.
4. **Parámetros iniciales de retrieval**: `RAG_TOP_K=4` y `RAG_MIN_SCORE=0.63`
   (similitud coseno). Se calibran con datos en F7 — ver las dos sondas de abajo.
   **Calibrado en F7 (2026-08-18): `RAG_MIN_SCORE=0.68`**, con la KB completa.

### Sonda 1 — embeddings sueltos (2026-08-11)

Medición real contra `gemini-embedding-001` a 768 dims, con 2 chunks de ejemplo
y 6 preguntas. **No es una calibración** (eso es F7 con la KB completa): es lo
mínimo para elegir un punto de partida sensato.

| | sin `taskType` | con `taskType` |
|---|---|---|
| Peor pregunta **in-scope** | 0.6153 | **0.6599** |
| Mejor pregunta **out-of-scope** | 0.5981 | 0.5983 |
| **Margen** | 0.017 | **0.062** |

Conclusiones:

- `taskType` mejora el caso difícil sin acercar los out-of-scope → **se usa**.
- `RAG_MIN_SCORE=0.65` dejaba una pregunta legítima a 0.01 del corte.
- El out-of-scope más alto (0.5983) fue *"¿me conviene comprar Bitcoin ahora?"*:
  temáticamente cercano a la KB pero pide consejo financiero, que está fuera de
  alcance.

### Sonda 2 — pipeline completo de F3 (2026-08-11)

Ya con el pipeline real: artículo publicado por la API, chunkeado, vectorizado y
recuperado por similitud desde `kb_chunks` (3 fragmentos).

| Pregunta | Mejor score | Fragmento recuperado |
|---|---|---|
| ¿Cómo cargo una transacción? | 0.7694 | Cargar una transacción ✓ |
| ¿Cómo borro una operación? | 0.7348 | Editar o borrar ✓ |
| ¿Qué tipo de cambio usan para el costo? | 0.6969 | Cómo se valúa en dólares ✓ |
| ¿Quién ganó el mundial 2022? | 0.5106 | — (rechazar) |
| **¿Me conviene comprar Bitcoin ahora?** | **0.6020** | — (rechazar) |

El retrieval acierta el fragmento correcto en las tres preguntas legítimas. Pero
**"¿me conviene comprar Bitcoin ahora?" volvió a quedar arriba de todos los
demás out-of-scope, en 0.6020: por encima del umbral 0.60 que se había fijado.**
Es decir, con 0.60 el gate la dejaba pasar.

Por eso `RAG_MIN_SCORE` arranca en **0.63**, que equidista de los dos peores
casos medidos (peor in-scope 0.6599, peor out-of-scope 0.6020). Es un punto de
partida sobre 8 preguntas, no una calibración: **F7 lo fija con el set completo.**

Lo que estas dos sondas dejan claro, y es material de tesis: hay preguntas
out-of-scope que **ningún umbral va a separar**, porque son temáticamente
idénticas a la KB y sólo difieren en que piden consejo financiero. Para ésas la
única defensa es el system prompt de grounding de F4.

### Sonda 3 — el bot completo (2026-08-11, F4)

Con `/chat` andando sobre una KB de 4 artículos (9 fragmentos), la doble barrera
quedó confirmada en funcionamiento:

| Pregunta | Score | Quién la resolvió | `grounded` |
|---|---|---|---|
| ¿Cómo cargo una transacción? | 0.786 | respondió con citas | `true` |
| ¿Qué es el P&L no realizado? | 0.815 | respondió con citas | `true` |
| ¿Qué perfiles de inversor hay? | 0.787 | respondió con citas | `true` |
| ¿Me conviene comprar Bitcoin ahora? | < 0.63 | **gate de umbral** | `false` |
| ¿Cuánto va a valer el dólar el mes que viene? | 0.647 | **system prompt** | `false` |
| ¿Cuánto tengo invertido en mi cartera? | 0.700 | **system prompt** | `false` |

**Dos de las tres preguntas fuera de alcance pasaron el umbral** y las atajó el
prompt — exactamente el escenario que anticipaban las sondas 1 y 2. El umbral
solo habría dejado pasar ambas.

De acá salió también una corrección de contrato: al principio esas respuestas
volvían con `grounded: true` y citas, porque el umbral había pasado. Se agregó
**salida estructurada** (`answer` + `answeredFromContext`): el modelo declara si
usó el contexto, y si declinó no se muestran fuentes. Mostrar citas debajo de un
"no puedo responder eso" es peor que no mostrar ninguna.

## Pendiente de confirmar

- **Plan de Gemini para la API.** La suscripción **Google AI Pro no habilita el
  acceso programático**: la API va por una API key de Google AI Studio, con su
  propio free tier y su propio pago según si el proyecto de Google Cloud tiene
  billing habilitado. Hay que verificar en *aistudio.google.com → Get API key*
  si el proyecto figura como free o con billing activo.
  Criterio: desarrollar en free está bien; **habilitar billing antes de la
  defensa** para no arriesgar la demo en vivo por rate limit (y por la
  privacidad de los prompts, que en los tiers gratuitos suelen poder usarse
  para mejorar el producto).
- **UX del chat** (se define antes de F5, recomendación en las fases F5/F6).
- **Renderer de markdown en las respuestas** (dependencia nueva, ver F5/F6).

---

## Fase F1 — Infraestructura y datos ✅ (PR #136, en `develop`)

**Objetivo:** dejar la base lista, sin lógica de IA aún.

- Migración: `CREATE EXTENSION IF NOT EXISTS vector`.
- Tablas:
  - `kb_articles`: `id`, `title`, `slug` (único), `body` (text, markdown),
    `status` (`draft`|`published`), `created_at`, `updated_at`, `published_at`.
  - `kb_chunks`: `id`, `article_id` (FK → `kb_articles`, `ON DELETE CASCADE`),
    `ord` (int), `content` (text), `embedding` (`vector(N)`), `token_count`.
    Índice vectorial (`hnsw` o `ivfflat`, distancia coseno) sobre `embedding`.
- Modelos Lucid `KbArticle` y `KbChunk` (+ relación hasMany/belongsTo).
- Env nuevas (documentadas en `.env.example`): `GEMINI_API_KEY`,
  `GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL`, `RAG_TOP_K`, `RAG_MIN_SCORE`.
  Validadas en `start/env.ts` (la API key **opcional** para no romper arranques
  sin IA; el chat responde "no disponible" si falta).
- Dependencia: `@google/genai` en `apps/api`.

**Entrega:** migración aplicada local, modelos, sin endpoints todavía.

---

## Fase F2 — KB: administración (backend) ✅ (PR #137, en revisión)

**Objetivo:** CRUD de artículos de conocimiento para admins.

- `KbAdminController` bajo `/admin/kb` (auth + admin middleware):
  - `GET /admin/kb/articles` (lista + filtros por estado/búsqueda; los totales
    son **globales**, no del resultado filtrado)
  - `POST /admin/kb/articles` (alta)
  - `GET /admin/kb/articles/:id`
  - `PATCH /admin/kb/articles/:id`
  - `DELETE /admin/kb/articles/:id`
  - `POST /admin/kb/articles/:id/publish`
  - `POST /admin/kb/articles/:id/unpublish` *(agregado sobre el plan original:
    F5 pide publicar/despublicar desde el panel)*
- Validators VineJS + schemas Zod en `packages/shared`
  (`createKbArticleInputSchema`, `updateKbArticleInputSchema`, tipos
  `KbArticle`, `KbArticleListItem`, `KbStats`).
- Cada acción escribe en el **audit log** existente (`kb.create`, `kb.update`,
  `kb.publish`, `kb.unpublish`, `kb.delete`).
- El listado no manda el markdown completo: devuelve `excerpt` en texto plano y
  `bodyLength`. `chunksCount`/`indexed` ya viajan en el contrato (0/`false`
  hasta F3) para que F5 muestre el estado de indexación sin cambiarlo después.
- Aún sin embeddings: publicar solo marca `status=published` (la indexación
  llega en F3).

**Entrega:** CRUD probado con `requests.http` (casos KB1–KB12).

---

## Fase F3 — Ingesta y embeddings ✅ (PR #139, en `develop`)

**Objetivo:** convertir artículos publicados en chunks vectorizados.

- **Migración `0009`** (lo que el esquema de F1 no previó):
  - `kb_chunks.heading` — sección del artículo a la que pertenece el fragmento.
    Necesaria para que las citas digan "Artículo › sección" y no solo el
    artículo.
  - `kb_articles.indexed_at` y `kb_articles.indexing_error` — estado de
    indexación (decisión 3).
  - La columna `embedding` **no cambia**: sigue en `vector(768)` (decisión 1).
- `services/kb/gemini_client.ts`: wrapper del SDK `@google/genai`, init
  perezosa, error tipado si falta la API key, único punto de configuración de
  modelos.
- `services/kb/chunker.ts`: partir el markdown por encabezados y después por
  párrafos, ~500–800 tokens con solapamiento leve, arrastrando el `heading`.
  **Lógica pura → unit tests sin red.**
- `services/kb/rag_ingest_service.ts` (`reindexArticle`):
  - **Embeddings**: en batch, con `outputDimensionality: 768`,
    `taskType: 'RETRIEVAL_DOCUMENT'` y re-normalización del vector (ver
    decisión 1).
  - **Upsert**: borrar chunks previos y regenerarlos (idempotente).
  - Reintentos con backoff para los 429 de rate limit; el error se guarda en
    `indexing_error`.
- Enganche en `KbAdminController`: `publish` indexa, `unpublish`/`destroy`
  borran chunks, y editar el `body` de un artículo publicado lo reindexa.
- Command Ace `kb:reindex` para reindexar todo (mantenimiento / primera carga /
  cambio de modelo de embeddings), siguiendo el patrón de los commands ya
  existentes (`prices_refresh`, `suspensions_sweep`).

**Entrega:** publicar un artículo deja sus chunks + embeddings en la base;
`kb:reindex` reconstruye todo y es idempotente (correrlo dos veces da el mismo
resultado); despublicar no deja chunks huérfanos.

---

## Fase F4 — Retrieval + endpoint de chat + grounding ✅ (PR #140, en `develop`)

**Objetivo:** el núcleo del bot.

- `RagQueryService`:
  1. Embedding de la pregunta, con `taskType: 'RETRIEVAL_QUERY'`.
  2. Búsqueda por similitud en `kb_chunks` (`ORDER BY embedding <=> $q LIMIT
     top_k`), solo de artículos `published`.
  3. **Gate de umbral**: si el mejor score < `RAG_MIN_SCORE` → devolver el
     fallback fijo **sin llamar al generador**.
  4. Si pasa: armar prompt (contexto = chunks recuperados) + system prompt de
     grounding estricto → **Gemini Flash** → respuesta.
  5. Adjuntar **citas** (artículo + `heading` de origen) y `grounded: true`.

  ⚠️ El operador `<=>` devuelve **distancia** coseno, no similitud: el gate
  compara contra `1 - distancia`.
- **Migración `0010`**: `chat_conversations` y `chat_messages` (decisión 2).
- `services/kb/prompts.ts`: el system prompt de grounding estricto en un archivo
  aparte y versionado — va a cambiar varias veces en F7 y su evolución es
  material de tesis.
- `ChatController`: `POST /chat` (auth) → `{ answer, sources[], grounded }`.
  Acepta historial corto (últimos ~4 mensajes; sin memoria de largo plazo en el
  prompt aunque la conversación quede guardada).
- **Rate limit por usuario/hora**, contando filas en `chat_messages`.
- Config: `RAG_TOP_K`, `RAG_MIN_SCORE`, modelos, todo por env. Si falta
  `GEMINI_API_KEY` el endpoint responde "IA no disponible" sin romper el resto.
- `requests.http`: casos in-scope (responde con cita), out-of-scope (rechaza) y
  sin API key configurada.

**Entrega:** `/chat` funcional y acotado, verificado end-to-end **por HTTP antes
de tocar UI** (una pregunta documentada responde con cita; una fuera de alcance
se rechaza sin llegar a llamar al generador).

---

## Fase F5 — Web (chat + administración de la KB) ✅ (PR #141, en `develop`)

> **Rediseño en curso**: la interfaz del asistente se está rehaciendo según
> [`SPEC_ASISTENTE_CHAT.md`](SPEC_ASISTENTE_CHAT.md), con la referencia visual en
> `design-reference/screens/Asistente GrootFolio.dc.html`.

- **Usuario**: `features/chat/ChatWidget.tsx` — **burbuja flotante** presente en
  toda la app (recomendado sobre la vista dedicada: el bot resuelve dudas
  *mientras* se usa la app). Historial de la sesión, estado de carga, **citas
  como enlaces al artículo**, y un vacío claro y honesto cuando el bot no tiene
  información.
- **Admin**: `features/admin/AdminKbPage.tsx` + ruta `/admin/kb` bajo
  `RequireAdmin` (junto a `/admin/users` y `/admin/content`) — lista con filtros
  y totales, editor markdown con preview, publicar/despublicar y **estado de
  indexación** (indexado ✓ / error / sin indexar).
- Hooks en `queries.ts`: `useKbArticles`, `useKbArticle`, `useCreateKbArticle`,
  `useUpdateKbArticle`, `useDeleteKbArticle`, `usePublishKbArticle`,
  `useUnpublishKbArticle`, `useSendChatMessage`.
- **Sin dependencia nueva**: se resolvió con un componente `Markdown` propio
  (~190 líneas) que cubre encabezados, párrafos, listas, código, negrita,
  itálica y links — que es todo lo que usan la KB y el bot (al que el system
  prompt ya le pide texto simple). Si en algún momento hace falta markdown
  completo, se reemplaza ese único componente por `react-markdown`.

**Entrega:** flujo completo en web, verificado con Playwright.

---

## Fase F6 — Mobile (espejo de F5) ✅ (PR #142, en `develop`)

- `ChatScreen` en el `RootNavigator`, con entrada desde un **botón en el
  `AppHeader`** (al lado de la campanita). No se agrega un séptimo tab: el
  `TabNavigator` ya tiene seis y Notificaciones ya resuelve así su acceso.
- `AdminKbScreen` reutilizando `BottomSheet` y los patrones de
  `AdminUsersScreen`/`AdminContentScreen`. **Simplificación propuesta**: en
  mobile el admin sólo lista, publica/despublica y borra; la redacción del
  markdown queda en web (escribir artículos largos en un teléfono es incómodo).
- Hooks equivalentes en el `queries.ts` de mobile.
- **Sin librería de markdown en RN** (las disponibles son de calidad despareja):
  formateo mínimo propio, o pedirle al bot respuestas en texto plano.

**Entrega:** paridad mobile; entra en el próximo build de TestFlight
(enlaza con GF-252 / GF-259).

---

## Fase F7 — Evaluación y tuning (capítulo de tesis) ✅ (PR #143 + KB completa)

**Objetivo:** medir y calibrar el acotamiento — el aporte académico.

- **Set de evaluación** en `apps/api/tests/eval/kb_eval_set.json`: 30 preguntas
  in-scope (con el artículo que deberían citar) y 26 out-of-scope agrupadas en
  cinco familias (`off_topic`, `advice`, `prediction`, `personal_data`,
  `injection`). Escrito antes de mirar resultados.
- **Command `kb:eval`**: corre el set y reporta tasa de respuesta in-scope,
  precisión de citas, rechazo out-of-scope global y por familia, y el detalle de
  cada fallo. `--retrieval` mide sólo la primera barrera (gratis y rápido);
  `--sweep` agrega el barrido de umbrales; `--json` guarda el detalle.
- **Metodología y resultados** en [`EVALUACION_CHATBOT.md`](EVALUACION_CHATBOT.md).
- Ajuste del system prompt con los fallos que aparezcan, re-corriendo el set en
  cada iteración.
- (Opcional) verificador de respaldo como capa extra.

**Entrega:** parámetros calibrados + informe de evaluación.

**Estado (2026-08-18):** hecha, con un bloqueo acotado. Con los 19 artículos de
la KB cargados, el retrieval acierta el artículo correcto en **30/30** preguntas
in-scope y el umbral se recalibró de **0,63 a 0,68** (rechazo out-of-scope del
30,8 % al 69,2 %, acierto global 85,7 %). Las 8 preguntas que atraviesan el
umbral se verificaron contra el generador y el system prompt las frenó a todas.
Lo que falta es la corrida **completa** de las 56 preguntas contra el pipeline
entero, que necesita billing (free tier: 20 generaciones/día). Detalle y
metodología en [`EVALUACION_CHATBOT.md`](EVALUACION_CHATBOT.md).

---

## Fase F8 — QA y cierre

Espejo del F8 del feature Admin/Contenidos.

- Unit tests del chunker y del gate de umbral; E2E del flujo de chat y del panel
  de KB.
- Repaso de estados vacíos, errores de red, IA caída y sesión expirada en ambas
  superficies.

---

## Fase F9 — Despliegue

- `GEMINI_API_KEY` y envs de RAG en **Railway**; las migraciones `0009`/`0010`
  corren solas en el Pre-Deploy.
- **Cargar la KB real en producción**: `node ace kb:seed --index` contra prod
  (reemplaza los 3 artículos de prueba y carga los 19 definitivos). `kb:reindex`
  queda para mantenimiento y cambios de modelo de embeddings.
- Deploy web (Vercel, automático) + build EAS y subida a **TestFlight**
  (GF-252 / GF-259).
- Smoke test del bot en las tres superficies contra prod.

---

## Trabajo paralelo — contenido de la KB (camino crítico)

**No es código, y es lo que determina si el bot sirve.** F7 no tiene sentido con
una KB vacía, así que la redacción arranca **en paralelo a F3/F4**, no después.

> **Hecho (2026-08-18).** La KB son **19 artículos** versionados como markdown en
> `apps/api/database/kb/`, con frontmatter (`title`, `slug`, `status`), que se
> cargan e indexan con **`node ace kb:seed --index`**. Vivir en el repo y no sólo
> en la base tiene tres consecuencias que importan: el contenido se revisa en un
> PR, la evaluación es reproducible en cualquier entorno, y la carga en
> producción deja de ser un trámite manual. El upsert es por `slug` y no borra lo
> que un admin haya cargado desde el panel.
>
> Cubre los 13 artículos que exige el set de evaluación más seis de contexto
> (catálogo de activos, precios y cotizaciones, cuenta y perfil, biblioteca de
> contenidos, divisas y el propio asistente). Todo lo que describe el
> comportamiento de la aplicación se verificó **contra el código**, no contra el
> plan: el criterio de FX del dashboard frente al de los reportes, el costeo
> promedio ponderado, los bonos sin cotización, los tipos de activo del catálogo.

Cobertura mínima sugerida (~18 artículos):

- **Uso de la app (~8):** cargar una transacción, editarla/borrarla, cómo se
  calcula el P&L, cómo se valúa en USD y qué FX se usa, qué es un holding, cómo
  leer el dashboard, los reportes, el cuestionario de perfil.
- **Inversiones (~10):** qué es una acción / un bono / un ETF / una cripto / una
  divisa / un CEDEAR, diversificación, riesgo vs retorno, los tres perfiles de
  inversor, P&L realizado vs no realizado.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alucinación residual | Umbral + prompt + citas + verificador; evaluación en F7 |
| Rate limits (free tier) en demo | Verificar el tier real de la API key; habilitar billing antes de la defensa |
| Privacidad de prompts (free tier) | Ídem; las preguntas son de bajo riesgo |
| KB pobre → respuestas pobres | ✅ Resuelto: 19 artículos versionados en `database/kb/` |
| Margen in/out-scope estrecho (~0.06) | Medido en F7 con la KB completa: las medianas separan (0,78 vs 0,66) pero los extremos se solapan. Umbral 0,68 + prompt de grounding como segunda barrera |
| KB completa demasiado tarde → F7 apretada | Arrancar la redacción ya, no al final |

## Estimación

9 fases. F3–F4 (backend con IA) son el grueso y el mayor riesgo técnico; F5–F6
(UI) siguen patrones existentes y pueden repartirse entre los dos integrantes;
F7 es análisis. Sin fechas comprometidas: el pendiente crítico del proyecto
sigue siendo la monografía de tesis (Epic 6), y el chatbot alimenta los
capítulos de implementación (GF-239), pruebas (GF-240) y el manual de usuario
(GF-242).
