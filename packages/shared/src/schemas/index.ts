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
  purchasedAt: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
})

export const quizAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
})

export const submitQuizInputSchema = z.object({
  answers: z.array(quizAnswerInputSchema).min(1),
})

export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>
export type RefreshInput = z.infer<typeof refreshInputSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>
export type SubmitQuizInput = z.infer<typeof submitQuizInputSchema>
