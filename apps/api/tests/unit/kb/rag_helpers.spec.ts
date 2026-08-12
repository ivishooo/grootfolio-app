/**
 * Tests unitarios de la lógica pura del pipeline RAG (F4). Sin red ni DB.
 *
 * Lo que se protege acá: que una salida rara del modelo nunca llegue rota al
 * usuario, y que las citas no se dupliquen ni se muestren cuando el bot no
 * respondió con el contexto (mostrar fuentes que no respaldan nada es peor que
 * no mostrar ninguna).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dedupeSources,
  parseGenerated,
  type RetrievedChunk,
} from '../../../app/services/kb/rag_helpers.js'
import { FALLBACK_ANSWER } from '../../../app/services/kb/prompts.js'

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  articleId: 'a1',
  title: 'Cómo cargar una transacción',
  slug: 'como-cargar-una-transaccion',
  heading: 'Cargar una operación',
  content: 'texto',
  score: 0.8,
  ...over,
})

// --- parseGenerated ---

test('parsea la salida estructurada del modelo', () => {
  const result = parseGenerated('{"answer":"Andá a Movimientos.","answeredFromContext":true}')
  assert.equal(result.answer, 'Andá a Movimientos.')
  assert.equal(result.answeredFromContext, true)
})

test('respeta answeredFromContext=false (el bot declinó)', () => {
  const result = parseGenerated('{"answer":"No doy consejo financiero.","answeredFromContext":false}')
  assert.equal(result.answeredFromContext, false)
})

test('sin texto devuelve el fallback y no marca contexto', () => {
  for (const raw of [undefined, '', '   ']) {
    const result = parseGenerated(raw)
    assert.equal(result.answer, FALLBACK_ANSWER)
    assert.equal(result.answeredFromContext, false)
  }
})

test('JSON válido pero con answer vacío degrada al fallback', () => {
  const result = parseGenerated('{"answer":"   ","answeredFromContext":true}')
  assert.equal(result.answer, FALLBACK_ANSWER)
  assert.equal(result.answeredFromContext, false)
})

test('texto plano (no JSON) se usa tal cual en vez de perderse', () => {
  const result = parseGenerated('Andá a Movimientos y tocá Agregar.')
  assert.equal(result.answer, 'Andá a Movimientos y tocá Agregar.')
  assert.equal(result.answeredFromContext, true)
})

test('answeredFromContext sólo es true si vino explícitamente en true', () => {
  assert.equal(parseGenerated('{"answer":"ok"}').answeredFromContext, false)
  assert.equal(parseGenerated('{"answer":"ok","answeredFromContext":"true"}').answeredFromContext, false)
  assert.equal(parseGenerated('{"answer":"ok","answeredFromContext":1}').answeredFromContext, false)
})

// --- dedupeSources ---

test('deduplica por artículo + sección quedándose con el mejor score', () => {
  const sources = dedupeSources([
    chunk({ score: 0.71 }),
    chunk({ score: 0.83 }),
    chunk({ heading: 'Editar o borrar', score: 0.65 }),
  ])
  assert.equal(sources.length, 2)
  assert.equal(sources[0]?.score, 0.83)
})

test('dos secciones del mismo artículo son citas distintas', () => {
  const sources = dedupeSources([
    chunk({ heading: 'Cargar una operación' }),
    chunk({ heading: 'Cómo se valúa en dólares' }),
  ])
  assert.equal(sources.length, 2)
})

test('ordena las citas de mayor a menor relevancia', () => {
  const sources = dedupeSources([
    chunk({ articleId: 'a2', heading: 'B', score: 0.6 }),
    chunk({ articleId: 'a1', heading: 'A', score: 0.9 }),
    chunk({ articleId: 'a3', heading: 'C', score: 0.75 }),
  ])
  assert.deepEqual(
    sources.map((s) => s.score),
    [0.9, 0.75, 0.6]
  )
})

test('los fragmentos sin heading no se pierden ni se mezclan', () => {
  const sources = dedupeSources([chunk({ heading: null }), chunk({ heading: 'Sección' })])
  assert.equal(sources.length, 2)
  assert.ok(sources.some((s) => s.heading === null))
})

test('sin fragmentos no hay citas', () => {
  assert.deepEqual(dedupeSources([]), [])
})

test('el score de la cita se redondea a 4 decimales', () => {
  const sources = dedupeSources([chunk({ score: 0.123456789 })])
  assert.equal(sources[0]?.score, 0.1235)
})
