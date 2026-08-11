/**
 * Modelo ChatConversation (F4, Chatbot RAG). Hilo de conversación de un usuario
 * con el bot. Tabla creada en `0010_create_chat_tables.ts`.
 */
import type { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ChatMessage from '#models/chat_message'

export default class ChatConversation extends BaseModel {
  static table = 'chat_conversations'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column()
  declare title: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @hasMany(() => ChatMessage, { foreignKey: 'conversationId' })
  declare messages: HasMany<typeof ChatMessage>
}
