/**
 * Validator de Vine para crear transacciones. Espeja `createTransactionInputSchema`
 * de `@grootfolio/shared`: el cliente manda `symbol` + `type` (no `asset_id`); el
 * controller resuelve el asset contra `asset_catalog` (firstOrCreate).
 *
 * `kind` y `fee` son opcionales aca (el schema de shared les da default buy/0);
 * el default lo aplica el controller. `purchasedAt` se valida como string y se
 * parsea a DateTime en el controller.
 */
import vine from '@vinejs/vine'

export const createTransactionValidator = vine.compile(
  vine.object({
    symbol: vine.string().trim().minLength(1).maxLength(20),
    type: vine.enum(['crypto', 'stock', 'bond', 'currency']),
    kind: vine.enum(['buy', 'sell']).optional(),
    quantity: vine.number().positive(),
    unitPrice: vine.number().min(0),
    fee: vine.number().min(0).optional(),
    priceCurrency: vine.string().trim().fixedLength(3).optional(),
    purchasedAt: vine.string().trim(),
    notes: vine.string().trim().maxLength(500).optional(),
  })
)

/**
 * Validator de edicion (GF-249, PATCH /transactions/:id). Espeja
 * `updateTransactionInputSchema`: todos los campos opcionales; `symbol`/`type`
 * no se editan. El controller parsea `purchasedAt` a DateTime.
 */
export const updateTransactionValidator = vine.compile(
  vine.object({
    kind: vine.enum(['buy', 'sell']).optional(),
    quantity: vine.number().positive().optional(),
    unitPrice: vine.number().min(0).optional(),
    fee: vine.number().min(0).optional(),
    priceCurrency: vine.string().trim().fixedLength(3).optional(),
    purchasedAt: vine.string().trim().optional(),
    notes: vine.string().trim().maxLength(500).nullable().optional(),
  })
)
