import type { QuizQuestion, RiskProfileResult } from '@grootfolio/shared'

// El portfolio ya consume datos reales (GF-225). Estos mocks quedan solo para
// el Test de Perfil, que aun no tiene backend.
export const mockQuiz: QuizQuestion[] = [
  {
    id: 'q1', order: 1,
    text: 'Que experiencia previa tenes en inversiones?',
    options: [
      { id: 'q1-o1', label: 'No tengo experiencia en inversiones', score: 1 },
      { id: 'q1-o2', label: 'Invierto en plazo fijo', score: 2 },
      { id: 'q1-o3', label: 'Invierto en bonos, letras u obligaciones negociables', score: 3 },
      { id: 'q1-o4', label: 'Invierto en acciones', score: 4 },
      { id: 'q1-o5', label: 'Invierto en instrumentos como CFD, futuros u opciones', score: 5 },
    ],
  },
  {
    id: 'q2', order: 2,
    text: 'Cual es tu horizonte de inversion?',
    options: [
      { id: 'q2-o1', label: 'Menos de 1 ano', score: 1 },
      { id: 'q2-o2', label: 'Entre 1 y 3 anos', score: 2 },
      { id: 'q2-o3', label: 'Entre 3 y 5 anos', score: 3 },
      { id: 'q2-o4', label: 'Mas de 5 anos', score: 4 },
    ],
  },
  {
    id: 'q3', order: 3,
    text: 'Como reaccionarias ante una caida del 20% en tu portafolio?',
    options: [
      { id: 'q3-o1', label: 'Vendo todo para evitar perder mas', score: 1 },
      { id: 'q3-o2', label: 'Vendo una parte para limitar perdidas', score: 2 },
      { id: 'q3-o3', label: 'Mantengo posiciones y espero', score: 3 },
      { id: 'q3-o4', label: 'Compro mas aprovechando los precios bajos', score: 4 },
    ],
  },
  {
    id: 'q4', order: 4,
    text: 'Que porcentaje de tus ingresos pensas invertir?',
    options: [
      { id: 'q4-o1', label: 'Menos del 10%', score: 1 },
      { id: 'q4-o2', label: 'Entre 10% y 25%', score: 2 },
      { id: 'q4-o3', label: 'Entre 25% y 50%', score: 3 },
      { id: 'q4-o4', label: 'Mas del 50%', score: 4 },
    ],
  },
]

export const mockProfileResult: RiskProfileResult = {
  profile: 'conservative',
  score: 8,
  description: 'Buscas un balance entre riesgo y rendimiento...',
  recommendations: [
    'Diversifica tu portafolio segun tu nivel de riesgo',
    'Revisa tus inversiones regularmente',
    'Manten un fondo de emergencia antes de invertir',
    'Continua educandote sobre finanzas e inversiones',
  ],
  calculatedAt: new Date().toISOString(),
}
