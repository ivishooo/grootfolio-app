/**
 * Modelo QuizQuestion. Pregunta del cuestionario de perfil de inversor (tabla
 * `quiz_questions`). Cada pregunta tiene varias opciones con un score; el perfil
 * surge de la suma de los scores elegidos (ver risk_profile service).
 */
import type { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import QuizOption from '#models/quiz_option'

export default class QuizQuestion extends BaseModel {
  static table = 'quiz_questions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare order: number

  @column()
  declare text: string

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @hasMany(() => QuizOption, { foreignKey: 'questionId' })
  declare options: HasMany<typeof QuizOption>
}
