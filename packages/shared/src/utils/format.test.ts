/**
 * Tests de regresión de los formateadores. Cada bloque cubre un bug concreto
 * que se encontró haciendo QA de la web, para que no vuelva.
 */
import { describe, it, expect } from 'vitest'
import {
  dateInputToISO,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatPercent,
  formatShare,
  isoToDateInput,
} from './index'
import { createTransactionInputSchema } from '../schemas'

/**
 * `Intl` separa el símbolo de moneda del número con un espacio duro (U+00A0)
 * para que no se corte en un salto de línea. Es el comportamiento deseado, así
 * que los tests lo esperan explícitamente en vez de normalizarlo.
 */
const nb = (s: string) => s.replace(/ /g, '\u00a0')

describe('formatCurrency', () => {
  it('sin decimales de mil para arriba', () => {
    expect(formatCurrency(4941)).toBe(nb('US$ 4.941'))
    expect(formatCurrency(0)).toBe(nb('US$ 0'))
  })

  it('conserva los centavos abajo de mil, que antes se redondeaban a cero', () => {
    // Con `maximumFractionDigits: 0` fijo, US$ 0,45 se mostraba como "US$ 0".
    expect(formatCurrency(0.45)).toBe(nb('US$ 0,4500'))
    expect(formatCurrency(12.5)).toBe(nb('US$ 12,50'))
  })

  it('respeta la moneda pedida', () => {
    expect(formatCurrency(1234, 'ARS')).toBe(nb('$ 1.234'))
    expect(formatCurrency(1234, 'EUR')).toBe(nb('EUR 1.234'))
  })

  it('devuelve — para valores que no son números', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency(Number.NaN)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('signo y coma decimal es-AR', () => {
    expect(formatPercent(33.24)).toBe('+33,2%')
    expect(formatPercent(-16.75)).toBe('-16,8%')
  })

  it('null es "—", no "0,0%"', () => {
    // El bug: una posición sin base de costo mostraba "0,0%" al lado de una
    // ganancia de US$ 39.225, que se lee como un error de cálculo.
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(undefined)).toBe('—')
    expect(formatPercent(0)).toBe('0,0%')
  })
})

describe('formatShare', () => {
  it('sin signo y con coma', () => {
    expect(formatShare(61.55)).toBe('61,6%')
    expect(formatShare(null)).toBe('—')
  })
})

describe('formatCompactNumber', () => {
  it('no redondea el tick a un valor que no es el suyo', () => {
    // El bug: `(v / 1000).toFixed(0) + 'k'` rotulaba el tick de 1.500 como "2k"
    // y el de 4.500 como "5k", así que la etiqueta no coincidía con su línea.
    expect(formatCompactNumber(1500)).toBe('1,5k')
    expect(formatCompactNumber(4500)).toBe('4,5k')
    expect(formatCompactNumber(6000)).toBe('6k')
    expect(formatCompactNumber(0)).toBe('0')
    expect(formatCompactNumber(20_790_604)).toBe('20,8M')
  })
})

describe('fechas', () => {
  it('formatDate usa es-AR y no el locale del navegador', () => {
    // El bug: dos pantallas llamaban a `toLocaleDateString()` sin locale y
    // mostraban 7/31/2026 mientras el resto mostraba 31/7/2026.
    expect(formatDate('2026-07-31T12:00:00.000-03:00')).toBe('31/7/2026')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('no-es-una-fecha')).toBe('—')
  })

  it('dateInputToISO conserva el día que eligió el usuario', () => {
    // El bug: `new Date('2026-08-01')` se parsea como medianoche UTC, que en
    // Argentina (-03:00) cae el 31/07 a las 21:00. La operación quedaba
    // guardada un día antes y el desfasaje llegaba al gráfico y al ledger.
    const iso = dateInputToISO('2026-08-01')
    const back = new Date(iso)
    expect(back.getFullYear()).toBe(2026)
    expect(back.getMonth()).toBe(7) // agosto
    expect(back.getDate()).toBe(1)
  })

  it('ida y vuelta entre input date e ISO es estable', () => {
    for (const day of ['2026-01-01', '2026-08-01', '2026-12-31']) {
      expect(isoToDateInput(dateInputToISO(day))).toBe(day)
    }
  })

  it('isoToDateInput tolera vacío', () => {
    expect(isoToDateInput(null)).toBe('')
    expect(isoToDateInput('cualquier cosa')).toBe('')
  })
})

describe('createTransactionInputSchema', () => {
  const base = {
    symbol: 'BTC',
    type: 'crypto' as const,
    kind: 'buy' as const,
    quantity: 0.5,
    unitPrice: 60000,
    fee: 0,
    priceCurrency: 'USD',
    purchasedAt: '2026-08-01T12:00:00.000-03:00',
  }

  it('acepta una compra válida', () => {
    expect(createTransactionInputSchema.safeParse(base).success).toBe(true)
  })

  it('rechaza precio unitario 0', () => {
    // El bug: `.nonnegative()` dejaba pasar precio 0, la posición quedaba sin
    // base de costo y el P&L del portafolio pasaba a ser el valor de mercado.
    const r = createTransactionInputSchema.safeParse({ ...base, unitPrice: 0 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.unitPrice?.[0]).toBe(
        'El precio unitario debe ser mayor a 0'
      )
    }
  })

  it('los mensajes de validación están en castellano', () => {
    const r = createTransactionInputSchema.safeParse({ ...base, symbol: '', purchasedAt: 'x' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const errors = r.error.flatten().fieldErrors
      // Antes salían los defaults de Zod en inglés: "String must contain at
      // least 1 character(s)" e "Invalid datetime".
      expect(errors.symbol?.[0]).toBe('Elegí un activo del catálogo')
      expect(errors.purchasedAt?.[0]).toBe('Elegí una fecha válida')
    }
  })
})
