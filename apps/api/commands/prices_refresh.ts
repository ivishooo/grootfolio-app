/**
 * Comando `prices:refresh` (GF-221). Actualiza los precios de los activos en
 * cartera forzando el fetch a los providers (ver refreshPrices). Pensado para
 * correr a mano o via cron externo (Railway/Fly/SO); el `--type` permite
 * distintos intervalos por tipo de activo desde el cron.
 *
 *   node ace prices:refresh            # todos los activos en cartera
 *   node ace prices:refresh --type=crypto
 */
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class PricesRefresh extends BaseCommand {
  static commandName = 'prices:refresh'
  static description = 'Actualiza los precios de los activos en cartera (GF-221)'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Filtrar por tipo: crypto | stock | currency' })
  declare type?: string

  async run() {
    const { assetsInPortfolios, refreshPrices } = await import('#services/prices/price_service')

    const type = this.type as 'crypto' | 'stock' | 'currency' | undefined
    const assets = await assetsInPortfolios(type)
    if (assets.length === 0) {
      this.logger.info('No hay activos en cartera para refrescar.')
      return
    }

    const summary = await refreshPrices(assets)
    this.logger.info(
      `Refrescados: ${summary.refreshed} · sin precio: ${summary.unsupported} · fallidos: ${summary.failed}`
    )
  }
}
