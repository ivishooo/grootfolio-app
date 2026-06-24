/**
 * Arranca el scheduler in-process del job de precios (GF-221) cuando la app
 * esta lista, unicamente en el entorno `web` (el server HTTP): no queremos que
 * los comandos ace, el repl o los tests disparen el job. El scheduler ademas
 * solo corre si PRICES_REFRESH_ENABLED=true.
 */
import type { ApplicationService } from '@adonisjs/core/types'

export default class PriceRefreshProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getEnvironment() !== 'web') return
    const { startPriceRefreshScheduler } = await import(
      '#services/prices/price_refresh_scheduler'
    )
    startPriceRefreshScheduler()
  }

  async shutdown() {
    const { stopPriceRefreshScheduler } = await import(
      '#services/prices/price_refresh_scheduler'
    )
    stopPriceRefreshScheduler()
  }
}
