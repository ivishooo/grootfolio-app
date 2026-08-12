/**
 * Lógica pura del pipeline RAG (F4): tipos, interpretación de la salida del
 * modelo y armado de citas.
 *
 * Vive separado de `rag_query_service` a propósito: ese módulo depende de la
 * base, del logger y del SDK de Gemini, y no se puede importar sin arrancar la
 * app. Acá no hay infraestructura, así que se testea de verdad.
 */
import { FALLBACK_ANSWER } from '#services/kb/prompts'

export interface RetrievedChunk {
  articleId: string
  title: string
  slug: string
  heading: string | null
  content: string
  score: number
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Fragmento de la KB que respaldó una respuesta. */
export interface ChatSource {
  articleId: string
  title: string
  slug: string
  heading: string | null
  score: number
}

export interface GeneratedAnswer {
  answer: string
  answeredFromContext: boolean
}

/**
 * Interpreta la salida del modelo (JSON con `answer` y `answeredFromContext`).
 *
 * Degrada con cuidado: sin texto o sin respuesta utilizable devuelve el
 * fallback —es preferible admitir que no se sabe a mostrar algo roto—; si el
 * texto no es JSON válido lo toma como respuesta cruda, que es mejor que
 * perderla. `answeredFromContext` sólo es `true` si vino explícitamente en
 * `true`: ante la duda no se muestran citas.
 */
export function parseGenerated(raw: string | undefined): GeneratedAnswer {
  const text = raw?.trim()
  if (!text) return { answer: FALLBACK_ANSWER, answeredFromContext: false }

  try {
    const parsed = JSON.parse(text) as Partial<GeneratedAnswer>
    const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : ''
    if (!answer) return { answer: FALLBACK_ANSWER, answeredFromContext: false }
    return { answer, answeredFromContext: parsed.answeredFromContext === true }
  } catch {
    return { answer: text, answeredFromContext: true }
  }
}

/** Una cita por artículo+sección, con el mejor score, en orden de relevancia. */
export function dedupeSources(chunks: RetrievedChunk[]): ChatSource[] {
  const byKey = new Map<string, ChatSource>()
  for (const chunk of chunks) {
    const key = `${chunk.articleId}::${chunk.heading ?? ''}`
    const existing = byKey.get(key)
    if (!existing || chunk.score > existing.score) {
      byKey.set(key, {
        articleId: chunk.articleId,
        title: chunk.title,
        slug: chunk.slug,
        heading: chunk.heading,
        score: Number(chunk.score.toFixed(4)),
      })
    }
  }
  return [...byKey.values()].sort((a, b) => b.score - a.score)
}
