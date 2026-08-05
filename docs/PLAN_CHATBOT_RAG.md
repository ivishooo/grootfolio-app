# Plan de implementación — Chatbot RAG (v2)

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
| Modelos | Embeddings (`text-embedding-004`/`gemini-embedding-001`) + Gemini Flash |
| Superficies | Web y mobile |
| Grounding | Umbral de similitud + system prompt estricto + citas + fallback |

## A confirmar antes de F1

1. **Plan de Gemini**: free tier vs pay-as-you-go (Google AI Studio → API keys /
   Google Cloud → Billing). Define límites de rate y privacidad de datos.
2. **Modelo de embeddings disponible** y su **dimensión** (768 / 1536 / 3072) —
   fija el tipo de la columna `vector(N)`.
3. **Parámetros iniciales** de retrieval: `RAG_TOP_K` (p. ej. 4) y
   `RAG_MIN_SCORE` (umbral de similitud coseno; se calibra en F7).

---

## Fase F1 — Infraestructura y datos

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

## Fase F2 — KB: administración (backend)

**Objetivo:** CRUD de artículos de conocimiento para admins.

- `KbAdminController` bajo `/admin/kb` (auth + admin middleware):
  - `GET /admin/kb/articles` (lista + filtros por estado/búsqueda)
  - `POST /admin/kb/articles` (alta)
  - `GET /admin/kb/articles/:id`
  - `PATCH /admin/kb/articles/:id`
  - `DELETE /admin/kb/articles/:id`
  - `POST /admin/kb/articles/:id/publish`
- Validators VineJS + schemas Zod en `packages/shared`
  (`kbArticleInputSchema`, tipos `KbArticle`).
- Cada acción escribe en el **audit log** existente (`kb.create`, `kb.update`,
  `kb.publish`, `kb.delete`).
- Aún sin embeddings: publicar solo marca `status=published` (la indexación
  llega en F3).

**Entrega:** CRUD probado con `requests.http`.

---

## Fase F3 — Ingesta y embeddings

**Objetivo:** convertir artículos publicados en chunks vectorizados.

- `RagIngestService`:
  - **Chunking**: partir el markdown por encabezados/párrafos en fragmentos de
    ~500–800 tokens con solapamiento leve; preservar referencia a la sección.
  - **Embeddings**: generar el vector de cada chunk con el modelo de embeddings
    de Gemini (batch).
  - **Upsert**: al publicar/editar un artículo → borrar sus chunks previos y
    regenerarlos (idempotente).
- Hook o job: `POST /admin/kb/articles/:id/publish` dispara la reindexación.
- Command Ace `kb:reindex` para reindexar todo (mantenimiento / primer carga).
- Manejo de errores y rate limits (reintentos con backoff).

**Entrega:** publicar un artículo deja sus chunks + embeddings en la base;
`kb:reindex` reconstruye todo.

---

## Fase F4 — Retrieval + endpoint de chat + grounding

**Objetivo:** el núcleo del bot.

- `RagQueryService`:
  1. Embedding de la pregunta.
  2. Búsqueda por similitud en `kb_chunks` (`ORDER BY embedding <=> $q LIMIT
     top_k`), solo de artículos `published`.
  3. **Gate de umbral**: si el mejor score < `RAG_MIN_SCORE` → devolver el
     fallback fijo **sin llamar al generador**.
  4. Si pasa: armar prompt (contexto = chunks recuperados) + system prompt de
     grounding estricto → **Gemini Flash** → respuesta.
  5. Adjuntar **citas** (artículos/secciones de origen) y `grounded: true`.
- `ChatController`: `POST /chat` (auth) → `{ answer, sources[], grounded }`.
  Acepta historial corto opcional (sin memoria de largo plazo).
- Config: `RAG_TOP_K`, `RAG_MIN_SCORE`, modelos, todo por env.
- `requests.http`: casos in-scope (responde con cita) y out-of-scope (rechaza).

**Entrega:** `/chat` funcional y acotado, verificado end-to-end.

---

## Fase F5 — Web (chat + administración de la KB)

- **Usuario**: pantalla/panel de chat (burbuja flotante o vista dedicada) con
  historial de la sesión, estado de carga, y render de **citas** con enlace al
  artículo. Muestra claramente cuando el bot no tiene información.
- **Admin**: sección "Base de conocimiento" en el panel — lista de artículos,
  editor markdown (crear/editar), publicar/despublicar, estado de indexación.
- Hooks en `queries.ts` (`useChat`, `useKbArticles`, `useCreateKbArticle`, …).

**Entrega:** flujo completo en web, verificado con Playwright.

---

## Fase F6 — Mobile (espejo de F5)

- Pantalla de chat (React Native) con el mismo contrato.
- Gestión de la KB para admins (lista + editor), reutilizando `BottomSheet` y
  los patrones de `AdminUsersScreen`/`AdminContentScreen`.
- Hooks equivalentes en el `queries.ts` de mobile.

**Entrega:** paridad mobile; entra en el próximo build de TestFlight.

---

## Fase F7 — Evaluación y tuning (capítulo de tesis)

**Objetivo:** medir y calibrar el acotamiento — el aporte académico.

- Set de evaluación: N preguntas **in-scope** (deben responderse con cita) y N
  **out-of-scope** (deben rechazarse).
- Métricas: tasa de respuesta correcta in-scope, tasa de rechazo correcto
  out-of-scope, precisión de las citas.
- Calibrar `RAG_MIN_SCORE` y `RAG_TOP_K`; ajustar el system prompt.
- (Opcional) verificador de respaldo como capa extra.
- Documento de resultados para la tesis.

**Entrega:** parámetros calibrados + informe de evaluación.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alucinación residual | Umbral + prompt + citas + verificador; evaluación en F7 |
| Rate limits (free tier) en demo | Confirmar plan; considerar pay-as-you-go para la defensa |
| Privacidad de prompts (free tier) | Evaluar pay-as-you-go; las preguntas son de bajo riesgo |
| KB pobre → respuestas pobres | Curaduría de contenido; el bot es tan bueno como la KB |
| Dimensión de embeddings mal fijada | Confirmar modelo/dim en "A confirmar antes de F1" |

## Estimación

7 fases cortas. F1–F4 (backend) son el grueso; F5–F6 (UI) siguen patrones
existentes; F7 es análisis. Sin fechas comprometidas: el pendiente crítico del
proyecto sigue siendo la monografía de tesis (Epic 6).
