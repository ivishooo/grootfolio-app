/**
 * Tests unitarios del chunker de la KB (F3, chatbot RAG). Corren con el runner
 * nativo `node:test`: lógica pura, sin red ni DB.
 *
 * Lo que se protege acá: que un chunk nunca cruce secciones (de eso dependen
 * las citas), que ningún chunk supere el máximo (de eso depende que el
 * embedding no se trunque) y que el chunking sea determinista (de eso depende
 * que reindexar sea idempotente).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkMarkdown, estimateTokens, type KbChunkDraft } from '../../../app/services/kb/chunker.js'

const MAX_TOKENS = 800

/** Acceso por índice con aserción: el repo usa `noUncheckedIndexedAccess`. */
const at = (chunks: KbChunkDraft[], index: number): KbChunkDraft => {
  const chunk = chunks[index]
  assert.ok(chunk, `esperaba un chunk en la posición ${index} (hay ${chunks.length})`)
  return chunk
}

const parrafo = (n: number) =>
  `Este es el parrafo numero ${n} del articulo de prueba. ` +
  'Contiene texto suficiente para que el chunker tenga algo que agrupar y ' +
  'poder verificar que los cortes caen donde esperamos que caigan.'

test('un artículo corto queda en un solo chunk', () => {
  const chunks = chunkMarkdown('## Cargar una transacción\n\nEntrá a Movimientos y tocá Agregar.')
  assert.equal(chunks.length, 1)
  assert.equal(at(chunks, 0).ord, 0)
  assert.match(at(chunks, 0).content, /Movimientos/)
})

test('el heading se propaga a los chunks y arma la ruta jerárquica', () => {
  const chunks = chunkMarkdown(
    ['# Transacciones', '', parrafo(1), '', '## Compras', '', parrafo(2)].join('\n')
  )
  assert.equal(at(chunks, 0).heading, 'Transacciones')
  assert.equal(at(chunks, 1).heading, 'Transacciones › Compras')
})

test('el texto anterior al primer encabezado queda sin heading', () => {
  const chunks = chunkMarkdown([parrafo(1), '', '## Sección', '', parrafo(2)].join('\n'))
  assert.equal(at(chunks, 0).heading, null)
  assert.equal(at(chunks, 1).heading, 'Sección')
})

test('un chunk nunca mezcla dos secciones', () => {
  const md = ['## Alfa', '', parrafo(1), '', '## Beta', '', parrafo(2)].join('\n')
  const chunks = chunkMarkdown(md)
  assert.equal(chunks.length, 2)
  assert.ok(at(chunks, 0).content.includes('numero 1') && !at(chunks, 0).content.includes('numero 2'))
  assert.ok(at(chunks, 1).content.includes('numero 2') && !at(chunks, 1).content.includes('numero 1'))
})

test('una sección larga se parte en varios chunks y ninguno excede el máximo', () => {
  const cuerpo = Array.from({ length: 40 }, (_, i) => parrafo(i)).join('\n\n')
  const chunks = chunkMarkdown(`## Sección larga\n\n${cuerpo}`)

  assert.ok(chunks.length > 1, 'debería partirse en más de un chunk')
  for (const chunk of chunks) {
    assert.ok(
      chunk.tokenCount <= MAX_TOKENS,
      `chunk ${chunk.ord} con ${chunk.tokenCount} tokens supera el máximo`
    )
    assert.equal(chunk.heading, 'Sección larga')
  }
})

test('los ord son correlativos desde 0 y sin huecos', () => {
  const cuerpo = Array.from({ length: 30 }, (_, i) => parrafo(i)).join('\n\n')
  const chunks = chunkMarkdown(`## Uno\n\n${cuerpo}\n\n## Dos\n\n${cuerpo}`)
  chunks.forEach((chunk, index) => assert.equal(chunk.ord, index))
})

test('es determinista: el mismo markdown produce los mismos chunks', () => {
  const md = ['# Guía', '', parrafo(1), '', '## Detalle', '', parrafo(2), '', parrafo(3)].join('\n')
  assert.deepEqual(chunkMarkdown(md), chunkMarkdown(md))
})

test('un bloque de código no se parte ni se confunde con un encabezado', () => {
  const md = ['## Ejemplo', '', '```', '# esto es un comentario, no un heading', 'const x = 1', '```'].join('\n')
  const chunks = chunkMarkdown(md)
  assert.equal(chunks.length, 1)
  assert.equal(at(chunks, 0).heading, 'Ejemplo')
  assert.match(at(chunks, 0).content, /const x = 1/)
})

test('un párrafo gigante sin puntuación igual se parte bajo el máximo', () => {
  const chunks = chunkMarkdown(`## Denso\n\n${'palabra '.repeat(2000)}`)
  assert.ok(chunks.length > 1)
  for (const chunk of chunks) assert.ok(chunk.tokenCount <= MAX_TOKENS)
})

test('un fragmento diminuto se fusiona con el anterior de la misma sección', () => {
  const chunks = chunkMarkdown(`## Sección\n\n${parrafo(1)}\n\nOk.`)
  assert.equal(chunks.length, 1)
  assert.match(at(chunks, 0).content, /Ok\./)
})

test('markdown vacío o sólo espacios no produce chunks', () => {
  assert.deepEqual(chunkMarkdown(''), [])
  assert.deepEqual(chunkMarkdown('   \n\n  \n'), [])
})

test('estimateTokens ignora el espacio alrededor', () => {
  assert.equal(estimateTokens('    '), 0)
  assert.equal(estimateTokens('abcd'), 1)
})
