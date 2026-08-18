# Base de conocimiento del asistente

Los artículos que alimentan al chatbot (ADR-0004) viven acá como markdown
versionado, no sólo en la base de datos. Así el contenido se revisa en un PR, la
evaluación es reproducible en cualquier entorno y la carga en producción es un
comando y no un trámite manual.

## Agregar o editar un artículo

1. Creá un `.md` en esta carpeta con el frontmatter mínimo:

   ```markdown
   ---
   title: Qué es un bono
   slug: que-es-un-bono
   status: published
   ---

   Un **bono** es un préstamo. …
   ```

   `status` puede ser `published` (alimenta al bot) o `draft` (no se indexa).
   El `slug` es la clave del upsert: cambiarlo crea un artículo nuevo.

2. Cargalo e indexalo:

   ```bash
   node ace kb:seed --index
   ```

   Sólo se reindexa lo que cambió. `--force` reindexa todo lo publicado y
   `--slug=<slug>` acota a un artículo.

3. Si tocaste contenido que el set de evaluación mide, corré la evaluación:

   ```bash
   node ace kb:eval --retrieval --sweep
   ```

## Cómo escribir para que el bot responda bien

- **Encabezados `##` por tema.** El chunker corta por encabezado y la cita al
  usuario dice "Artículo › sección", así que un encabezado claro es literalmente
  la referencia que va a ver.
- **Usá el vocabulario del usuario**, no el del código: "cargar una operación"
  antes que "persistir una transacción". La búsqueda es por similitud semántica
  con la pregunta.
- **Un tema por artículo.** Si dos artículos explican lo mismo, compiten entre
  sí y la cita se vuelve arbitraria.
- **Verificá contra el código** antes de describir cómo funciona la aplicación.
  El bot cita lo que digas acá: un artículo desactualizado es una respuesta
  equivocada con apariencia de fuente.
- **Nada de consejo financiero.** El alcance es uso de la aplicación y conceptos
  de inversión. Documentar recomendaciones haría que el bot las repita.

## Relación con el set de evaluación

`tests/eval/kb_eval_set.json` espera que ciertas preguntas citen un `slug`
concreto. Si renombrás un slug que el set menciona, la evaluación lo va a
reportar como artículo faltante: actualizá los dos juntos.
