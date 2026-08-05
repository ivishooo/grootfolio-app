# ADR-0004: Chatbot de dominio acotado con RAG sobre Gemini

- **Estado:** Propuesto — 2026-08-05
- **Autores:** Ivan Otero, Franco Davicino
- **Reemplaza a:** -
- **Relacionado:** [ADR-0001](0001-arquitectura.md) (stack base), feature
  "Admin & Contenidos" (módulo de Contenidos ya en producción).

## Contexto

El CLAUDE.md del proyecto listaba el **chatbot como fuera de alcance del MVP**
("queda propuesto para v2"). Con el MVP cerrado y desplegado en las tres
superficies (Railway + Vercel + TestFlight), se decide incorporarlo como
módulo v2.

El objetivo del chatbot es **acotado a propósito**: debe resolver dudas sobre

1. **el uso de la aplicación**, y
2. **temas de inversiones que el equipo documente explícitamente**,

y **no** debe responder nada que caiga fuera de esa documentación. Un modelo de
lenguaje "suelto" responde de todo (y alucina), lo que es inaceptable en un
producto sobre finanzas personales: una afirmación inventada sobre inversiones
es un riesgo de producto y de reputación. Por lo tanto la arquitectura tiene
que **fundamentar (grounding)** cada respuesta en contenido propio y **negarse**
a responder cuando no hay respaldo documental.

Restricciones relevantes (heredadas de ADR-0001):

- Equipo de 2 personas con dedicación parcial.
- Stack fijado: AdonisJS 6 + Lucid + PostgreSQL 16 (backend), React 19 (web),
  React Native 0.81 + Expo SDK 54 (mobile), monorepo pnpm, `packages/shared`
  con Zod.
- Preferencia por no sumar infraestructura operable nueva.
- El proveedor de IA elegido por el equipo es **Google Gemini** (el equipo ya
  dispone de acceso; a confirmar si free tier o pay-as-you-go).

## Decisión

Incorporar un chatbot con patrón **RAG (Retrieval-Augmented Generation)**:

1. **Fuente de conocimiento: base de conocimiento (KB) dedicada** en markdown,
   redactada por administradores. Entidad nueva `KbArticle` (título + cuerpo
   markdown + estado draft/published). *No* se reutiliza `ContentItem` como
   fuente principal (ver "Alternativas descartadas").
2. **Vector store: extensión `pgvector` sobre el PostgreSQL existente.** Los
   fragmentos (chunks) de cada artículo y su embedding se guardan en la misma
   base. No se incorpora una base vectorial externa.
3. **Modelo de IA: Google Gemini**, vía el SDK oficial de Google Gen AI
   (`@google/genai`):
   - un modelo de **embeddings** (p. ej. `text-embedding-004` /
     `gemini-embedding-001`) para indexar y para consultar;
   - **Gemini Flash** (variante rápida y económica) para redactar la respuesta.
4. **Grounding estricto** como mecanismo central para acotar el bot (ver
   sección dedicada).
5. **Superficies: web y mobile**, reutilizando los patrones del feature Admin &
   Contenidos (panel de administración para la KB, provider de auth y
   `packages/shared` para tipos/validadores).

## Cómo se garantiza que el bot "solo responda lo documentado"

Ningún método es 100 % infalible, pero la combinación de capas reduce el
off-topic a un nivel aceptable y **es en sí misma un aporte de rigor para la
tesis** (se puede medir):

1. **Umbral de similitud (retrieval gate):** ante una pregunta, se recuperan
   los *k* fragmentos más similares. Si el mejor no supera un score mínimo
   (`RAG_MIN_SCORE`), **no se invoca al modelo generador**: se devuelve una
   respuesta fija de "no tengo información documentada sobre eso". Esta es la
   defensa más fuerte, porque corta antes de que el LLM pueda inventar.
2. **System prompt de grounding:** cuando sí hay contexto, se instruye al modelo
   a responder **únicamente** con la información provista, a declarar que no
   sabe si no está, y a no usar conocimiento externo.
3. **Citas obligatorias:** cada respuesta expone de qué artículo/sección salió,
   dando transparencia y trazabilidad.
4. **(Opcional, fase de tuning) verificador:** un segundo paso que evalúa si la
   respuesta está respaldada por el contexto y, si no, la descarta.

## Justificación

1. **`pgvector` no suma infraestructura operable.** Ya operamos PostgreSQL 16
   (Railway) y ya usamos extensiones (`uuid-ossp`). `pgvector` es una extensión
   soportada por Railway; evitamos administrar, versionar y pagar una base
   vectorial externa (Pinecone/Weaviate/Qdrant) para un volumen de documentos
   chico. Una sola fuente de verdad, un solo backup.
2. **Gemini cubre embeddings + generación con un solo proveedor y con free
   tier.** Reduce integraciones y permite construir y demostrar la tesis sin
   costo; el pay-as-you-go queda disponible para producción (más límites y sin
   uso de datos para entrenamiento).
3. **KB dedicada = control total del alcance.** Redactar los artículos en
   markdown da texto limpio y curado para indexar, que es exactamente lo que un
   RAG necesita. El equipo controla palabra por palabra qué puede responder el
   bot — alineado con el requisito de acotamiento.
4. **Reutiliza patrones ya probados.** El panel de administración, el audit
   log, la auth y `packages/shared` del feature Admin & Contenidos se extienden
   sin reinventar nada.

## Alternativas descartadas

- **Reutilizar `ContentItem` como fuente del RAG.** El módulo de Contenidos
  guarda metadatos + **archivos** (PDF vía `storage_key`) o **links**
  (`external_url`), no texto plano indexable. Alimentar el RAG desde ahí exige
  parsear PDFs y scrapear links (más ruido, más superficie de error). Se deja
  como fuente **secundaria opcional** a futuro (indexar `description`), no como
  base principal.
- **Base vectorial externa (Pinecone/Weaviate/Qdrant).** Mejor a gran escala,
  pero suma un servicio a operar y pagar sin beneficio para nuestro volumen.
- **LLM sin RAG con "prompt de sistema" que le prohíba salirse del tema.** No
  garantiza el acotamiento: el modelo igual conoce el mundo y puede responder
  fuera de la documentación. No cumple el requisito.
- **Fine-tuning de un modelo con nuestra documentación.** Caro, lento de
  iterar, y no resuelve la actualización incremental de la base (cada cambio
  reentrenaría). RAG permite editar un artículo y reindexar en segundos.
- **Otros proveedores (OpenAI, Anthropic).** Válidos técnicamente, pero el
  equipo ya eligió Gemini y dispone de acceso; cambiarlo no aporta al objetivo.

## Consecuencias

**Positivas**
- Respuestas fundamentadas y citables, acotadas a documentación propia.
- Base de conocimiento editable por administradores sin tocar código.
- Capítulo de tesis con sustancia: arquitectura RAG, embeddings, grounding y
  **evaluación medible** (preguntas dentro/fuera de alcance).

**Negativas / costos**
- Nuevas dependencias: extensión `pgvector` y SDK `@google/genai` en `apps/api`.
- Nueva variable de entorno secreta (`GEMINI_API_KEY`) a gestionar en Railway.
- Dependencia de un servicio externo (Gemini): latencia y límites de rate
  (especialmente en free tier durante demos).
- Riesgo residual de alucinación: se mitiga, no se elimina. Requiere una fase de
  evaluación/tuning y ser honestos sobre sus límites en la defensa.
- La calidad del bot es tan buena como la KB ("garbage in, garbage out"):
  redactar buena documentación es trabajo de contenido, no solo de código.

## Fuera de alcance (de este ADR / primera versión)

- Memoria conversacional de largo plazo, multi-idioma, entrada por voz.
- Fine-tuning.
- Acciones/tool-calling (que el bot ejecute operaciones en la app).
- Moderación avanzada de las preguntas del usuario.

## Plan de implementación

El detalle por fases (modelo de datos, endpoints, ingesta, retrieval, UI web y
mobile, evaluación) vive en [`docs/PLAN_CHATBOT_RAG.md`](../PLAN_CHATBOT_RAG.md).
