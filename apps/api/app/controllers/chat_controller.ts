/**
 * ChatController (F4, Chatbot RAG — ADR-0004). Endpoint del asistente para
 * usuarios autenticados. Cada intercambio queda persistido: sirve para mostrar
 * el historial, para limitar el uso y como material de la evaluación de F7.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import ChatConversation from '#models/chat_conversation'
import ChatMessage from '#models/chat_message'
import { AiUnavailableError, isAiEnabled } from '#services/kb/gemini_client'
import { MAX_HISTORY_MESSAGES, answerQuestion, type ChatTurn } from '#services/kb/rag_query_service'
import { sendMessageValidator } from '#validators/chat'

/** Preguntas por usuario y hora. Protege la cuota del proveedor. */
const RATE_LIMIT_PER_HOUR = 30
/** Conversaciones listadas y mensajes devueltos por conversación. */
const MAX_CONVERSATIONS = 20
const MAX_MESSAGES = 100

export default class ChatController {
  /** POST /chat — pregunta al asistente. */
  async send({ request, response, currentUser }: HttpContext) {
    if (!isAiEnabled()) return this.aiUnavailable(response)

    const payload = await request.validateUsing(sendMessageValidator)

    const used = await this.countRecentQuestions(currentUser.id)
    if (used >= RATE_LIMIT_PER_HOUR) {
      return response.status(429).send({
        code: 'CHAT_RATE_LIMITED',
        message: `Alcanzaste el límite de ${RATE_LIMIT_PER_HOUR} preguntas por hora. Probá de nuevo más tarde.`,
      })
    }

    // Conversación existente (validando que sea del usuario) o una nueva.
    let conversation: ChatConversation | null = null
    if (payload.conversationId) {
      conversation = await ChatConversation.query()
        .where('id', payload.conversationId)
        .where('user_id', currentUser.id)
        .first()
      if (!conversation) {
        return response
          .status(404)
          .send({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversación no encontrada.' })
      }
    } else {
      conversation = await ChatConversation.create({
        userId: currentUser.id,
        title: payload.message.slice(0, 200),
      })
    }

    const history = await this.loadHistory(conversation.id)

    await ChatMessage.create({
      conversationId: conversation.id,
      userId: currentUser.id,
      role: 'user',
      content: payload.message,
    })

    let result
    try {
      result = await answerQuestion(payload.message, history)
    } catch (err) {
      if (err instanceof AiUnavailableError) return this.aiUnavailable(response)
      return response.status(502).send({
        code: 'CHAT_PROVIDER_ERROR',
        message: 'El asistente no está disponible en este momento. Intentá de nuevo en un rato.',
      })
    }

    const assistantMessage = await ChatMessage.create({
      conversationId: conversation.id,
      userId: currentUser.id,
      role: 'assistant',
      content: result.answer,
      grounded: result.grounded,
      sources: result.sources,
      retrievalScore: result.topScore,
    })

    // Ordena la conversación arriba en el listado.
    conversation.updatedAt = DateTime.now()
    await conversation.save()

    return response.status(200).send({
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: result.answer,
      grounded: result.grounded,
      sources: result.sources,
      remaining: Math.max(0, RATE_LIMIT_PER_HOUR - used - 1),
    })
  }

  /** GET /chat/conversations — hilos del usuario, del más reciente al más viejo. */
  async conversations({ response, currentUser }: HttpContext) {
    const rows = await ChatConversation.query()
      .where('user_id', currentUser.id)
      .orderBy('updated_at', 'desc')
      .limit(MAX_CONVERSATIONS)

    return response.status(200).send({
      data: rows.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISO(),
        updatedAt: c.updatedAt.toISO(),
      })),
    })
  }

  /** GET /chat/conversations/:id — mensajes de un hilo propio. */
  async messages({ params, response, currentUser }: HttpContext) {
    const conversation = await ChatConversation.query()
      .where('id', params.id)
      .where('user_id', currentUser.id)
      .first()
    if (!conversation) {
      return response
        .status(404)
        .send({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversación no encontrada.' })
    }

    const messages = await ChatMessage.query()
      .where('conversation_id', conversation.id)
      .orderBy('created_at', 'asc')
      .limit(MAX_MESSAGES)

    return response.status(200).send({
      conversationId: conversation.id,
      data: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        grounded: m.grounded,
        sources: m.sources ?? [],
        createdAt: m.createdAt.toISO(),
      })),
    })
  }

  /** DELETE /chat/conversations/:id — borra un hilo propio (y sus mensajes). */
  async destroyConversation({ params, response, currentUser }: HttpContext) {
    const conversation = await ChatConversation.query()
      .where('id', params.id)
      .where('user_id', currentUser.id)
      .first()
    if (!conversation) {
      return response
        .status(404)
        .send({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversación no encontrada.' })
    }
    await conversation.delete()
    return response.status(204).send(null)
  }

  // --- helpers ---

  private aiUnavailable(response: HttpContext['response']) {
    return response.status(503).send({
      code: 'AI_UNAVAILABLE',
      message: 'El asistente no está configurado en este entorno.',
    })
  }

  /** Preguntas del usuario en la última hora (ventana deslizante). */
  private async countRecentQuestions(userId: string): Promise<number> {
    const row = await db
      .from('chat_messages')
      .where('user_id', userId)
      .where('role', 'user')
      .where('created_at', '>=', DateTime.now().minus({ hours: 1 }).toSQL({ includeOffset: false }))
      .count('* as total')
      .first()
    return Number(row?.total ?? 0)
  }

  /** Últimos turnos del hilo, como memoria corta para el generador. */
  private async loadHistory(conversationId: string): Promise<ChatTurn[]> {
    const recent = await ChatMessage.query()
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'desc')
      .limit(MAX_HISTORY_MESSAGES)

    return recent
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }))
  }
}
