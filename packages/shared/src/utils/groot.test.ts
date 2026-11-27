/**
 * Tests de Groot (rediseño v2, Fase 3). Los textos son finales (SPEC-pantallas
 * › Groot): si cambia un copy, el test lo marca a propósito.
 */
import { describe, it, expect } from 'vitest'
import { ANIMO, BAJA_FUERTE, CRIPTO_SUGERIDA, animoIndexFor, grootContenido, grootDayKey, type GrootDatos } from './groot'

const base: GrootDatos = { totalValue: 'US$ 43.135', dayPct: 1.2, topUp: 'Bitcoin', topDown: 'Ethereum' }

describe('grootContenido · resumen', () => {
  it('día que sube: calm, dice cuánto y cuánto vale', () => {
    const c = grootContenido('resumen', base)
    expect(c.mood).toBe('calm')
    expect(c.label).toBe('tu día')
    expect(c.msg).toBe('Hoy tu portafolio subió 1,2 %. Vale US$ 43.135.')
    expect(c.sub).toBe('Bitcoin empuja. Ethereum sigue abajo de lo que pagaste.')
    expect(c.actions.map((a) => a.id)).toEqual(['ver-activos', 'chat'])
  })

  it(`el umbral de baja fuerte es ${BAJA_FUERTE}: -2 asusta y -1,9 no`, () => {
    const fuerte = grootContenido('resumen', { ...base, dayPct: -2 })
    expect(fuerte.mood).toBe('scared')
    expect(fuerte.msg).toBe('Hoy bajó 2 %. Me asusté un poco, pero es un día, no una tendencia.')
    expect(fuerte.sub).toBe('Ethereum explica casi toda la baja.')
    expect(fuerte.actions[0]!.label).toBe('Ver qué bajó')

    const leve = grootContenido('resumen', { ...base, dayPct: -1.9 })
    expect(leve.mood).toBe('calm')
    expect(leve.msg).toBe('Hoy tu portafolio bajó 1,9 %. Vale US$ 43.135.')
  })

  it('sin variación del día (dayPct null) dice el valor y avisa', () => {
    const c = grootContenido('resumen', { totalValue: 'US$ 43.135', dayPct: null })
    expect(c.mood).toBe('calm')
    expect(c.msg).toBe('Tu portafolio vale US$ 43.135.')
    expect(c.sub).toBe('Todavía no tengo la variación de hoy.')
  })

  it('sin activos destacados no inventa el subtexto', () => {
    expect(grootContenido('resumen', { totalValue: 'US$ 10', dayPct: 0.5 }).sub).toBeNull()
  })
})

describe('grootContenido · demás modos', () => {
  it('animo rota por índice, también con índices fuera de rango', () => {
    expect(grootContenido('animo', base, 0).msg).toBe(ANIMO[0])
    expect(grootContenido('animo', base, ANIMO.length + 1).msg).toBe(ANIMO[1])
    expect(grootContenido('animo', base, -1).msg).toBe(ANIMO[ANIMO.length - 1])
    expect(grootContenido('animo', base).mood).toBe('happy')
  })

  it('cargado: singular y plural de posiciones', () => {
    expect(grootContenido('cargado', { ...base, lastTx: { qty: '0,05', symbol: 'BTC', positions: 6 } }).msg).toBe(
      'Anotado: 0,05 BTC. Ya son 6 posiciones.',
    )
    expect(grootContenido('cargado', { ...base, lastTx: { qty: '1', symbol: 'AAPL', positions: 1 } }).msg).toBe(
      'Anotado: 1 AAPL. Ya es 1 posición.',
    )
    expect(grootContenido('cargado', base).msg).toBe('Anotado.')
  })

  it('reportes: vez / veces y el caso sin ventas', () => {
    expect(grootContenido('reportes', { ...base, realized: { year: 2026, sells: 3, amount: 'US$ 1.240' } }).msg).toBe(
      'Este año vendiste 3 veces y ganaste US$ 1.240 en lo que cerraste.',
    )
    expect(grootContenido('reportes', { ...base, realized: { year: 2026, sells: 1, amount: 'US$ 80' } }).msg).toContain('1 vez')
    expect(grootContenido('reportes', { ...base, realized: { year: 2026, sells: 0, amount: 'US$ 0' } }).msg).toBe(
      'Todavía no vendiste nada este año, así que no hay ganancia realizada.',
    )
  })

  it('contenido: singular/plural, con y sin duración, y sin novedades', () => {
    expect(
      grootContenido('contenido', { ...base, newContent: { count: 2, title: 'Diversificar sin volverse loco', minutes: 4 } }).msg,
    ).toBe('Hay 2 materiales nuevos. «Diversificar sin volverse loco» se lee en 4 minutos.')
    expect(grootContenido('contenido', { ...base, newContent: { count: 1, title: 'Glosario', minutes: null } }).msg).toBe(
      'Hay 1 material nuevo. Empezá por «Glosario».',
    )
    expect(grootContenido('contenido', base).mood).toBe('calm')
  })

  it('perfil: compara con lo sugerido y no da órdenes', () => {
    const c = grootContenido('perfil', { ...base, profile: { label: 'Moderado', cryptoNow: 59, cryptoSuggested: CRIPTO_SUGERIDA.moderate } })
    expect(c.msg).toBe('Sos moderado. Hoy tenés 59 % en cripto y para tu perfil sugerimos 15 %.')
    expect(c.sub).toBe('No es una orden, es para que lo tengas en cuenta.')
    expect(grootContenido('perfil', base).msg).toContain('Todavía no hiciste el test')
  })

  it('ningún modo recomienda comprar ni vender', () => {
    const modos = ['resumen', 'animo', 'cargar', 'cargado', 'reportes', 'contenido', 'perfil'] as const
    for (const m of modos) {
      const c = grootContenido(m, { ...base, dayPct: -5 })
      expect(`${c.msg} ${c.sub ?? ''}`).not.toMatch(/\b(comprá|vendé|te conviene|deberías)\b/i)
    }
  })
})

describe('animoIndexFor y grootDayKey', () => {
  it('animoIndexFor está siempre dentro de ANIMO y cambia de un día al otro', () => {
    const a = animoIndexFor(new Date(2026, 10, 26))
    const b = animoIndexFor(new Date(2026, 10, 27))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(ANIMO.length)
    expect(b).toBe((a + 1) % ANIMO.length)
  })

  it('grootDayKey usa la fecha local con ceros', () => {
    expect(grootDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
