/**
 * Tests del cliente HTTP de FX (GF-219) mockeando `fetch` global. Validan que
 * cada fuente se mapee a `rateToUsd` y que un status no-ok levante Error.
 * Runner nativo `node:test`; sin red real.
 */
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchCclRateToUsd,
  fetchFrankfurterRates,
  fetchOficialRateToUsd,
} from '../../../app/services/prices/fx/fx_client.js'

const realFetch = globalThis.fetch

const closeTo = (actual: number | undefined, expected: number, eps = 1e-9) => {
  assert.ok(actual !== undefined && Math.abs(actual - expected) < eps, `${actual} ~= ${expected}`)
}

afterEach(() => {
  globalThis.fetch = realFetch
})

function stubFetch(body: unknown, ok = true, status = 200) {
  globalThis.fetch = (async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch
}

test('fetchFrankfurterRates mapea symbols a rateToUsd', async () => {
  stubFetch({ base: 'USD', rates: { EUR: 0.87252, GBP: 0.75594 } })
  const rates = await fetchFrankfurterRates(['EUR', 'GBP'])
  closeTo(rates.EUR, 1 / 0.87252)
  closeTo(rates.GBP, 1 / 0.75594)
})

test('fetchFrankfurterRates con lista vacia no llama a la red', async () => {
  globalThis.fetch = (() => {
    throw new Error('no deberia llamarse')
  }) as unknown as typeof fetch
  assert.deepEqual(await fetchFrankfurterRates([]), {})
})

test('fetchCclRateToUsd parsea el shape de dolarapi', async () => {
  stubFetch({ casa: 'contadoconliqui', compra: 1507, venta: 1508.9 })
  const rate = await fetchCclRateToUsd()
  assert.ok(rate !== null && Math.abs(rate - 1 / ((1507 + 1508.9) / 2)) < 1e-9)
})

test('fetchOficialRateToUsd parsea el shape del BCRA', async () => {
  stubFetch({ results: [{ detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 1451 }] }] })
  const rate = await fetchOficialRateToUsd()
  assert.ok(rate !== null && Math.abs(rate - 1 / 1451) < 1e-9)
})

test('un status no-ok levanta Error', async () => {
  stubFetch({ message: 'boom' }, false, 503)
  await assert.rejects(() => fetchCclRateToUsd(), /dolarapi HTTP 503/)
})
