/**
 * Tests de la normalizacion de tickers para Yahoo. El caso que importa es
 * `BRK.B`: ese ticker invalido estaba en la whitelist vieja y hacia fallar la
 * validacion de schema de yahoo-finance2, que se llevaba puesto el lote entero
 * de cotizaciones (toda la cartera de acciones en US$ 0).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toYahooSymbol } from '../../../app/services/prices/providers/yahoo_symbol_map.js'

test('las clases de accion pasan de punto a guion, que es como las escribe Yahoo', () => {
  assert.equal(toYahooSymbol('BRK.B'), 'BRK-B')
  assert.equal(toYahooSymbol('BF.B'), 'BF-B')
})

test('el sufijo de mercado NO se toca: GGAL.BA sigue siendo GGAL.BA', () => {
  assert.equal(toYahooSymbol('GGAL.BA'), 'GGAL.BA')
  assert.equal(toYahooSymbol('TGSU2.BA'), 'TGSU2.BA')
  assert.equal(toYahooSymbol('VOD.L'), 'VOD.L')
})

test('un ticker comun vuelve igual, solo normalizado a mayusculas', () => {
  assert.equal(toYahooSymbol('aapl'), 'AAPL')
  assert.equal(toYahooSymbol(' msft '), 'MSFT')
})

test('es idempotente: aplicarlo dos veces da lo mismo', () => {
  assert.equal(toYahooSymbol(toYahooSymbol('BRK.B')), 'BRK-B')
  assert.equal(toYahooSymbol(toYahooSymbol('GGAL.BA')), 'GGAL.BA')
})
