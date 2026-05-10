/**
 * Modelo User. La tabla `users` se crea en `0001_initial_schema.ts`.
 *
 * El password se hashea automaticamente antes de persistirse via el hook
 * `beforeSave` (solo cuando el campo cambia, gracias a `$dirty`). Para
 * comparar passwords usar el helper estatico `verifyPassword`, que delega
 * en el `hash` service de Adonis (driver default: scrypt — ver
 * `config/hash.ts`).
 */
import type { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeSave, column } from '@adonisjs/lucid/orm'
import type { RiskProfileType } from '@grootfolio/shared/types'

export default class User extends BaseModel {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column({ columnName: 'full_name' })
  declare fullName: string | null

  @column({ columnName: 'risk_profile' })
  declare riskProfile: RiskProfileType | null

  @column({ columnName: 'risk_score' })
  declare riskScore: number | null

  @column.dateTime({ columnName: 'risk_calculated_at' })
  declare riskCalculatedAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  /**
   * Compara una password en claro contra la hasheada. Devuelve `true` si
   * coincide. No tira si el hash esta corrupto: devuelve `false`.
   */
  static async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    try {
      return await hash.verify(hashed, plain)
    } catch {
      return false
    }
  }
}
