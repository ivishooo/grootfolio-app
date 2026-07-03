/**
 * Logica de puntaje del cuestionario de perfil de inversor (GF-2 / GF-9).
 *
 * El perfil surge de la suma de los `score` de las opciones elegidas. Con el
 * cuestionario actual (4 preguntas) el rango es 4..17. Umbrales por tercios:
 *
 *   conservative: <= 8
 *   moderate:     9..13
 *   aggressive:   >= 14
 *
 * Ajustables en un solo lugar (CLASSIFY_THRESHOLDS) si se redefine el puntaje o
 * se suman preguntas. La descripcion y recomendaciones por perfil son contenido
 * estatico: no se persisten, se derivan del perfil al devolver el resultado.
 */
import type { RiskProfileType } from '@grootfolio/shared/types'

export const CLASSIFY_THRESHOLDS = {
  /** score <= conservativeMax -> conservative */
  conservativeMax: 8,
  /** score <= moderateMax -> moderate; por encima -> aggressive */
  moderateMax: 13,
} as const

export function classifyProfile(score: number): RiskProfileType {
  if (score <= CLASSIFY_THRESHOLDS.conservativeMax) return 'conservative'
  if (score <= CLASSIFY_THRESHOLDS.moderateMax) return 'moderate'
  return 'aggressive'
}

export interface ProfileContent {
  description: string
  recommendations: string[]
}

const CONTENT: Record<RiskProfileType, ProfileContent> = {
  conservative: {
    description:
      'Priorizás preservar tu capital por sobre maximizar el rendimiento. Tolerás poca volatilidad y preferís instrumentos estables.',
    recommendations: [
      'Concentrá la mayor parte en renta fija y money market.',
      'Limitá la exposición a cripto y acciones volátiles.',
      'Mantené un fondo de emergencia antes de invertir.',
      'Revisá tu cartera de forma periódica, sin sobrerreaccionar a las bajas.',
    ],
  },
  moderate: {
    description:
      'Buscás un equilibrio entre crecimiento y estabilidad. Aceptás algo de volatilidad a cambio de mejor rendimiento en el mediano plazo.',
    recommendations: [
      'Combiná renta fija con una porción de acciones y ETFs diversificados.',
      'Sumá cripto de forma acotada, como satélite de la cartera.',
      'Diversificá por tipo de activo y moneda.',
      'Rebalanceá cuando una clase de activo se desvíe de tu objetivo.',
    ],
  },
  aggressive: {
    description:
      'Priorizás maximizar el rendimiento y tolerás caídas fuertes en el corto plazo. Tu horizonte es largo y aceptás alta volatilidad.',
    recommendations: [
      'Mayor peso en acciones de crecimiento, ETFs y cripto.',
      'Aprovechá las bajas para promediar posiciones de convicción.',
      'Diversificá igual: la concentración extrema agrega riesgo evitable.',
      'Definí límites de pérdida para no exponerte de más.',
    ],
  },
}

export function profileContent(profile: RiskProfileType): ProfileContent {
  return CONTENT[profile]
}
