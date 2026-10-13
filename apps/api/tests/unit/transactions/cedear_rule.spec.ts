/**
 * Tests de la regla de CEDEARs (TX_CURRENCY_MISMATCH).
 *
 * El caso que origino la regla: un usuario cargo el CEDEAR de ADBE —que cotiza
 * en pesos en BYMA— contra el ticker de Nasdaq. El motor normalizo ese costo a
 * USD y lo comparo contra el precio del subyacente, ~40 veces mas alto, y el
 * Dashboard mostro +4.109,9% de rentabilidad.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cedearMismatch,
  quoteCurrencyFor,
  sortCedearsFirst,
} from '../../../app/services/assets/cedear_rule.js'

test('una accion de EE.UU. con el precio en pesos se rechaza', () => {
  const r = cedearMismatch('ADBE', 'stock', 'ARS')
  assert.equal(r?.code, 'TX_CURRENCY_MISMATCH')
})

test('el mensaje dice cual es el ticker correcto', () => {
  const r = cedearMismatch('ADBE', 'stock', 'ARS')
  assert.match(r!.message, /ADBE\.BA/)
})

test('el CEDEAR con el precio en pesos es exactamente lo que se espera', () => {
  assert.equal(cedearMismatch('ADBE.BA', 'stock', 'ARS'), null)
  assert.equal(cedearMismatch('GGAL.BA', 'stock', 'ARS'), null)
})

test('una accion de EE.UU. en dolares pasa sin problema', () => {
  assert.equal(cedearMismatch('ADBE', 'stock', 'USD'), null)
})

test('comprar cripto o divisas pagando en pesos sigue siendo valido', () => {
  // El precio en pesos de BTC existe; el de una accion de Nasdaq, no.
  assert.equal(cedearMismatch('BTC', 'crypto', 'ARS'), null)
  assert.equal(cedearMismatch('USD', 'currency', 'ARS'), null)
  assert.equal(cedearMismatch('AL30', 'bond', 'ARS'), null)
})

test('el symbol se compara sin importar mayusculas', () => {
  assert.equal(cedearMismatch('adbe.ba', 'stock', 'ars'), null)
  assert.equal(cedearMismatch('adbe', 'stock', 'ars')?.code, 'TX_CURRENCY_MISMATCH')
})

test('quoteCurrencyFor: los .BA cotizan en pesos y el resto en dolares', () => {
  assert.equal(quoteCurrencyFor('GGAL.BA', 'stock'), 'ARS')
  assert.equal(quoteCurrencyFor('ADBE', 'stock'), 'USD')
  // Solo aplica a acciones: un activo cripto llamado igual no cotiza en pesos.
  assert.equal(quoteCurrencyFor('ADBE.BA', 'crypto'), 'USD')
})

test('sortCedearsFirst pone el CEDEAR arriba de su subyacente', () => {
  const r = sortCedearsFirst([
    { symbol: 'ADBE' },
    { symbol: 'ADB.DE' },
    { symbol: 'ADBE.BA' },
  ])
  assert.deepEqual(r.map((x) => x.symbol), ['ADBE.BA', 'ADBE', 'ADB.DE'])
})

test('sortCedearsFirst no inventa pares ni duplica', () => {
  const r = sortCedearsFirst([{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GGAL.BA' }])
  assert.deepEqual(r.map((x) => x.symbol), ['AAPL', 'MSFT', 'GGAL.BA'])
})

test('sortCedearsFirst es estable con varios pares', () => {
  const r = sortCedearsFirst([
    { symbol: 'AAPL' },
    { symbol: 'ADBE' },
    { symbol: 'AAPL.BA' },
    { symbol: 'ADBE.BA' },
  ])
  assert.deepEqual(r.map((x) => x.symbol), ['AAPL.BA', 'AAPL', 'ADBE.BA', 'ADBE'])
})
