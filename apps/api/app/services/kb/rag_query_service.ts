/**
 * Consulta RAG (F4, ADR-0004). El núcleo del chatbot:
 *
 *   1. Embedding de la pregunta (`RETRIEVAL_QUERY`).
 *   2. Búsqueda por similitud sobre los fragmentos de artículos publicados.
 *   3. **Gate de umbral**: si el mejor score no llega a `RAG_MIN_SCORE`, se
 *      devuelve el fallback fijo SIN llamar al generador (ahorra cuota y es lo
 *      que garantiza el acotamiento).
 *   4. Si pasa: contexto + system prompt de grounding → Gemini Flash.
 *   5. Se adjuntan las citas de origen.
 *
 * El gate no alcanza solo: hay preguntas fuera de alcance que puntúan alto
 * porque son temáticamente idénticas a la KB (pedir consejo financiero sobre un
 * activo del que sí hay artículo). Esas las ataja el system prompt.
 */
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import {
  dedupeSources,
  parseGenerated,
  type ChatSource,
  type ChatTurn,
  type GeneratedAnswer,
  type RetrievedChunk,
} from '#services/kb/rag_helpers'
import {
  AiUnavailableError,
  chatModel,
  describeError,
  embedText,
  isAiEnabled,
} from '#services/kb/gemini_client'
import { FALLBACK_ANSWER, SYSTEM_PROMPT, buildUserPrompt } from '#services/kb/prompts'
import { GoogleGenAI } from '@google/genai'

const DEFAULT_TOP_K = 4
const DEFAULT_MIN_SCORE = 0.63
/** Turnos previos que se mandan como memoria corta (2 intercambios). */
export const MAX_HISTORY_MESSAGES = 4

export interface RagAnswer {
  answer: string
  grounded: boolean
  sources: ChatSource[]
  /** Mejor score de similitud obtenido. Null si no había nada indexado. */
  topScore: number | null
}

export function ragTopK(): number {
  return env.get('RAG_TOP_K') ?? DEFAULT_TOP_K
}

export function ragMinScore(): number {
  return env.get('RAG_MIN_SCORE') ?? DEFAULT_MIN_SCORE
}

/**
 * Fragmentos más parecidos a la pregunta, sólo de artículos publicados.
 *
 * `<=>` devuelve **distancia** coseno, así que la similitud es `1 - distancia`.
 * El orden se hace por la distancia para que el índice HNSW se use.
 */
export async function retrieve(question: string, topK = ragTopK()): Promise<RetrievedChunk[]> {
  const embedding = await embedText(question, 'RETRIEVAL_QUERY')
  const literal = `[${embedding.join(',')}]`

  const rows = await db
    .from('kb_chunks as c')
    .innerJoin('kb_articles as a', 'a.id', 'c.article_id')
    .where('a.status', 'published')
    .whereNotNull('c.embedding')
    .select(
      'c.article_id as article_id',
      'c.content as content',
      'c.heading as heading',
      'a.title as title',
      'a.slug as slug',
      db.raw('1 - (c.embedding <=> ?) as score', [literal])
    )
    .orderByRaw('c.embedding <=> ?', [literal])
    .limit(topK)

  return rows.map((row: Record<string, unknown>) => ({
    articleId: String(row.article_id),
    title: String(row.title),
    slug: String(row.slug),
    heading: (row.heading as string | null) ?? null,
    content: String(row.content),
    score: Number(row.score),
  }))
}

/**
 * Responde una pregunta. `history` son los turnos previos (se recorta a
 * `MAX_HISTORY_MESSAGES`); la memoria es corta a propósito.
 */
export async function answerQuestion(question: string, history: ChatTurn[] = []): Promise<RagAnswer> {
  if (!isAiEnabled()) throw new AiUnavailableError()

  const chunks = await retrieve(question)
  const topScore = chunks[0]?.score ?? null
  const minScore = ragMinScore()

  // Gate: sin respaldo suficiente no se llama al generador.
  if (topScore === null || topScore < minScore) {
    logger.info(`[chat] fuera de alcance (score ${topScore?.toFixed(4) ?? 'sin datos'} < ${minScore})`)
    return { answer: FALLBACK_ANSWER, grounded: false, sources: [], topScore }
  }

  const { answer, answeredFromContext } = await generate(question, chunks, history)

  // Pasar el umbral no garantiza que la respuesta se apoye en el contexto: una
  // pregunta puede ser temáticamente cercana a la KB y aun así declinarse (pide
  // consejo, una predicción o datos de la cartera). En ese caso no se muestran
  // citas, porque no respaldan nada.
  return {
    answer,
    grounded: answeredFromContext,
    sources: answeredFromContext ? dedupeSources(chunks) : [],
    topScore,
  }
}

async function generate(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatTurn[]
): Promise<GeneratedAnswer> {
  const apiKey = env.get('GEMINI_API_KEY')
  if (!apiKey) throw new AiUnavailableError()
  const ai = new GoogleGenAI({ apiKey })

  const recent = history.slice(-MAX_HISTORY_MESSAGES)
  const contents = [
    ...recent.map((turn) => ({
      role: turn.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: turn.content }],
    })),
    { role: 'user' as const, parts: [{ text: buildUserPrompt(question, chunks) }] },
  ]

  try {
    const response = await ai.models.generateContent({
      model: chatModel(),
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        // Temperatura baja: se busca fidelidad al contexto, no creatividad.
        temperature: 0.2,
        maxOutputTokens: 2048,
        // Salida estructurada: además del texto se necesita saber si la
        // respuesta se apoyó en el contexto, para no mostrar citas cuando el
        // bot declinó.
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            answeredFromContext: { type: 'boolean' },
          },
          required: ['answer', 'answeredFromContext'],
        },
      },
    })
    return parseGenerated(response.text)
  } catch (err) {
    logger.error(`[chat] falló la generación: ${describeError(err)}`)
    throw err
  }
}

export type { ChatTurn, RetrievedChunk } from '#services/kb/rag_helpers'
