/**
 * Lo que dice Groot, el asistente (rediseño v2, ADR-0006). Lógica pura, sin
 * React ni I/O: la usan web y mobile.
 *
 * IMPORTANTE (ADR-0004): estos mensajes NO salen del LLM. Se arman con datos que
 * la app ya tiene (portafolio, reportes, test de perfil, notificaciones). El chat
 * sigue sin leer la cartera. Groot no recomienda comprar ni vender: describe lo
 * que pasó y lo compara con el perfil.
 */
import type { AssetType, RiskProfileType } from '../types'

export type GrootMood = 'calm' | 'happy' | 'curious' | 'scared'
export type GrootMode = 'resumen' | 'animo' | 'cargar' | 'cargado' | 'reportes' | 'contenido' | 'perfil'
export type GrootActionId = 'ver-activos' | 'chat' | 'mi-resumen' | 'cargar-otro' | 'abrir-contenido' | 'ver-asignacion'
export interface GrootAction {
  id: GrootActionId
  label: string
  kind: 'pri' | 'sec'
}

export interface GrootDatos {
  /** Ya formateado con la moneda del usuario: «US$ 43.135». */
  totalValue: string
  /** Variación del día en %, por ej. 1.2 o −3.4. `null` si no se sabe. */
  dayPct: number | null
  /** Activo que más empuja: «Bitcoin». */
  topUp?: string
  /** Activo que más arrastra o el que está abajo del costo: «Ethereum». */
  topDown?: string
  lastTx?: { qty: string; symbol: string; positions: number }
  realized?: { year: number; sells: number; amount: string }
  /** `minutes` es `null` cuando el material no tiene duración (un documento). */
  newContent?: { count: number; title: string; minutes: number | null }
  profile?: { label: string; cryptoNow: number; cryptoSuggested: number }
}

export interface GrootContenido {
  /** Etiqueta chica al lado de «Groot». */
  label: string
  mood: GrootMood
  msg: string
  sub: string | null
  actions: GrootAction[]
}

/** Umbral a partir del cual la baja del día cambia el tono (y la cara). */
export const BAJA_FUERTE = -2

/**
 * Asignación sugerida por perfil (%), por tipo de activo. Es la referencia
 * educativa que muestra el resultado del test («Tu cartera vs. la sugerida») y
 * la que usa Groot. No es una recomendación de compra o venta.
 */
export const ASIGNACION_SUGERIDA: Record<RiskProfileType, Record<AssetType, number>> = {
  conservative: { bond: 60, stock: 20, crypto: 5, currency: 15 },
  moderate: { bond: 40, stock: 35, crypto: 15, currency: 10 },
  aggressive: { bond: 15, stock: 50, crypto: 30, currency: 5 },
}

/** % de cripto sugerido por perfil (atajo de ASIGNACION_SUGERIDA). */
export const CRIPTO_SUGERIDA: Record<RiskProfileType, number> = {
  conservative: ASIGNACION_SUGERIDA.conservative.crypto,
  moderate: ASIGNACION_SUGERIDA.moderate.crypto,
  aggressive: ASIGNACION_SUGERIDA.aggressive.crypto,
}

export const ANIMO = [
  'Acá estoy. Tranqui, que yo miro los números con vos.',
  'Mirar el portafolio cada cinco minutos no lo hace crecer. Lo probé.',
  'Los gráficos que bajan me asustan un poco. Después se me pasa.',
  'Diversificar es no dormir siempre en el mismo almohadón.',
  'Si algo no lo sé, te lo digo. No invento.',
  'Invertir se parece a una siesta larga: paciencia y poco ruido.',
] as const

const pct = (n: number) => `${Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`

/** Arranca en un mensaje distinto cada día. */
export function animoIndexFor(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86_400_000)
  return day % ANIMO.length
}

/** Fecha local YYYY-MM-DD: sirve para recordar «lo cerró hoy». */
export function grootDayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function grootContenido(mode: GrootMode, d: GrootDatos, animoIdx = 0): GrootContenido {
  const chat: GrootAction = { id: 'chat', label: 'Preguntarme algo', kind: 'pri' }
  switch (mode) {
    case 'animo':
      return {
        label: 'te dice',
        mood: 'happy',
        msg: ANIMO[((animoIdx % ANIMO.length) + ANIMO.length) % ANIMO.length]!,
        sub: 'Tocame para otro ↻',
        actions: [{ id: 'mi-resumen', label: 'Mi resumen', kind: 'sec' }],
      }
    case 'cargar':
      return {
        label: 'cargar',
        mood: 'curious',
        msg: 'Buscá el activo por nombre y yo completo el tipo y la moneda.',
        sub: 'Si compraste un CEDEAR, va el ticker con .BA y el precio en pesos.',
        actions: [],
      }
    case 'cargado': {
      const t = d.lastTx
      return {
        label: '¡anotado!',
        mood: 'happy',
        msg: t
          ? `Anotado: ${t.qty} ${t.symbol}. Ya ${t.positions === 1 ? 'es 1 posición' : `son ${t.positions} posiciones`}.`
          : 'Anotado.',
        sub: 'Lo vas a ver en Inicio y en Activos.',
        actions: [{ id: 'cargar-otro', label: 'Cargar otro', kind: 'sec' }],
      }
    }
    case 'reportes': {
      const r = d.realized
      if (!r || r.sells === 0) {
        return {
          label: 'reportes',
          mood: 'calm',
          msg: 'Todavía no vendiste nada este año, así que no hay ganancia realizada.',
          sub: 'Lo que tenés hoy está en Inicio.',
          actions: [chat],
        }
      }
      return {
        label: 'reportes',
        mood: 'calm',
        msg: `Este año vendiste ${r.sells} ${r.sells === 1 ? 'vez' : 'veces'} y ganaste ${r.amount} en lo que cerraste.`,
        sub: 'Lo que todavía tenés no cuenta acá: eso está en Inicio.',
        actions: [chat],
      }
    }
    case 'contenido': {
      const c = d.newContent
      if (!c || c.count === 0) {
        return { label: 'aprender', mood: 'calm', msg: 'No hay material nuevo. Si querés, repasamos algo de lo básico.', sub: null, actions: [chat] }
      }
      const cuantos = `Hay ${c.count} ${c.count === 1 ? 'material nuevo' : 'materiales nuevos'}.`
      const cuanto = c.minutes ? `«${c.title}» se lee en ${c.minutes} ${c.minutes === 1 ? 'minuto' : 'minutos'}.` : `Empezá por «${c.title}».`
      return { label: 'novedades', mood: 'curious', msg: `${cuantos} ${cuanto}`, sub: null, actions: [{ id: 'abrir-contenido', label: 'Abrirlo', kind: 'sec' }] }
    }
    case 'perfil': {
      const p = d.profile
      if (!p) {
        return { label: 'tu perfil', mood: 'curious', msg: 'Todavía no hiciste el test. Son seis preguntas y te ayuda a leer tu cartera.', sub: null, actions: [] }
      }
      return {
        label: 'tu perfil',
        mood: 'curious',
        msg: `Sos ${p.label.toLowerCase()}. Hoy tenés ${p.cryptoNow} % en cripto y para tu perfil sugerimos ${p.cryptoSuggested} %.`,
        sub: 'No es una orden, es para que lo tengas en cuenta.',
        actions: [{ id: 'ver-asignacion', label: 'Ver asignación', kind: 'sec' }],
      }
    }
    case 'resumen':
    default: {
      const ver: GrootAction = { id: 'ver-activos', label: 'Ver activos', kind: 'sec' }
      if (d.dayPct === null) {
        return { label: 'tu día', mood: 'calm', msg: `Tu portafolio vale ${d.totalValue}.`, sub: 'Todavía no tengo la variación de hoy.', actions: [ver, chat] }
      }
      if (d.dayPct <= BAJA_FUERTE) {
        return {
          label: 'tu día',
          mood: 'scared',
          msg: `Hoy bajó ${pct(d.dayPct)}. Me asusté un poco, pero es un día, no una tendencia.`,
          sub: d.topDown ? `${d.topDown} explica casi toda la baja.` : null,
          actions: [{ ...ver, label: 'Ver qué bajó' }, chat],
        }
      }
      const verb = d.dayPct >= 0 ? 'subió' : 'bajó'
      return {
        label: 'tu día',
        mood: 'calm',
        msg: `Hoy tu portafolio ${verb} ${pct(d.dayPct)}. Vale ${d.totalValue}.`,
        sub: d.topUp ? `${d.topUp} empuja.${d.topDown ? ` ${d.topDown} sigue abajo de lo que pagaste.` : ''}` : null,
        actions: [ver, chat],
      }
    }
  }
}
