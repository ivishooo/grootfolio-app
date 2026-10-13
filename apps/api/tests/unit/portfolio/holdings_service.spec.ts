/**
 * Tests unitarios de `aggregateHoldings` (GF-213): agregacion WAC de
 * transacciones a holdings y normalizacion del costo a USD.
 *
 * Corren con `node:test` (sin Japa, igual que los specs de FX): la funcion es
 * pura, no toca red ni DB. Los fixtures imitan el shape que Lucid entrega
 * (asset precargado, purchasedAt como DateTime de luxon).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DateTime } from 'luxon'
import type Transaction from '../../../app/models/transaction.js'
import type Asset from '../../../app/models/asset.js'
import { aggregateHoldings } from '../../../app/services/portfolio/holdings_service.js'

const closeTo = (actual: number, expected: number, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ~= ${expected}`)

const asset = (symbol: string, type: Asset['type'] = 'stock', currency = 'USD') =>
  ({ id: `asset-${symbol}`, symbol, name: symbol, type, currency }) as Asset

interface TxInput {
  symbol: string
  kind?: 'buy' | 'sell'
  quantity: number
  unitPrice: number
  fee?: number
  priceCurrency?: string
  at?: string
  type?: Asset['type']
}

const tx = (t: TxInput) =>
  ({
    id: `tx-${t.symbol}-${t.at ?? '2025-01-01'}-${t.quantity}`,
    assetId: `asset-${t.symbol}`,
    asset: asset(t.symbol, t.type ?? 'stock'),
    kind: t.kind ?? 'buy',
    quantity: t.quantity,
    unitPrice: t.unitPrice,
    fee: t.fee ?? 0,
    priceCurrency: t.priceCurrency ?? 'USD',
    purchasedAt: DateTime.fromISO(`${t.at ?? '2025-01-01'}T12:00:00Z`),
  }) as Transaction

test('WAC: dos compras promedian el costo ponderado por cantidad', () => {
  const [h] = aggregateHoldings([
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 200, at: '2025-02-01' }),
  ])
  assert.equal(h!.quantity, 20)
  closeTo(h!.avgPrice, 150)
})

test('WAC: la comision de la compra entra en el costo base', () => {
  const [h] = aggregateHoldings([
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, fee: 50, at: '2025-01-01' }),
  ])
  // (10 * 100 + 50) / 10
  closeTo(h!.avgPrice, 105)
})

test('una venta parcial reduce la cantidad pero no mueve el avgPrice', () => {
  const [h] = aggregateHoldings([
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', kind: 'sell', quantity: 4, unitPrice: 500, at: '2025-02-01' }),
  ])
  assert.equal(h!.quantity, 6)
  closeTo(h!.avgPrice, 100)
})

test('vender toda la posicion la saca del listado de holdings', () => {
  const holdings = aggregateHoldings([
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 150, at: '2025-02-01' }),
  ])
  assert.deepEqual(holdings, [])
})

test('vender mas de lo que se tiene cierra la posicion sin dejar residuo', () => {
  const holdings = aggregateHoldings([
    tx({ symbol: 'AAPL', quantity: 5, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', kind: 'sell', quantity: 50, unitPrice: 150, at: '2025-02-01' }),
  ])
  assert.deepEqual(holdings, [])
})

test('reabrir una posicion cerrada arranca un avgPrice nuevo', () => {
  const [h] = aggregateHoldings([
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 150, at: '2025-02-01' }),
    tx({ symbol: 'AAPL', quantity: 2, unitPrice: 300, at: '2025-03-01' }),
  ])
  assert.equal(h!.quantity, 2)
  closeTo(h!.avgPrice, 300)
})

test('una venta antes de cualquier compra no genera posicion ni costo negativo', () => {
  const holdings = aggregateHoldings([
    tx({ symbol: 'AAPL', kind: 'sell', quantity: 5, unitPrice: 100, at: '2025-01-01' }),
  ])
  assert.deepEqual(holdings, [])
})

test('las transacciones se ordenan por fecha aunque lleguen desordenadas', () => {
  const desordenadas = aggregateHoldings([
    tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 150, at: '2025-02-01' }),
    tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', quantity: 2, unitPrice: 300, at: '2025-03-01' }),
  ])
  // Si no ordenara, la venta inicial se descartaria y quedarian 12 unidades.
  assert.equal(desordenadas[0]!.quantity, 2)
  closeTo(desordenadas[0]!.avgPrice, 300)
})

test('el costo en moneda no-USD se normaliza con la tasa recibida', () => {
  const rate = 1 / 1600 // 1 ARS en USD
  const [h] = aggregateHoldings(
    [tx({ symbol: 'GGAL.BA', quantity: 10, unitPrice: 8000, priceCurrency: 'ARS', at: '2025-01-01' })],
    () => rate
  )
  closeTo(h!.avgPrice, 8000 * rate)
})

test('la comision tambien se convierte con la tasa de su moneda', () => {
  const rate = 1 / 1600
  const [h] = aggregateHoldings(
    [tx({ symbol: 'GGAL.BA', quantity: 10, unitPrice: 8000, fee: 1600, priceCurrency: 'ARS', at: '2025-01-01' })],
    () => rate
  )
  closeTo(h!.avgPrice, (10 * 8000 * rate + 1600 * rate) / 10)
})

test('una transaccion en USD ignora la tasa inyectada', () => {
  const [h] = aggregateHoldings(
    [tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' })],
    () => 0.001
  )
  closeTo(h!.avgPrice, 100)
})

test('cada compra se convierte con la tasa de SU fecha, no con una sola tasa', () => {
  // Misma cantidad y mismo precio nominal en ARS, pero un año de devaluacion
  // entre una y otra: el promedio en USD tiene que quedar en el medio.
  const rates: Record<string, number> = { '2024-01-01': 1 / 800, '2025-01-01': 1 / 1600 }
  const [h] = aggregateHoldings(
    [
      tx({ symbol: 'GGAL.BA', quantity: 10, unitPrice: 8000, priceCurrency: 'ARS', at: '2024-01-01' }),
      tx({ symbol: 'GGAL.BA', quantity: 10, unitPrice: 8000, priceCurrency: 'ARS', at: '2025-01-01' }),
    ],
    (t) => rates[t.purchasedAt.toISODate()!]!
  )
  closeTo(h!.avgPrice, (10 * 8000 * (1 / 800) + 10 * 8000 * (1 / 1600)) / 20)
})

test('cada activo se agrega por separado y el resultado sale ordenado por symbol', () => {
  const holdings = aggregateHoldings([
    tx({ symbol: 'MSFT', quantity: 1, unitPrice: 300, at: '2025-01-01' }),
    tx({ symbol: 'AAPL', quantity: 1, unitPrice: 100, at: '2025-01-01' }),
    tx({ symbol: 'BTC', quantity: 1, unitPrice: 50000, at: '2025-01-01', type: 'crypto' }),
  ])
  assert.deepEqual(holdings.map((h) => h.asset.symbol), ['AAPL', 'BTC', 'MSFT'])
})

test('los holdings nacen sin precio: currentPrice/value/pnl en 0 y pnlPercent null', () => {
  const [h] = aggregateHoldings([tx({ symbol: 'AAPL', quantity: 1, unitPrice: 100 })])
  assert.equal(h!.currentPrice, 0)
  assert.equal(h!.value, 0)
  assert.equal(h!.pnl, 0)
  assert.equal(h!.pnlPercent, null)
})

test('falla explicito si el asset no viene precargado', () => {
  const sinAsset = { ...tx({ symbol: 'AAPL', quantity: 1, unitPrice: 100 }), asset: undefined } as unknown as Transaction
  assert.throws(() => aggregateHoldings([sinAsset]), /asset debe estar precargado/)
})
