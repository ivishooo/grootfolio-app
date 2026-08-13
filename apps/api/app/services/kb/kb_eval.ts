/**
 * Métricas de la evaluación del chatbot (F7, ADR-0004).
 *
 * Lógica pura y sin infraestructura: recibe los resultados ya obtenidos y
 * calcula las tasas. Se separa del command para poder testearla y para que el
 * barrido de umbrales no dependa de volver a llamar al proveedor.
 *
 * Qué se mide y por qué:
 *  - **in-scope**: que el bot responda (`grounded`) y que **cite el artículo
 *    correcto**. Responder bien citando mal es un fallo: la cita es lo que le
 *    permite al usuario verificar.
 *  - **out-of-scope**: que el bot rechace. Se desglosa por familia porque no
 *    fallan igual: las de tema ajeno las filtra el umbral, mientras que pedir
 *    consejo o datos personales cae cerca de la KB y sólo lo ataja el prompt.
 */

export interface InScopeCase {
  question: string
  expected_slug: string
}

export interface OutOfScopeCase {
  question: string
  family: string
}

export interface EvalSet {
  version: string
  in_scope: InScopeCase[]
  out_of_scope: OutOfScopeCase[]
}

/** Resultado de correr una pregunta contra el pipeline. */
export interface EvalOutcome {
  question: string
  /** Mejor score de similitud, o null si no se recuperó nada. */
  topScore: number | null
  /** `true` si el bot respondió con respaldo (no se llamó o no declinó). */
  grounded: boolean
  /** Slugs citados en la respuesta. */
  citedSlugs: string[]
  /** Sólo in-scope: artículo que debería haber citado. */
  expectedSlug?: string
  /** Sólo out-of-scope: familia de la pregunta. */
  family?: string
}

export interface ScopeMetrics {
  total: number
  /** in-scope: respondidas. out-of-scope: rechazadas. */
  ok: number
  rate: number
}

export interface EvalReport {
  inScope: ScopeMetrics & { citedCorrectly: number; citationRate: number }
  outOfScope: ScopeMetrics & { byFamily: Record<string, ScopeMetrics> }
  /** Preguntas in-scope omitidas porque su artículo no está en la KB. */
  skipped: string[]
  overallRate: number
}

const rate = (ok: number, total: number): number => (total === 0 ? 0 : ok / total)

export function buildReport(
  inScope: EvalOutcome[],
  outOfScope: EvalOutcome[],
  skipped: string[]
): EvalReport {
  const answered = inScope.filter((o) => o.grounded)
  // La cita cuenta sólo si además respondió: citar sin responder no existe.
  const cited = answered.filter((o) => !!o.expectedSlug && o.citedSlugs.includes(o.expectedSlug))
  const rejected = outOfScope.filter((o) => !o.grounded)

  const byFamily: Record<string, ScopeMetrics> = {}
  for (const outcome of outOfScope) {
    const family = outcome.family ?? 'sin_familia'
    const bucket = (byFamily[family] ??= { total: 0, ok: 0, rate: 0 })
    bucket.total += 1
    if (!outcome.grounded) bucket.ok += 1
  }
  for (const bucket of Object.values(byFamily)) bucket.rate = rate(bucket.ok, bucket.total)

  const totalCases = inScope.length + outOfScope.length
  return {
    inScope: {
      total: inScope.length,
      ok: answered.length,
      rate: rate(answered.length, inScope.length),
      citedCorrectly: cited.length,
      citationRate: rate(cited.length, inScope.length),
    },
    outOfScope: {
      total: outOfScope.length,
      ok: rejected.length,
      rate: rate(rejected.length, outOfScope.length),
      byFamily,
    },
    skipped,
    overallRate: rate(answered.length + rejected.length, totalCases),
  }
}

export interface SweepRow {
  minScore: number
  /** in-scope que superarían el umbral (el bot llegaría a responder). */
  inScopePassing: number
  inScopeRate: number
  /** out-of-scope que superarían el umbral (quedarían en manos del prompt). */
  outOfScopeLeaking: number
  outOfScopeBlockedRate: number
  /** Diferencia entre ambas tasas: cuanto más alto, mejor separa el umbral. */
  separation: number
}

/**
 * Barrido del umbral **sin volver a llamar al proveedor**: sólo depende de los
 * scores de similitud, que ya se midieron. Muestra el compromiso entre dejar
 * pasar preguntas legítimas y filtrar las que están fuera de alcance.
 *
 * Ojo con la lectura: que una out-of-scope "pase" el umbral no significa que el
 * bot la responda — significa que el gate no la frena y queda en manos del
 * system prompt, que es la segunda barrera.
 */
export function sweepThresholds(
  inScope: EvalOutcome[],
  outOfScope: EvalOutcome[],
  thresholds: number[]
): SweepRow[] {
  return thresholds.map((minScore) => {
    const passing = inScope.filter((o) => (o.topScore ?? 0) >= minScore).length
    const leaking = outOfScope.filter((o) => (o.topScore ?? 0) >= minScore).length
    const inScopeRate = rate(passing, inScope.length)
    const outOfScopeBlockedRate = rate(outOfScope.length - leaking, outOfScope.length)
    return {
      minScore,
      inScopePassing: passing,
      inScopeRate,
      outOfScopeLeaking: leaking,
      outOfScopeBlockedRate,
      separation: inScopeRate + outOfScopeBlockedRate - 1,
    }
  })
}

/**
 * Umbral sugerido: el que maximiza la separación entre in-scope que pasan y
 * out-of-scope que se frenan. Ante empate elige el más bajo, que es el menos
 * agresivo con las preguntas legítimas (rechazar una consulta válida se ve
 * peor que dejar una dudosa en manos del prompt).
 */
export function suggestThreshold(rows: SweepRow[]): SweepRow | null {
  return rows.reduce<SweepRow | null>((best, row) => {
    if (!best || row.separation > best.separation) return row
    return best
  }, null)
}
