/**
 * Tests de los helpers puros de la variacion del dia (GF-019, ADR-0007):
 * porcentaje, lectura desde `price_snapshots.raw` (solo si es de hoy), fechas
 * en hora argentina y agregado ponderado de la cartera. Sin red ni DB.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  asPct,
  dayChangeFromRaw,
  isoDateInZone,
  pctChange,
  portfolioDayChange,
  previousIsoDateInZone,
} from '../../../app/services/prices/day_change.js'

const closeTo = (actual: number | null, expected: number, eps = 1e-9) =>
  assert.ok(actual !== null && Math.abs(actual - expected) < eps, `${actual} ~= ${expected}`)

test('pctChange: subida, bajada y sin cambio', () => {
  closeTo(pctChange(102, 100), 2)
  closeTo(pctChange(98, 100), -2)
  closeTo(pctChange(100, 100), 0)
})

test('pctChange: sin referencia valida devuelve null, no Infinity', () => {
  assert.equal(pctChange(100, 0), null)
  assert.equal(pctChange(100, -5), null)
  assert.equal(pctChange(Number.NaN, 100), null)
  assert.equal(pctChange(0, 100), null)
})

test('asPct acepta numeros finitos y descarta el resto', () => {
  assert.equal(asPct(-3.2), -3.2)
  assert.equal(asPct(0), 0)
  assert.equal(asPct(undefined), null)
  assert.equal(asPct('1.5'), null)
  assert.equal(asPct(Number.POSITIVE_INFINITY), null)
})

// 2026-11-28 15:00 en Buenos Aires (UTC-3) = 18:00 UTC.
const HOY_15HS = Date.UTC(2026, 10, 28, 18)

test('isoDateInZone usa la hora argentina, no UTC', () => {
  // 2026-11-29 01:00 UTC todavia es 28 a las 22:00 en Buenos Aires.
  assert.equal(isoDateInZone(Date.UTC(2026, 10, 29, 1)), '2026-11-28')
  assert.equal(isoDateInZone(HOY_15HS), '2026-11-28')
})

test('previousIsoDateInZone da el dia anterior, tambien al cruzar de mes', () => {
  assert.equal(previousIsoDateInZone(HOY_15HS), '2026-11-27')
  assert.equal(previousIsoDateInZone(Date.UTC(2026, 11, 1, 15)), '2026-11-30')
  assert.equal(previousIsoDateInZone(Date.UTC(2027, 0, 1, 15)), '2026-12-31')
})

test('dayChangeFromRaw devuelve la variacion de un snapshot de hoy', () => {
  const hace1h = HOY_15HS - 60 * 60 * 1000
  assert.equal(dayChangeFromRaw({ dayChangePct: -2.4 }, hace1h, HOY_15HS), -2.4)
})

test('dayChangeFromRaw descarta la variacion de un snapshot de ayer', () => {
  const ayer = HOY_15HS - 24 * 60 * 60 * 1000
  assert.equal(dayChangeFromRaw({ dayChangePct: -2.4 }, ayer, HOY_15HS), null)
})

test('dayChangeFromRaw sin raw o sin el campo es null', () => {
  assert.equal(dayChangeFromRaw(null, HOY_15HS, HOY_15HS), null)
  assert.equal(dayChangeFromRaw({ otro: 1 }, HOY_15HS, HOY_15HS), null)
})

test('portfolioDayChange pondera por valor reconstruyendo el valor de ayer', () => {
  // A: hoy 110 (+10 %, ayer 100). B: hoy 90 (-10 %, ayer 100). Ayer 200, hoy 200.
  closeTo(
    portfolioDayChange([
      { value: 110, dayChangePercent: 10 },
      { value: 90, dayChangePercent: -10 },
    ]),
    0
  )
  // Un solo holding: la cartera se mueve igual que el.
  closeTo(portfolioDayChange([{ value: 500, dayChangePercent: -2.5 }]), -2.5)
})

test('portfolioDayChange ignora holdings sin dato o sin valor; sin ninguno, null', () => {
  closeTo(
    portfolioDayChange([
      { value: 100, dayChangePercent: 1 },
      { value: 1000, dayChangePercent: null },
      { value: 0, dayChangePercent: 50 },
    ]),
    1
  )
  assert.equal(portfolioDayChange([{ value: 100, dayChangePercent: null }]), null)
  assert.equal(portfolioDayChange([]), null)
})
