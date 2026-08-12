/**
 * Validators del chatbot (F4, ADR-0004). Espejo en VineJS del schema Zod
 * `sendChatMessageInputSchema` de `packages/shared`.
 */
import vine from '@vinejs/vine'

export const sendMessageValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(2).maxLength(1000),
    // Continúa un hilo existente; si no viene, se crea uno nuevo.
    conversationId: vine.string().uuid().optional(),
  })
)
