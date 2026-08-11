/**
 * Chunking de artículos markdown de la KB (F3, ADR-0004).
 *
 * Estrategia: cortar primero por encabezados (un chunk nunca cruza secciones,
 * así la cita puede nombrar la sección de origen) y, dentro de cada sección,
 * agrupar párrafos hasta el tamaño objetivo. Los bloques de código y las tablas
 * se tratan como unidades indivisibles.
 *
 * Lógica pura y determinista, sin red ni base: es la parte del pipeline que se
 * puede testear de verdad.
 */

/** Aproximación de tokens por caracteres. Alcanza para dimensionar los cortes. */
const CHARS_PER_TOKEN = 4

const TARGET_TOKENS = 600
const MAX_TOKENS = 800
/** Debajo de esto, un chunk se fusiona con el siguiente en vez de quedar suelto. */
const MIN_TOKENS = 60
/** Solapamiento leve: se arrastra el último párrafo si no supera este tamaño. */
const OVERLAP_MAX_TOKENS = 100
/** Límite de la columna `kb_chunks.heading`. */
const MAX_HEADING_LENGTH = 300

export interface KbChunkDraft {
  ord: number
  content: string
  heading: string | null
  tokenCount: number
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / CHARS_PER_TOKEN)
}

interface Section {
  heading: string | null
  blocks: string[]
}

/**
 * Parte el markdown en secciones por encabezado. El `heading` es la ruta
 * jerárquica ("Cargar transacciones › Compra"), que da mejores citas que el
 * encabezado suelto. Ignora los `#` que estén dentro de un bloque de código.
 */
function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split('\n')
  const sections: Section[] = []
  /** Encabezado vigente por nivel (1..6), para reconstruir la ruta. */
  const path: (string | null)[] = new Array(7).fill(null)
  let current: Section = { heading: null, blocks: [] }
  let buffer: string[] = []
  let inFence = false

  const flushBlock = () => {
    const block = buffer.join('\n').trim()
    if (block) current.blocks.push(block)
    buffer = []
  }

  const flushSection = () => {
    flushBlock()
    if (current.blocks.length > 0) sections.push(current)
  }

  for (const line of lines) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence
      buffer.push(line)
      continue
    }

    const heading = inFence ? null : line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      flushSection()
      const [, hashes = '', text = ''] = heading
      const level = hashes.length
      path[level] = text.trim()
      for (let deeper = level + 1; deeper <= 6; deeper++) path[deeper] = null
      current = { heading: buildHeadingPath(path), blocks: [] }
      continue
    }

    // Línea en blanco fuera de un fence = fin de párrafo.
    if (!inFence && line.trim() === '') {
      flushBlock()
      continue
    }
    buffer.push(line)
  }
  flushSection()

  return sections
}

function buildHeadingPath(path: (string | null)[]): string {
  const parts = path.filter((p): p is string => !!p)
  const joined = parts.join(' › ')
  return joined.length > MAX_HEADING_LENGTH ? joined.slice(-MAX_HEADING_LENGTH) : joined
}

/**
 * Parte un bloque que por sí solo excede `MAX_TOKENS`. Corta por oraciones; si
 * una oración tampoco entra (texto sin puntuación, un bloque de código largo),
 * corta a lo bruto por longitud para no devolver nada más grande que el máximo.
 */
function splitOversizedBlock(block: string): string[] {
  const maxChars = MAX_TOKENS * CHARS_PER_TOKEN
  const sentences = block.match(/[^.!?\n]+(?:[.!?]+|\n|$)/g) ?? [block]

  const parts: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if (current && estimateTokens(current + sentence) > MAX_TOKENS) {
      parts.push(current.trim())
      current = ''
    }
    if (estimateTokens(sentence) > MAX_TOKENS) {
      for (let i = 0; i < sentence.length; i += maxChars) {
        parts.push(sentence.slice(i, i + maxChars).trim())
      }
      continue
    }
    current += sentence
  }
  if (current.trim()) parts.push(current.trim())
  return parts.filter(Boolean)
}

/** Agrupa los bloques de una sección en chunks de ~TARGET_TOKENS. */
function chunkSection(section: Section): string[] {
  const blocks = section.blocks.flatMap((block) =>
    estimateTokens(block) > MAX_TOKENS ? splitOversizedBlock(block) : [block]
  )

  const chunks: string[] = []
  let current: string[] = []

  for (const block of blocks) {
    const candidate = [...current, block].join('\n\n')
    if (current.length > 0 && estimateTokens(candidate) > TARGET_TOKENS) {
      chunks.push(current.join('\n\n'))
      // Solapamiento leve: arrastra el último párrafo si es chico, para que el
      // corte no parta una idea al medio.
      const last = current[current.length - 1] ?? ''
      current = last && estimateTokens(last) <= OVERLAP_MAX_TOKENS ? [last, block] : [block]
      continue
    }
    current.push(block)
  }
  if (current.length > 0) chunks.push(current.join('\n\n'))

  return chunks
}

/**
 * Convierte el markdown de un artículo en los fragmentos a vectorizar.
 * Determinista: el mismo texto produce siempre los mismos chunks (de eso
 * depende que reindexar sea idempotente).
 */
export function chunkMarkdown(markdown: string): KbChunkDraft[] {
  const sections = splitIntoSections(markdown)

  const drafts: Array<{ content: string; heading: string | null }> = []
  for (const section of sections) {
    for (const content of chunkSection(section)) {
      const trimmed = content.trim()
      if (!trimmed) continue

      // Un fragmento diminuto (un encabezado con una línea suelta) no aporta
      // como unidad de búsqueda: se pega al anterior si comparte sección.
      const previous = drafts[drafts.length - 1]
      if (
        previous &&
        previous.heading === section.heading &&
        estimateTokens(trimmed) < MIN_TOKENS &&
        estimateTokens(previous.content) + estimateTokens(trimmed) <= MAX_TOKENS
      ) {
        previous.content = `${previous.content}\n\n${trimmed}`
        continue
      }
      drafts.push({ content: trimmed, heading: section.heading })
    }
  }

  return drafts.map((draft, index) => ({
    ord: index,
    content: draft.content,
    heading: draft.heading,
    tokenCount: estimateTokens(draft.content),
  }))
}
