/**
 * Seeder del cuestionario de perfil de inversor (GF-2 / GF-9). Carga las
 * preguntas y opciones con su score. Idempotente via updateOrCreate sobre
 * (order) en preguntas y (question_id, order) en opciones. Data de referencia:
 * corre en todos los entornos. Las preguntas son las del prototipo (GF-198).
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import QuizQuestion from '#models/quiz_question'
import QuizOption from '#models/quiz_option'

interface SeedQuestion {
  order: number
  text: string
  options: Array<{ label: string; score: number }>
}

const QUESTIONS: SeedQuestion[] = [
  {
    order: 1,
    text: 'Que experiencia previa tenes en inversiones?',
    options: [
      { label: 'No tengo experiencia en inversiones', score: 1 },
      { label: 'Invierto en plazo fijo', score: 2 },
      { label: 'Invierto en bonos, letras u obligaciones negociables', score: 3 },
      { label: 'Invierto en acciones', score: 4 },
      { label: 'Invierto en instrumentos como CFD, futuros u opciones', score: 5 },
    ],
  },
  {
    order: 2,
    text: 'Cual es tu horizonte de inversion?',
    options: [
      { label: 'Menos de 1 ano', score: 1 },
      { label: 'Entre 1 y 3 anos', score: 2 },
      { label: 'Entre 3 y 5 anos', score: 3 },
      { label: 'Mas de 5 anos', score: 4 },
    ],
  },
  {
    order: 3,
    text: 'Como reaccionarias ante una caida del 20% en tu portafolio?',
    options: [
      { label: 'Vendo todo para evitar perder mas', score: 1 },
      { label: 'Vendo una parte para limitar perdidas', score: 2 },
      { label: 'Mantengo posiciones y espero', score: 3 },
      { label: 'Compro mas aprovechando los precios bajos', score: 4 },
    ],
  },
  {
    order: 4,
    text: 'Que porcentaje de tus ingresos pensas invertir?',
    options: [
      { label: 'Menos del 10%', score: 1 },
      { label: 'Entre 10% y 25%', score: 2 },
      { label: 'Entre 25% y 50%', score: 3 },
      { label: 'Mas del 50%', score: 4 },
    ],
  },
]

export default class QuizSeeder extends BaseSeeder {
  async run() {
    for (const q of QUESTIONS) {
      const question = await QuizQuestion.updateOrCreate(
        { order: q.order },
        { order: q.order, text: q.text, active: true }
      )
      let optOrder = 1
      for (const o of q.options) {
        await QuizOption.updateOrCreate(
          { questionId: question.id, order: optOrder },
          { questionId: question.id, order: optOrder, label: o.label, score: o.score }
        )
        optOrder++
      }
    }
  }
}
