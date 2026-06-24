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
      'Priorizas preservar tu capital por sobre maximizar el rendimiento. Toleras poca volatilidad y preferis instrumentos estables.',
    recommendations: [
      'Concentra la mayor parte en renta fija y money market.',
      'Limita la exposicion a cripto y acciones volatiles.',
      'Manten un fondo de emergencia antes de invertir.',
      'Revisa tu cartera de forma periodica, sin sobrerreaccionar a las bajas.',
    ],
  },
  moderate: {
    description:
      'Buscas un equilibrio entre crecimiento y estabilidad. Aceptas algo de volatilidad a cambio de mejor rendimiento en el mediano plazo.',
    recommendations: [
      'Combina renta fija con una porcion de acciones y ETFs diversificados.',
      'Suma cripto de forma acotada, como satelite de la cartera.',
      'Diversifica por tipo de activo y moneda.',
      'Rebalancea cuando una clase de activo se desvie de tu objetivo.',
    ],
  },
  aggressive: {
    description:
      'Priorizas maximizar el rendimiento y toleras caidas fuertes en el corto plazo. Tu horizonte es largo y aceptas alta volatilidad.',
    recommendations: [
      'Mayor peso en acciones de crecimiento, ETFs y cripto.',
      'Aprovecha las bajas para promediar posiciones de conviccion.',
      'Diversifica igual: la concentracion extrema agrega riesgo evitable.',
      'Define limites de perdida para no exponerte de mas.',
    ],
  },
}

export function profileContent(profile: RiskProfileType): ProfileContent {
  return CONTENT[profile]
}
