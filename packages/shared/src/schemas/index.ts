import { z } from 'zod'

export const assetTypeSchema = z.enum(['crypto', 'stock', 'bond', 'currency'])

export const riskProfileTypeSchema = z.enum(['conservative', 'moderate', 'aggressive'])

export const loginInputSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
})

export const registerInputSchema = loginInputSchema.extend({
  fullName: z.string().min(2).max(80).optional(),
})

// Mismo shape para /auth/refresh y /auth/logout: ambos reciben el refresh token.
export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1),
})

export const createTransactionInputSchema = z.object({
  symbol: z.string().min(1).max(20),
  type: assetTypeSchema,
  kind: z.enum(['buy', 'sell']).default('buy'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().nonnegative('El precio no puede ser negativo'),
  fee: z.number().nonnegative().default(0),
  // Moneda en la que están expresados unitPrice y fee. Para crypto/stock/bond en
  // USD queda 'USD'; para divisas es la moneda con la que se pagó (ej. ARS). El
  // costo se normaliza a USD en la API usando el FX de esta moneda.
  priceCurrency: z.string().length(3).default('USD'),
  purchasedAt: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
})

// Edicion de una transaccion (GF-249, PATCH /transactions/:id). Todos los campos
// son opcionales (edicion parcial); symbol y type NO se editan porque cambiarian
// la identidad del activo (para eso se borra y se crea otra).
export const updateTransactionInputSchema = z.object({
  kind: z.enum(['buy', 'sell']).optional(),
  quantity: z.number().positive('La cantidad debe ser mayor a 0').optional(),
  unitPrice: z.number().nonnegative('El precio no puede ser negativo').optional(),
  fee: z.number().nonnegative().optional(),
  priceCurrency: z.string().length(3).optional(),
  purchasedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const quizAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
})

export const submitQuizInputSchema = z.object({
  answers: z.array(quizAnswerInputSchema).min(1),
})

// ---- Admin / Contenidos (F4) ----

export const suspensionDurationSchema = z.enum(['24h', '7d', '30d', 'custom', 'forever'])

/**
 * Suspensión de una cuenta. `reason` obligatorio (min 5). `until` (ISO) es
 * obligatorio sólo cuando `duration === 'custom'`.
 */
export const suspendUserInputSchema = z
  .object({
    duration: suspensionDurationSchema,
    until: z.string().datetime({ offset: true }).optional(),
    reason: z.string().trim().min(5, 'El motivo es obligatorio (mínimo 5 caracteres).').max(500),
    notifyEmail: z.boolean().optional(),
  })
  .refine((v) => v.duration !== 'custom' || !!v.until, {
    message: 'Indicá la fecha de reactivación.',
    path: ['until'],
  })

export const updateProfileInputSchema = z.object({
  fullName: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(40, 'Máximo 40 caracteres.'),
})

export const createSectionInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(40).optional(),
  color: z.string().trim().max(20).optional(),
})

export const contentTypeSchema = z.enum(['doc', 'video', 'image', 'link'])

/**
 * Alta de contenido (campos de texto; el archivo se maneja aparte como
 * multipart). Para `type === 'link'` se exige `externalUrl`.
 */
export const createContentItemInputSchema = z
  .object({
    type: contentTypeSchema,
    title: z.string().trim().min(2).max(200),
    sectionId: z.string().uuid(),
    description: z.string().trim().max(2000).optional(),
    externalUrl: z.string().trim().url().optional(),
    publish: z.boolean().optional(),
    notifyUsers: z.boolean().optional(),
  })
  .refine((v) => v.type !== 'link' || !!v.externalUrl, {
    message: 'Indicá la URL del enlace.',
    path: ['externalUrl'],
  })

export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>
export type RefreshInput = z.infer<typeof refreshInputSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>
export type SubmitQuizInput = z.infer<typeof submitQuizInputSchema>
export type SuspendUserInput = z.infer<typeof suspendUserInputSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>
export type CreateSectionInput = z.infer<typeof createSectionInputSchema>
export type CreateContentItemInput = z.infer<typeof createContentItemInputSchema>
