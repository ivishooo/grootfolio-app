/**
 * Modelo QuizResponse. Una respuesta concreta de un usuario a una pregunta en
 * un intento del cuestionario (tabla `quiz_responses`). Las respuestas de un
 * mismo envio comparten `attempt_id`, asi se puede reconstruir cada intento.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class QuizResponse extends BaseModel {
  static table = 'quiz_responses'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column({ columnName: 'attempt_id' })
  declare attemptId: string

  @column({ columnName: 'question_id' })
  declare questionId: string

  @column({ columnName: 'option_id' })
  declare optionId: string

  @column.dateTime({ autoCreate: true, columnName: 'answered_at' })
  declare answeredAt: DateTime
}
