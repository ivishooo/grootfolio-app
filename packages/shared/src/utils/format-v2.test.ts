/**
 * Formateadores del rediseño v2 (Fase 4).
 */
import { describe, it, expect } from 'vitest'
import { formatPctArrow, formatQuantity } from './index'

describe('formatQuantity', () => {
  it('borra la cola de float de sumar compras parciales', () => {
    expect(formatQuantity(1.4000000000000001)).toBe('1,4')
    expect(formatQuantity(0.1 + 0.2)).toBe('0,3')
  })
  it('respeta hasta 8 decimales (cripto) y miles en es-AR', () => {
    expect(formatQuantity(0.00012345)).toBe('0,00012345')
    expect(formatQuantity(1200)).toBe('1.200')
  })
  it('sin valor da raya', () => {
    expect(formatQuantity(null)).toBe('—')
    expect(formatQuantity(Number.NaN)).toBe('—')
  })
})

describe('formatPctArrow', () => {
  it('flecha arriba o abajo según el signo, con espacio antes del %', () => {
    expect(formatPctArrow(58.64)).toBe('▲ 58,6 %')
    expect(formatPctArrow(-13.6)).toBe('▼ 13,6 %')
    expect(formatPctArrow(0)).toBe('▲ 0,0 %')
  })
  it('sin rentabilidad calculable da raya', () => {
    expect(formatPctArrow(null)).toBe('—')
  })
})
