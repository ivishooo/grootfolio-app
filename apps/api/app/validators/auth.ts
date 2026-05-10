/**
 * Validators de Vine para el flujo de auth. Espejan los schemas de Zod en
 * `packages/shared/src/schemas/index.ts` (registerInputSchema, loginInputSchema)
 * para que el contrato sea identico en cliente y servidor.
 */
import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().trim().toLowerCase().email().maxLength(190),
    password: vine.string().minLength(8).maxLength(255),
    fullName: vine.string().trim().minLength(2).maxLength(80).optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().toLowerCase().email().maxLength(190),
    password: vine.string().minLength(8).maxLength(255),
  })
)
