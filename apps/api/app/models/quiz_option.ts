/**
 * Modelo QuizOption. Opcion de respuesta de una pregunta del cuestionario
 * (tabla `quiz_options`). El `score` pondera la tolerancia al riesgo.
 */
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import QuizQuestion from '#models/quiz_question'

export default class QuizOption extends BaseModel {
  static table = 'quiz_options'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'question_id' })
  declare questionId: string

  @column()
  declare label: string

  @column()
  declare score: number

  @column()
  declare order: number

  @belongsTo(() => QuizQuestion, { foreignKey: 'questionId' })
  declare question: BelongsTo<typeof QuizQuestion>
}
