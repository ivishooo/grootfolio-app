/**
 * Validators de la base de conocimiento del chatbot (F2, ADR-0004). Espejo en
 * VineJS de los schemas Zod de `packages/shared` (`createKbArticleInputSchema`,
 * `updateKbArticleInputSchema`).
 */
import vine from '@vinejs/vine'

/** Minúsculas, números y guiones simples. Se deriva del título si no viene. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createKbArticleValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(200),
    slug: vine.string().trim().minLength(3).maxLength(220).regex(SLUG_RE).optional(),
    body: vine.string().trim().minLength(20),
    publish: vine.boolean().optional(),
  })
)

export const updateKbArticleValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(200).optional(),
    slug: vine.string().trim().minLength(3).maxLength(220).regex(SLUG_RE).optional(),
    body: vine.string().trim().minLength(20).optional(),
  })
)
