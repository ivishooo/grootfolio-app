/**
 * Modelo User. La tabla `users` se crea en `0001_initial_schema.ts`.
 *
 * El password se hashea automaticamente antes de persistirse via el hook
 * `beforeSave` (solo cuando el campo cambia, gracias a `$dirty`). Para
 * comparar passwords usar el helper estatico `verifyPassword`, que delega
 * en el `hash` service de Adonis (driver default: scrypt — ver
 * `config/hash.ts`).
 */
import { DateTime } from 'luxon'
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

  // --- Admin / moderación / suspensión (F1, Admin/Contenidos) ---

  @column()
  declare role: 'user' | 'admin'

  @column({ columnName: 'avatar_url' })
  declare avatarUrl: string | null

  @column()
  declare status: 'active' | 'suspended'

  @column.dateTime({ columnName: 'suspended_until' })
  declare suspendedUntil: DateTime | null

  @column({ columnName: 'suspended_reason' })
  declare suspendedReason: string | null

  @column.dateTime({ columnName: 'suspended_at' })
  declare suspendedAt: DateTime | null

  @column({ columnName: 'suspended_by' })
  declare suspendedBy: string | null

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

  /**
   * `true` si la cuenta está suspendida y la suspensión NO venció. Una
   * `suspended_until` en el pasado se considera vencida (el login la
   * auto-reactiva). `suspended_until = null` con status suspended ⇒ indefinida.
   */
  get isSuspended(): boolean {
    if (this.status !== 'suspended') return false
    if (this.suspendedUntil === null) return true
    return this.suspendedUntil > DateTime.now()
  }
}
