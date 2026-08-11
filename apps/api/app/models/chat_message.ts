/**
 * Modelo ChatMessage (F4, Chatbot RAG). Un turno de la conversación. Los campos
 * `grounded`, `sources` y `retrievalScore` sólo aplican a los mensajes del bot
 * (`role = 'assistant'`) y son la materia prima de la evaluación de F7.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ChatConversation from '#models/chat_conversation'

/** Fragmento de la KB que respaldó una respuesta. */
export interface ChatSource {
  articleId: string
  title: string
  slug: string
  heading: string | null
  score: number
}

export default class ChatMessage extends BaseModel {
  static table = 'chat_messages'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'conversation_id' })
  declare conversationId: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column()
  declare role: 'user' | 'assistant'

  @column()
  declare content: string

  @column()
  declare grounded: boolean | null

  @column({
    prepare: (value: ChatSource[] | null) => (value ? JSON.stringify(value) : null),
  })
  declare sources: ChatSource[] | null

  @column({ columnName: 'retrieval_score' })
  declare retrievalScore: number | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @belongsTo(() => ChatConversation, { foreignKey: 'conversationId' })
  declare conversation: BelongsTo<typeof ChatConversation>
}
