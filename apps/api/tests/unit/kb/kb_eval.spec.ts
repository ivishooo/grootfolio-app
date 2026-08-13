/**
 * Tests unitarios de las métricas de evaluación (F7). Sin red ni DB.
 *
 * Lo que se protege acá: que los números del informe de tesis signifiquen lo
 * que dicen. Una métrica mal calculada no rompe nada visible — simplemente
 * miente, y encima queda escrita en la monografía.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildReport,
  suggestThreshold,
  sweepThresholds,
  type EvalOutcome,
} from '../../../app/services/kb/kb_eval.js'

const inCase = (over: Partial<EvalOutcome> = {}): EvalOutcome => ({
  question: 'q',
  topScore: 0.8,
  grounded: true,
  citedSlugs: ['articulo-a'],
  expectedSlug: 'articulo-a',
  ...over,
})

const outCase = (over: Partial<EvalOutcome> = {}): EvalOutcome => ({
  question: 'q',
  topScore: 0.4,
  grounded: false,
  citedSlugs: [],
  family: 'off_topic',
  ...over,
})

// --- buildReport ---

test('cuenta respondidas y citas correctas por separado', () => {
  const report = buildReport(
    [inCase(), inCase({ citedSlugs: ['otro'] }), inCase({ grounded: false, citedSlugs: [] })],
    [],
    []
  )
  assert.equal(report.inScope.total, 3)
  assert.equal(report.inScope.ok, 2)
  assert.equal(report.inScope.citedCorrectly, 1)
})

test('responder citando mal NO cuenta como cita correcta', () => {
  const report = buildReport([inCase({ citedSlugs: ['articulo-b'] })], [], [])
  assert.equal(report.inScope.ok, 1)
  assert.equal(report.inScope.citedCorrectly, 0)
})

test('una cita correcta entre varias citadas cuenta', () => {
  const report = buildReport([inCase({ citedSlugs: ['otro', 'articulo-a'] })], [], [])
  assert.equal(report.inScope.citedCorrectly, 1)
})

test('no cuenta la cita si el bot no respondió', () => {
  const report = buildReport([inCase({ grounded: false, citedSlugs: ['articulo-a'] })], [], [])
  assert.equal(report.inScope.citedCorrectly, 0)
})

test('out-of-scope: rechazar es el acierto', () => {
  const report = buildReport([], [outCase(), outCase(), outCase({ grounded: true })], [])
  assert.equal(report.outOfScope.ok, 2)
  assert.equal(Number(report.outOfScope.rate.toFixed(4)), 0.6667)
})

test('desglosa el rechazo por familia', () => {
  const report = buildReport(
    [],
    [
      outCase({ family: 'advice', grounded: true }),
      outCase({ family: 'advice' }),
      outCase({ family: 'off_topic' }),
    ],
    []
  )
  assert.equal(report.outOfScope.byFamily.advice?.total, 2)
  assert.equal(report.outOfScope.byFamily.advice?.ok, 1)
  assert.equal(report.outOfScope.byFamily.off_topic?.rate, 1)
})

test('el acierto global mezcla ambos lados', () => {
  const report = buildReport([inCase(), inCase({ grounded: false })], [outCase(), outCase()], [])
  assert.equal(report.overallRate, 0.75)
})

test('un set vacío no divide por cero', () => {
  const report = buildReport([], [], [])
  assert.equal(report.inScope.rate, 0)
  assert.equal(report.outOfScope.rate, 0)
  assert.equal(report.overallRate, 0)
})

test('las preguntas omitidas viajan en el reporte', () => {
  const report = buildReport([inCase()], [], ['¿Qué es un CEDEAR?'])
  assert.deepEqual(report.skipped, ['¿Qué es un CEDEAR?'])
})

// --- sweepThresholds ---

test('el barrido usa los scores, no el grounded ya calculado', () => {
  const rows = sweepThresholds(
    [inCase({ topScore: 0.7 }), inCase({ topScore: 0.61 })],
    [outCase({ topScore: 0.5 }), outCase({ topScore: 0.64 })],
    [0.6, 0.65]
  )
  assert.equal(rows[0]?.inScopePassing, 2)
  assert.equal(rows[0]?.outOfScopeLeaking, 1)
  assert.equal(rows[1]?.inScopePassing, 1)
  assert.equal(rows[1]?.outOfScopeLeaking, 0)
})

test('subir el umbral nunca deja pasar más in-scope', () => {
  const inScope = [inCase({ topScore: 0.9 }), inCase({ topScore: 0.7 }), inCase({ topScore: 0.55 })]
  const rows = sweepThresholds(inScope, [], [0.5, 0.6, 0.7, 0.8])
  for (let i = 1; i < rows.length; i++) {
    assert.ok((rows[i]?.inScopePassing ?? 0) <= (rows[i - 1]?.inScopePassing ?? 0))
  }
})

test('un topScore null se trata como 0 y nunca pasa', () => {
  const rows = sweepThresholds([inCase({ topScore: null })], [], [0.1])
  assert.equal(rows[0]?.inScopePassing, 0)
})

test('la separación premia dejar pasar in-scope y frenar out-of-scope', () => {
  const rows = sweepThresholds(
    [inCase({ topScore: 0.8 })],
    [outCase({ topScore: 0.5 })],
    [0.6]
  )
  // 100% de in-scope pasa y 100% de out-of-scope se frena → separación máxima.
  assert.equal(rows[0]?.separation, 1)
})

// --- suggestThreshold ---

test('sugiere el umbral con mayor separación', () => {
  const rows = sweepThresholds(
    [inCase({ topScore: 0.7 })],
    [outCase({ topScore: 0.65 })],
    [0.6, 0.68, 0.75]
  )
  // 0.60: pasa el in y se filtra el out → separación 0. 0.68: pasa el in y
  // frena el out → 1. 0.75: no pasa ninguno → 0.
  assert.equal(suggestThreshold(rows)?.minScore, 0.68)
})

test('ante empate se queda con el umbral más bajo', () => {
  const rows = sweepThresholds([inCase({ topScore: 0.9 })], [outCase({ topScore: 0.2 })], [0.5, 0.6])
  assert.equal(suggestThreshold(rows)?.minScore, 0.5)
})

test('sin filas no sugiere nada', () => {
  assert.equal(suggestThreshold([]), null)
})
