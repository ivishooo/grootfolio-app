/**
 * Comando `kb:eval` (F7, chatbot RAG). Corre el set de evaluación contra el
 * pipeline real y reporta qué tan acotado está el bot.
 *
 *   node ace kb:eval                 # evaluación completa (llama al generador)
 *   node ace kb:eval --retrieval     # sólo retrieval: rápido y sin costo
 *   node ace kb:eval --sweep         # + barrido de RAG_MIN_SCORE
 *   node ace kb:eval --json=out.json # guarda el detalle para el informe
 *
 * `--retrieval` mide únicamente la primera barrera (el umbral). La evaluación
 * completa es la que vale, porque la segunda barrera —el system prompt— sólo se
 * puede medir generando.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { EvalOutcome, EvalReport, EvalSet, SweepRow } from '#services/kb/kb_eval'

const SWEEP_THRESHOLDS = [0.5, 0.55, 0.58, 0.6, 0.62, 0.63, 0.65, 0.68, 0.7, 0.75, 0.8]

/**
 * Pausa entre preguntas en la corrida completa. El free tier de Gemini limita a
 * 5 requests por minuto, así que sin pausa la evaluación muere a la sexta
 * pregunta. Con billing habilitado conviene `--delay=0`.
 */
const DEFAULT_DELAY_SECONDS = 13

/**
 * Pausa entre preguntas en modo `--retrieval`. Ahí no se genera, pero **sí se
 * embebe cada pregunta**, y el free tier corta a 100 embeddings por minuto
 * (contando también los del `kb:seed --index` reciente). Sin pausa, una corrida
 * de 56 preguntas se pasa del tope y muere a mitad de camino: el modo "gratis y
 * rápido" era el único que no podía terminar. Con billing: `--delay=0`.
 */
const DEFAULT_RETRIEVAL_DELAY_SECONDS = 1

export default class KbEval extends BaseCommand {
  static commandName = 'kb:eval'
  static description = 'Evalúa el acotamiento del chatbot contra el set de preguntas (F7)'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Sólo retrieval: no llama al generador (rápido y sin costo)' })
  declare retrieval?: boolean

  @flags.boolean({ description: 'Agrega el barrido de RAG_MIN_SCORE' })
  declare sweep?: boolean

  @flags.string({ description: 'Guarda el detalle en un JSON para el informe' })
  declare json?: string

  @flags.number({
    description: `Segundos de pausa entre preguntas (default ${DEFAULT_DELAY_SECONDS}; ${DEFAULT_RETRIEVAL_DELAY_SECONDS} con --retrieval, por los límites del free tier). Con billing: 0`,
  })
  declare delay?: number

  async run() {
    const { isAiEnabled } = await import('#services/kb/gemini_client')
    if (!isAiEnabled()) {
      this.logger.error('Falta GEMINI_API_KEY: no se puede evaluar sin el proveedor.')
      this.exitCode = 1
      return
    }

    const { isDailyQuotaExhausted, sleep, withRetry } = await import('#services/kb/gemini_client')
    const { buildReport, sweepThresholds, suggestThreshold } = await import('#services/kb/kb_eval')
    const { answerQuestion, ragMinScore, retrieve } = await import('#services/kb/rag_query_service')
    const KbArticle = (await import('#models/kb_article')).default

    const setPath = new URL('../tests/eval/kb_eval_set.json', import.meta.url)
    const evalSet = JSON.parse(readFileSync(setPath, 'utf8')) as EvalSet

    // Sólo se evalúan preguntas cuyo artículo esperado exista y esté publicado:
    // medir contra un artículo que no está cargado no dice nada del bot.
    const published = await KbArticle.query().where('status', 'published').select('slug')
    const slugs = new Set(published.map((a) => a.slug))
    const runnable = evalSet.in_scope.filter((c) => slugs.has(c.expected_slug))
    const skipped = evalSet.in_scope.filter((c) => !slugs.has(c.expected_slug)).map((c) => c.question)

    if (runnable.length === 0) {
      this.logger.error('Ninguna pregunta in-scope tiene su artículo publicado. Cargá la KB primero.')
      this.exitCode = 1
      return
    }

    const mode = this.retrieval ? 'sólo retrieval' : 'completa (retrieval + generación)'
    this.logger.info(
      `Evaluación ${mode} · ${runnable.length} in-scope · ${evalSet.out_of_scope.length} out-of-scope · umbral ${ragMinScore()}`
    )
    if (skipped.length > 0) {
      this.logger.warning(`${skipped.length} preguntas in-scope omitidas (su artículo no está publicado).`)
    }

    const run = async (question: string, extra: Partial<EvalOutcome>): Promise<EvalOutcome> => {
      if (this.retrieval) {
        const chunks = await withRetry(() => retrieve(question), {
          attempts: 4,
          baseDelayMs: 15_000,
          onWait: (ms) =>
            this.logger.warning(`  límite de embeddings por minuto, esperando ${Math.round(ms / 1000)}s…`),
        })
        const topScore = chunks[0]?.score ?? null
        return {
          question,
          topScore,
          // En este modo "grounded" es sólo lo que decide el umbral.
          grounded: (topScore ?? 0) >= ragMinScore(),
          citedSlugs: chunks.filter((c) => c.score >= ragMinScore()).map((c) => c.slug),
          ...extra,
        }
      }
      const answer = await withRetry(() => answerQuestion(question), {
        attempts: 4,
        baseDelayMs: 20_000,
        onWait: (ms) => this.logger.warning(`  límite por minuto, esperando ${Math.round(ms / 1000)}s…`),
      })
      return {
        question,
        topScore: answer.topScore,
        grounded: answer.grounded,
        citedSlugs: answer.sources.map((s) => s.slug),
        ...extra,
      }
    }

    const defaultDelay = this.retrieval ? DEFAULT_RETRIEVAL_DELAY_SECONDS : DEFAULT_DELAY_SECONDS
    const delayMs = (this.delay ?? defaultDelay) * 1000
    const throttle = async () => {
      if (delayMs > 0) await sleep(delayMs)
    }
    if (delayMs > 0) {
      const total = runnable.length + evalSet.out_of_scope.length
      this.logger.info(
        `Pausa de ${delayMs / 1000}s entre preguntas (límite del free tier) → ~${Math.ceil((total * delayMs) / 60000)} min`
      )
    }

    /** La cuota diaria no se recupera esperando: cortar con un mensaje útil. */
    const guardQuota = (err: unknown): never => {
      if (isDailyQuotaExhausted(err)) {
        this.logger.error(
          'Cuota DIARIA de generación agotada (free tier: 20 requests/día). ' +
            'Habilitá billing en el proyecto de Google Cloud o corré `kb:eval --retrieval`, ' +
            'que mide el umbral sin llamar al generador.'
        )
      }
      throw err
    }

    const inScope: EvalOutcome[] = []
    for (const [i, testCase] of runnable.entries()) {
      inScope.push(
        await run(testCase.question, { expectedSlug: testCase.expected_slug }).catch(guardQuota)
      )
      this.logger.info(`  in-scope ${i + 1}/${runnable.length}`)
      await throttle()
    }

    const outOfScope: EvalOutcome[] = []
    for (const [i, testCase] of evalSet.out_of_scope.entries()) {
      outOfScope.push(await run(testCase.question, { family: testCase.family }).catch(guardQuota))
      this.logger.info(`  out-of-scope ${i + 1}/${evalSet.out_of_scope.length}`)
      await throttle()
    }

    const report = buildReport(inScope, outOfScope, skipped)
    this.printReport(report)

    if (this.sweep) {
      const rows = sweepThresholds(inScope, outOfScope, SWEEP_THRESHOLDS)
      this.printSweep(rows, ragMinScore())
      const best = suggestThreshold(rows)
      if (best) {
        this.logger.info(
          `Umbral con mayor separación: ${best.minScore} (in-scope ${pct(best.inScopeRate)} · out-of-scope frenadas ${pct(best.outOfScopeBlockedRate)})`
        )
      }
    }

    if (this.json) {
      writeFileSync(this.json, JSON.stringify({ report, inScope, outOfScope }, null, 2))
      this.logger.info(`Detalle guardado en ${this.json}`)
    }

    // Los fallos individuales importan más que el promedio: son los casos a
    // revisar en el prompt o en la KB.
    this.printFailures(inScope, outOfScope)
  }

  private printReport(report: EvalReport) {
    this.logger.log('')
    this.logger.log('  RESULTADOS')
    this.logger.log(`  in-scope respondidas      ${report.inScope.ok}/${report.inScope.total}  (${pct(report.inScope.rate)})`)
    this.logger.log(`  in-scope con cita correcta ${report.inScope.citedCorrectly}/${report.inScope.total}  (${pct(report.inScope.citationRate)})`)
    this.logger.log(`  out-of-scope rechazadas   ${report.outOfScope.ok}/${report.outOfScope.total}  (${pct(report.outOfScope.rate)})`)
    this.logger.log('')
    this.logger.log('  Rechazo por familia:')
    for (const [family, m] of Object.entries(report.outOfScope.byFamily)) {
      this.logger.log(`    ${family.padEnd(15)} ${m.ok}/${m.total}  (${pct(m.rate)})`)
    }
    this.logger.log('')
    this.logger.log(`  acierto global            ${pct(report.overallRate)}`)
    this.logger.log('')
  }

  private printSweep(rows: SweepRow[], current: number) {
    this.logger.log('  BARRIDO DE RAG_MIN_SCORE')
    this.logger.log('  umbral │ in-scope que pasan │ out-of-scope frenadas │ separación')
    for (const row of rows) {
      const marker = Math.abs(row.minScore - current) < 1e-9 ? ' ←' : ''
      this.logger.log(
        `   ${row.minScore.toFixed(2)}  │  ${String(row.inScopePassing).padStart(3)} (${pct(row.inScopeRate).padStart(6)})  │  ` +
          `${String(row.outOfScopeLeaking).padStart(3)} pasan (${pct(row.outOfScopeBlockedRate).padStart(6)})  │  ${pct(row.separation).padStart(6)}${marker}`
      )
    }
    this.logger.log('')
  }

  /** Casos fallados, que son la materia prima del tuning. */
  private printFailures(inScope: EvalOutcome[], outOfScope: EvalOutcome[]) {
    const notAnswered = inScope.filter((o) => !o.grounded)
    const badCitation = inScope.filter(
      (o) => o.grounded && !!o.expectedSlug && !o.citedSlugs.includes(o.expectedSlug)
    )
    const leaked = outOfScope.filter((o) => o.grounded)

    if (notAnswered.length > 0) {
      this.logger.log('  IN-SCOPE SIN RESPONDER (revisar KB o bajar el umbral):')
      for (const o of notAnswered) this.logger.log(`    ${fmtScore(o.topScore)}  ${o.question}`)
      this.logger.log('')
    }
    if (badCitation.length > 0) {
      this.logger.log('  IN-SCOPE CON CITA INCORRECTA (revisar el recorte de los artículos):')
      for (const o of badCitation) {
        this.logger.log(`    esperaba ${o.expectedSlug}, citó ${o.citedSlugs.join(', ') || '—'}  ·  ${o.question}`)
      }
      this.logger.log('')
    }
    if (leaked.length > 0) {
      this.logger.log('  OUT-OF-SCOPE RESPONDIDAS (revisar el system prompt):')
      for (const o of leaked) this.logger.log(`    [${o.family}] ${fmtScore(o.topScore)}  ${o.question}`)
      this.logger.log('')
    }
    if (notAnswered.length + badCitation.length + leaked.length === 0) {
      this.logger.success('  Sin fallos en el set.')
    }
  }
}

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`
const fmtScore = (score: number | null): string => (score === null ? '  —   ' : score.toFixed(4))
