/**
 * Tests unitarios de `computeRealizedPnl` (GF-250): P&L realizado por ventas,
 * con costo WAC y conversion a USD inyectada por el caller. Funcion pura.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DateTime } from 'luxon'
import type Transaction from '../../../app/models/transaction.js'
import type Asset from '../../../app/models/asset.js'
import { computeRealizedPnl } from '../../../app/services/portfolio/reports_service.js'

const asset = (symbol: string, type: Asset['type'] = 'stock') =>
  ({ id: `asset-${symbol}`, symbol, name: symbol, type, currency: 'USD' }) as Asset

interface TxInput {
  symbol: string
  kind?: 'buy' | 'sell'
  quantity: number
  unitPrice: number
  fee?: number
  priceCurrency?: string
  at: string
}

const tx = (t: TxInput) =>
  ({
    id: `tx-${t.symbol}-${t.at}`,
    assetId: `asset-${t.symbol}`,
    asset: asset(t.symbol),
    kind: t.kind ?? 'buy',
    quantity: t.quantity,
    unitPrice: t.unitPrice,
    fee: t.fee ?? 0,
    priceCurrency: t.priceCurrency ?? 'USD',
    purchasedAt: DateTime.fromISO(`${t.at}T12:00:00Z`),
  }) as Transaction

const enUsd = () => 1

test('una venta con ganancia realiza proceeds menos costo base', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 4, unitPrice: 150, at: '2025-02-01' }),
    ],
    enUsd
  )
  assert.equal(r.realizedTotal, 200) // 4*150 - 4*100
  assert.equal(r.realizedByAsset[0]!.proceeds, 600)
  assert.equal(r.realizedByAsset[0]!.costBasis, 400)
  assert.equal(r.realizedByAsset[0]!.quantitySold, 4)
})

test('la comision de la compra sube el costo base y la de la venta baja el ingreso', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, fee: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 150, fee: 50, at: '2025-02-01' }),
    ],
    enUsd
  )
  // proceeds 1500 - 50 = 1450 ; costo 1000 + 100 = 1100
  assert.equal(r.realizedTotal, 350)
})

test('el costo base de la venta usa el promedio WAC al momento de vender', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 200, at: '2025-02-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 5, unitPrice: 200, at: '2025-03-01' }),
    ],
    enUsd
  )
  // avg 150 -> 5*200 - 5*150
  assert.equal(r.realizedTotal, 250)
})

test('una venta con perdida da realizado negativo', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 60, at: '2025-02-01' }),
    ],
    enUsd
  )
  assert.equal(r.realizedTotal, -400)
})

test('vender mas de lo que se tiene realiza solo sobre lo disponible (no hay short)', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 5, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 50, unitPrice: 150, at: '2025-02-01' }),
    ],
    enUsd
  )
  assert.equal(r.realizedByAsset[0]!.quantitySold, 5)
  assert.equal(r.realizedTotal, 250)
})

test('una venta sin posicion previa se ignora', () => {
  const r = computeRealizedPnl(
    [tx({ symbol: 'AAPL', kind: 'sell', quantity: 5, unitPrice: 150, at: '2025-01-01' })],
    enUsd
  )
  assert.deepEqual(r.realizedByAsset, [])
  assert.equal(r.realizedTotal, 0)
})

test('tras cerrar la posicion, la recompra arranca con costo nuevo', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 150, at: '2025-02-01' }),
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 300, at: '2025-03-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 310, at: '2025-04-01' }),
    ],
    enUsd
  )
  // 500 del primer ciclo + 100 del segundo (no arrastra el avg viejo)
  assert.equal(r.realizedTotal, 600)
})

test('un activo que nunca se vendio no aparece en el realizado', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'MSFT', quantity: 1, unitPrice: 300, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 1, unitPrice: 150, at: '2025-02-01' }),
    ],
    enUsd
  )
  assert.deepEqual(r.realizedByAsset.map((a) => a.symbol), ['AAPL'])
})

test('la conversion a USD aplica el rate de cada transaccion a precio y comision', () => {
  const rate = 1 / 1000
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'GGAL.BA', quantity: 10, unitPrice: 1000, priceCurrency: 'ARS', at: '2025-01-01' }),
      tx({ symbol: 'GGAL.BA', kind: 'sell', quantity: 10, unitPrice: 2000, priceCurrency: 'ARS', at: '2025-02-01' }),
    ],
    () => rate
  )
  // (10*2000 - 10*1000) * 0.001
  assert.equal(r.realizedTotal, 10)
})

test('una transaccion en USD ignora el rate inyectado', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 150, at: '2025-02-01' }),
    ],
    () => 0.001 // no deberia aplicarse: priceCurrency es USD
  )
  assert.equal(r.realizedTotal, 500)
})

test('la serie acumulada va en orden cronologico global y suma entre activos', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'MSFT', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'MSFT', kind: 'sell', quantity: 10, unitPrice: 110, at: '2025-02-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 130, at: '2025-03-01' }),
    ],
    enUsd
  )
  assert.deepEqual(r.realizedSeries.map((p) => p.cumulative), [100, 400])
  assert.equal(r.realizedTotal, 400)
})

test('el realizado por activo sale ordenado de mayor a menor', () => {
  const r = computeRealizedPnl(
    [
      tx({ symbol: 'AAPL', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'AAPL', kind: 'sell', quantity: 10, unitPrice: 90, at: '2025-02-01' }),
      tx({ symbol: 'MSFT', quantity: 10, unitPrice: 100, at: '2025-01-01' }),
      tx({ symbol: 'MSFT', kind: 'sell', quantity: 10, unitPrice: 200, at: '2025-02-01' }),
    ],
    enUsd
  )
  assert.deepEqual(r.realizedByAsset.map((a) => a.symbol), ['MSFT', 'AAPL'])
})

test('falla explicito si el asset no viene precargado', () => {
  const sinAsset = { ...tx({ symbol: 'AAPL', quantity: 1, unitPrice: 100, at: '2025-01-01' }), asset: undefined } as unknown as Transaction
  assert.throws(() => computeRealizedPnl([sinAsset], enUsd), /asset debe estar precargado/)
})
