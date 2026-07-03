/**
 * Scheduler in-process del job de actualizacion de precios (GF-221). Arranca
 * un intervalo por tipo de activo (crypto/stock/currency) que refresca los
 * activos en cartera de ese tipo. Pensado para dev/demo self-contained; en
 * produccion (multiples instancias) conviene desactivarlo y usar el comando
 * `prices:refresh` via cron externo.
 *
 * Se activa solo con PRICES_REFRESH_ENABLED=true. Cada tipo tiene un lock para
 * no solapar corridas si una tarda mas que su intervalo. Lo arranca el
 * price_refresh_provider, unicamente en el entorno `web`.
 */
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { assetsInPortfolios, refreshPrices } from './price_service.js'
import type { AssetRef } from './providers/types.js'

interface TypeSchedule {
  type: AssetRef['type']
  seconds: number
}

const timers: NodeJS.Timeout[] = []
const running = new Set<string>()

function schedules(): TypeSchedule[] {
  return [
    { type: 'crypto', seconds: env.get('PRICES_REFRESH_CRYPTO_SECONDS') ?? 120 },
    { type: 'stock', seconds: env.get('PRICES_REFRESH_STOCK_SECONDS') ?? 300 },
    { type: 'currency', seconds: env.get('PRICES_REFRESH_CURRENCY_SECONDS') ?? 3600 },
  ]
}

async function runForType(type: AssetRef['type']): Promise<void> {
  if (running.has(type)) return // ya hay una corrida en curso para este tipo
  running.add(type)
  try {
    const assets = await assetsInPortfolios(type)
    if (assets.length === 0) return
    const summary = await refreshPrices(assets)
    logger.info({ type, ...summary }, 'price refresh job')
  } catch (err) {
    logger.error({ err, type }, 'price refresh job fallo')
  } finally {
    running.delete(type)
  }
}

export function startPriceRefreshScheduler(): void {
  if (env.get('PRICES_REFRESH_ENABLED') !== true) return
  if (timers.length > 0) return // ya iniciado

  for (const { type, seconds } of schedules()) {
    const timer = setInterval(() => void runForType(type), seconds * 1000)
    // No bloquear la salida del proceso por estos timers.
    timer.unref?.()
    timers.push(timer)
  }
  logger.info({ schedules: schedules() }, 'price refresh scheduler iniciado')
}

export function stopPriceRefreshScheduler(): void {
  for (const timer of timers) clearInterval(timer)
  timers.length = 0
}
