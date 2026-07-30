/**
 * Validators de contenidos y perfil (F3). Los campos de texto/booleanos; el
 * archivo (MultipartFile) se valida aparte en content_storage.
 */
import vine from '@vinejs/vine'

const CONTENT_TYPES = ['doc', 'video', 'image', 'link'] as const

export const createSectionValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(60),
    icon: vine.string().trim().maxLength(40).optional(),
    color: vine.string().trim().maxLength(20).optional(),
  })
)

export const updateSectionValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(60).optional(),
    icon: vine.string().trim().maxLength(40).optional(),
    color: vine.string().trim().maxLength(20).optional(),
  })
)

export const createContentItemValidator = vine.compile(
  vine.object({
    type: vine.enum(CONTENT_TYPES),
    title: vine.string().trim().minLength(2).maxLength(200),
    sectionId: vine.string().uuid(),
    description: vine.string().trim().maxLength(2000).optional(),
    externalUrl: vine.string().trim().url().optional(),
    publish: vine.boolean().optional(),
    notifyUsers: vine.boolean().optional(),
  })
)

export const updateContentItemValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(2).maxLength(200).optional(),
    sectionId: vine.string().uuid().optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    externalUrl: vine.string().trim().url().optional(),
  })
)

export const pinContentValidator = vine.compile(
  vine.object({ pinned: vine.boolean() })
)

export const publishContentValidator = vine.compile(
  vine.object({ notifyUsers: vine.boolean().optional() })
)

export const updateProfileValidator = vine.compile(
  vine.object({ fullName: vine.string().trim().minLength(2).maxLength(40) })
)
