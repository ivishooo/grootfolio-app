/**
 * Tests unitarios de `aggregatePortfolio` (GF-214): enriquecimiento de holdings
 * con precios y agregados de cartera (totalValue, P&L, mejor activo,
 * distribucion). Funcion pura: no toca red ni DB.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AssetType, Holding } from '@grootfolio/shared/types'
import type { PriceResult } from '../../../app/services/prices/price_service.js'
import { aggregatePortfolio } from '../../../app/services/portfolio/portfolio_service.js'

const closeTo = (actual: number, expected: number, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ~= ${expected}`)

const holding = (symbol: string, quantity: number, avgPrice: number, type: AssetType = 'stock'): Holding => ({
  assetId: `asset-${symbol}`,
  asset: { id: `asset-${symbol}`, symbol, name: symbol, type, currency: 'USD' },
  quantity,
  avgPrice,
  currentPrice: 0,
  value: 0,
  pnl: 0,
  pnlPercent: null,
})

const price = (symbol: string, p: number | null): PriceResult => ({
  symbol,
  price: p,
  source: p === null ? 'unsupported' : 'yahoo',
  fetchedAt: p === null ? null : 1_700_000_000_000,
})

test('enriquece el holding con precio, valor y P&L', () => {
  const { holdings } = aggregatePortfolio([holding('AAPL', 10, 100)], { AAPL: price('AAPL', 150) })
  const h = holdings[0]!
  closeTo(h.currentPrice, 150)
  closeTo(h.value, 1500)
  closeTo(h.pnl, 500)
  closeTo(h.pnlPercent!, 50)
})

test('el lookup de precio es case-insensitive respecto del symbol del activo', () => {
  const { holdings } = aggregatePortfolio([holding('aapl', 1, 100)], { AAPL: price('AAPL', 150) })
  closeTo(holdings[0]!.currentPrice, 150)
})

test('un activo sin cotizacion queda en 0 con pnlPercent null (no 0%)', () => {
  const { holdings } = aggregatePortfolio([holding('AL30', 100, 60, 'bond')], {})
  const h = holdings[0]!
  assert.equal(h.currentPrice, 0)
  assert.equal(h.value, 0)
  assert.equal(h.pnl, 0)
  assert.equal(h.pnlPercent, null)
})

test('los activos sin cotizacion no entran en totalValue ni en el P&L de cartera', () => {
  const p = aggregatePortfolio(
    [holding('AAPL', 10, 100), holding('AL30', 100, 60, 'bond')],
    { AAPL: price('AAPL', 150) }
  )
  closeTo(p.totalValue, 1500)
  closeTo(p.pnlAbsolute, 500) // sin contar los 6000 invertidos en el bono
  closeTo(p.pnlPercent!, 50)
})

test('totalValue y P&L agregan varios activos priceados', () => {
  const p = aggregatePortfolio(
    [holding('AAPL', 10, 100), holding('BTC', 2, 30000, 'crypto')],
    { AAPL: price('AAPL', 150), BTC: price('BTC', 40000) }
  )
  closeTo(p.totalValue, 1500 + 80000)
  closeTo(p.pnlAbsolute, 500 + 20000)
  closeTo(p.pnlPercent!, ((81500 - 61000) / 61000) * 100)
})

test('sin ningun activo priceado, el resumen queda en 0 y pnlPercent null', () => {
  const p = aggregatePortfolio([holding('AL30', 100, 60, 'bond')], {})
  assert.equal(p.totalValue, 0)
  assert.equal(p.pnlAbsolute, 0)
  assert.equal(p.pnlPercent, null)
  assert.equal(p.bestAsset, null)
})

test('un precio null del provider se trata igual que un activo sin precio', () => {
  const p = aggregatePortfolio([holding('AMD', 10, 150)], { AMD: price('AMD', null) })
  assert.equal(p.holdings[0]!.currentPrice, 0)
  assert.equal(p.totalValue, 0)
})

test('bestAsset es el de mayor pnlPercent, no el de mayor valor', () => {
  const p = aggregatePortfolio(
    [holding('AAPL', 100, 100), holding('NVDA', 1, 10)],
    { AAPL: price('AAPL', 110), NVDA: price('NVDA', 100) }
  )
  assert.equal(p.bestAsset!.symbol, 'NVDA') // +900% contra +10%
  closeTo(p.bestAsset!.pnlPercent!, 900)
})

test('con costo base 0 el pnlPercent es null y no compite por mejor activo', () => {
  const p = aggregatePortfolio(
    [holding('AIRDROP', 100, 0, 'crypto'), holding('AAPL', 1, 100)],
    { AIRDROP: price('AIRDROP', 5), AAPL: price('AAPL', 110) }
  )
  assert.equal(p.holdings.find((h) => h.asset.symbol === 'AIRDROP')!.pnlPercent, null)
  assert.equal(p.bestAsset!.symbol, 'AAPL')
})

test('la distribucion agrupa por tipo y omite los tipos sin valor', () => {
  const p = aggregatePortfolio(
    [holding('AAPL', 10, 100), holding('MSFT', 1, 300), holding('BTC', 1, 30000, 'crypto'), holding('AL30', 10, 60, 'bond')],
    { AAPL: price('AAPL', 150), MSFT: price('MSFT', 400), BTC: price('BTC', 40000) }
  )
  const byType = Object.fromEntries(p.distribution.map((d) => [d.type, d.value]))
  closeTo(byType.stock!, 1500 + 400)
  closeTo(byType.crypto!, 40000)
  assert.equal(byType.bond, undefined) // el bono no cotiza: no aparece
})

test('una cartera vacia devuelve un resumen coherente, no una excepcion', () => {
  const p = aggregatePortfolio([], {})
  assert.deepEqual(
    { totalValue: p.totalValue, pnlAbsolute: p.pnlAbsolute, pnlPercent: p.pnlPercent, bestAsset: p.bestAsset },
    { totalValue: 0, pnlAbsolute: 0, pnlPercent: null, bestAsset: null }
  )
  assert.deepEqual(p.distribution, [])
  assert.deepEqual(p.holdings, [])
})
