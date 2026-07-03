/**
 * Validator de Vine para enviar el cuestionario de perfil. Espeja
 * `submitQuizInputSchema` de `@grootfolio/shared`: un array de respuestas, cada
 * una con `questionId` y `optionId` (UUIDs). El controller valida ademas que
 * las opciones existan y pertenezcan a sus preguntas.
 */
import vine from '@vinejs/vine'

export const submitQuizValidator = vine.compile(
  vine.object({
    answers: vine
      .array(
        vine.object({
          questionId: vine.string().uuid(),
          optionId: vine.string().uuid(),
        })
      )
      .minLength(1),
  })
)
