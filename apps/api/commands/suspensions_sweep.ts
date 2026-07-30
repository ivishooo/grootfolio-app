/**
 * Comando `suspensions:sweep` (F1). Reactiva usuarios cuya suspensión venció
 * (`status='suspended'` con `suspended_until` en el pasado). El login ya
 * auto-reactiva al entrar; este command garantiza consistencia para los que no
 * intentan loguear. Pensado para correr por cron.
 *
 *   node ace suspensions:sweep
 */
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

export default class SuspensionsSweep extends BaseCommand {
  static commandName = 'suspensions:sweep'
  static description = 'Reactiva usuarios cuya suspensión ya venció (F1)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: User } = await import('#models/user')

    const affected = await User.query()
      .where('status', 'suspended')
      .whereNotNull('suspended_until')
      .where('suspended_until', '<=', DateTime.now().toSQL())
      .update({
        status: 'active',
        suspended_until: null,
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null,
      })

    const count = Array.isArray(affected) ? Number(affected[0] ?? 0) : Number(affected)
    this.logger.info(`Reactivados ${count} usuario(s) con suspensión vencida.`)
  }
}
