/**
 * Tests unitarios de los helpers puros de FX (GF-219). Corren con el runner
 * nativo `node:test` (sin Japa, que llega en GF-205): no tocan red ni DB.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bcraRateToUsd,
  convertToUsd,
  dolarApiRateToUsd,
  frankfurterRateToUsd,
} from '../../../app/services/prices/fx/fx_rates.js'

const closeTo = (actual: number | null, expected: number, eps = 1e-9) => {
  assert.ok(actual !== null && Math.abs(actual - expected) < eps, `${actual} ~= ${expected}`)
}

test('frankfurterRateToUsd invierte unidades-por-USD a USD-por-unidad', () => {
  closeTo(frankfurterRateToUsd({ base: 'USD', rates: { EUR: 0.87252 } }, 'EUR'), 1 / 0.87252)
})

test('frankfurterRateToUsd es case-insensitive con el symbol', () => {
  closeTo(frankfurterRateToUsd({ rates: { GBP: 0.75594 } }, 'gbp'), 1 / 0.75594)
})

test('frankfurterRateToUsd devuelve null si falta el symbol o es <= 0', () => {
  assert.equal(frankfurterRateToUsd({ rates: { EUR: 0.87 } }, 'JPY'), null)
  assert.equal(frankfurterRateToUsd({ rates: { EUR: 0 } }, 'EUR'), null)
  assert.equal(frankfurterRateToUsd({}, 'EUR'), null)
})

test('dolarApiRateToUsd usa el punto medio compra/venta e invierte', () => {
  const mid = (1507 + 1508.9) / 2
  closeTo(dolarApiRateToUsd({ compra: 1507, venta: 1508.9 }), 1 / mid)
})

test('dolarApiRateToUsd tolera un solo lado presente', () => {
  closeTo(dolarApiRateToUsd({ venta: 1500 }), 1 / 1500)
})

test('dolarApiRateToUsd devuelve null sin lados validos', () => {
  assert.equal(dolarApiRateToUsd({}), null)
  assert.equal(dolarApiRateToUsd({ compra: 0, venta: -1 }), null)
})

test('bcraRateToUsd toma la entrada USD de detalle e invierte', () => {
  const payload = {
    results: [{ detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 1451 }] }],
  }
  closeTo(bcraRateToUsd(payload), 1 / 1451)
})

test('bcraRateToUsd devuelve null si no hay USD o cotizacion <= 0', () => {
  assert.equal(bcraRateToUsd({ results: [{ detalle: [{ codigoMoneda: 'EUR', tipoCotizacion: 1 }] }] }), null)
  assert.equal(bcraRateToUsd({ results: [{ detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 0 }] }] }), null)
  assert.equal(bcraRateToUsd({}), null)
})

test('convertToUsd multiplica precio nativo por la tasa', () => {
  // 5500 ARS a ~1450 ARS/USD => ~3.79 USD
  closeTo(convertToUsd(5500, 1 / 1450), 5500 / 1450)
})
