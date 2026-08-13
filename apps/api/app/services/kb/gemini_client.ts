/**
 * Cliente de Google Gemini (F3, ADR-0004). Único punto donde se configura el
 * SDK y los modelos; el resto de los servicios de KB dependen de acá.
 *
 * La API key es **opcional** por diseño (F1): sin ella la app arranca igual y
 * las features de IA responden "no disponible" en vez de romper. Por eso la
 * init es perezosa y `isAiEnabled()` permite chequear antes de llamar.
 */
import { GoogleGenAI } from '@google/genai'
import env from '#start/env'

/** La IA no está configurada (falta `GEMINI_API_KEY`). */
export class AiUnavailableError extends Error {
  code = 'AI_UNAVAILABLE'
  constructor() {
    super('El asistente no está disponible: falta configurar la API key de Gemini.')
  }
}

/** Falló la llamada al proveedor (red, cuota, modelo inexistente). */
export class AiRequestError extends Error {
  code = 'AI_REQUEST_FAILED'
  constructor(message: string, readonly cause?: unknown) {
    super(message)
  }
}

/**
 * Dimensión del embedding. Fijada en la migración 0008 (`vector(768)`):
 * cambiarla exige una migración nueva y reindexar todo con `kb:reindex`.
 */
export const EMBEDDING_DIMENSIONS = 768

/**
 * `gemini-embedding-001` es asimétrico: rinde mejor si se le dice para qué es
 * cada texto. Los fragmentos se indexan como documento y las preguntas se
 * embeben como consulta. Medido, ensancha el margen entre preguntas dentro y
 * fuera de alcance (ver "Sonda de retrieval" en docs/PLAN_CHATBOT_RAG.md).
 */
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

/**
 * Defaults si las env no están seteadas (en `env.ts` son todas opcionales).
 * Se pinean versiones concretas a propósito (no `gemini-flash-latest`): un
 * alias que se mueve solo haría irreproducible la evaluación de F7.
 * `gemini-2.5-flash`, el default original de F1, ya fue dado de baja por Google.
 */
const DEFAULT_EMBED_MODEL = 'gemini-embedding-001'
const DEFAULT_CHAT_MODEL = 'gemini-3.6-flash'

let client: GoogleGenAI | null = null

export function isAiEnabled(): boolean {
  return !!env.get('GEMINI_API_KEY')
}

export function embedModel(): string {
  return env.get('GEMINI_EMBED_MODEL') ?? DEFAULT_EMBED_MODEL
}

export function chatModel(): string {
  return env.get('GEMINI_CHAT_MODEL') ?? DEFAULT_CHAT_MODEL
}

function getClient(): GoogleGenAI {
  const apiKey = env.get('GEMINI_API_KEY')
  if (!apiKey) throw new AiUnavailableError()
  if (!client) client = new GoogleGenAI({ apiKey })
  return client
}

/**
 * Normaliza a longitud 1. `gemini-embedding-001` devuelve los 3072 nativos ya
 * normalizados, pero **el truncado a 768 no lo está** (norma ≈ 0.60 medida).
 *
 * Con el operador `<=>` de pgvector esto no cambia el ranking ni el score —la
 * distancia coseno divide por las normas—, pero se normaliza igual para dejar
 * los vectores comparables entre sí y poder pasar a `<#>` (inner product, más
 * barato) sin tener que reindexar.
 */
export function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0))
  if (magnitude === 0) return vector
  return vector.map((x) => x / magnitude)
}

/**
 * Embeddings de varios textos en una sola llamada. Devuelve los vectores en el
 * mismo orden que la entrada, truncados a `EMBEDDING_DIMENSIONS` y normalizados.
 */
export async function embedTexts(texts: string[], taskType: EmbeddingTaskType): Promise<number[][]> {
  if (texts.length === 0) return []
  const ai = getClient()
  try {
    const response = await ai.models.embedContent({
      model: embedModel(),
      contents: texts,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
    })
    const vectors = response.embeddings?.map((e) => e.values ?? []) ?? []
    if (vectors.length !== texts.length) {
      throw new AiRequestError(
        `El proveedor devolvió ${vectors.length} embeddings para ${texts.length} textos.`
      )
    }
    return vectors.map(normalize)
  } catch (err) {
    if (err instanceof AiRequestError || err instanceof AiUnavailableError) throw err
    throw new AiRequestError(describeError(err), err)
  }
}

export async function embedText(text: string, taskType: EmbeddingTaskType): Promise<number[]> {
  const [vector] = await embedTexts([text], taskType)
  if (!vector) throw new AiRequestError('El proveedor no devolvió el embedding del texto.')
  return vector
}

/** Mensaje legible de un error del SDK (que no siempre trae `message` útil). */
export function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Error desconocido al llamar al proveedor de IA.'
  }
}

/**
 * Cuota **diaria** agotada. Se distingue de la cuota por minuto porque no tiene
 * sentido reintentar: la ventana se renueva recién al otro día. En el free tier
 * de Gemini el tope diario de generación es de apenas 20 requests.
 */
export function isDailyQuotaExhausted(err: unknown): boolean {
  return /PerDay|per day/i.test(describeError(err))
}

/**
 * Errores que vale la pena reintentar: cuota momentánea o backend caído. Un 400
 * (modelo inexistente, texto inválido) no se reintenta porque va a fallar igual,
 * y una cuota diaria agotada tampoco.
 */
export function isRetryable(err: unknown): boolean {
  if (isDailyQuotaExhausted(err)) return false
  const message = describeError(err).toUpperCase()
  return (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('500') ||
    message.includes('INTERNAL')
  )
}

/**
 * Segundos que el proveedor pide esperar, si lo dice en el error. Los 429 de
 * cuota traen `retryDelay` y respetarlo es mucho más eficaz que adivinar.
 */
export function retryDelayMs(err: unknown, fallbackMs: number): number {
  const match = describeError(err).match(/"retryDelay"\s*:\s*"(\d+)s"/)
  const seconds = match?.[1] ? Number(match[1]) : NaN
  return Number.isFinite(seconds) ? (seconds + 1) * 1000 : fallbackMs
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Reintenta una operación contra el proveedor respetando su `retryDelay`.
 * `onWait` permite avisar al usuario en comandos largos.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number; onWait?: (ms: number, attempt: number) => void } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3
  const base = options.baseDelayMs ?? 1000
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err
      if (!isRetryable(err) || attempt === attempts) break
      const delay = retryDelayMs(err, base * 2 ** (attempt - 1))
      options.onWait?.(delay, attempt)
      await sleep(delay)
    }
  }
  throw lastError
}

/** Reinicia el cliente memoizado. Sólo para tests. */
export function resetClient(): void {
  client = null
}
