/**
 * Validators de administración (F2). VineJS, como el resto. El `motivo` de la
 * suspensión es obligatorio (min 5). `until` se exige cuando `duration='custom'`
 * en el controller.
 */
import vine from '@vinejs/vine'

const DURATIONS = ['24h', '7d', '30d', 'custom', 'forever'] as const

export const suspendUserValidator = vine.compile(
  vine.object({
    duration: vine.enum(DURATIONS),
    until: vine.string().trim().optional(),
    reason: vine.string().trim().minLength(5).maxLength(500),
    notifyEmail: vine.boolean().optional(),
  })
)

export const bulkSuspendValidator = vine.compile(
  vine.object({
    userIds: vine.array(vine.string().uuid()).minLength(1),
    duration: vine.enum(DURATIONS),
    until: vine.string().trim().optional(),
    reason: vine.string().trim().minLength(5).maxLength(500),
    notifyEmail: vine.boolean().optional(),
  })
)

export const bulkUnsuspendValidator = vine.compile(
  vine.object({
    userIds: vine.array(vine.string().uuid()).minLength(1),
  })
)

export const renameUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(40),
    notifyUser: vine.boolean().optional(),
  })
)

export const deleteAvatarValidator = vine.compile(
  vine.object({
    notifyUser: vine.boolean().optional(),
  })
)

const ROLES = ['user', 'admin'] as const

export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().minLength(8),
    fullName: vine.string().trim().minLength(2).maxLength(80).optional(),
    role: vine.enum(ROLES).optional(),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail().optional(),
    fullName: vine.string().trim().minLength(2).maxLength(80).optional(),
    role: vine.enum(ROLES).optional(),
    password: vine.string().minLength(8).optional(),
    notifyUser: vine.boolean().optional(),
  })
)
