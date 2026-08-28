/**
 * FxController. Expone las cotizaciones que la web y la app necesitan para
 * mostrar los importes en la moneda base que eligió el usuario.
 *
 * Todo lo que calcula la API (valor del portafolio, P&L, precios) está en USD.
 * Convertir del lado del cliente evita tocar el motor de cálculo y mantiene una
 * sola fuente de verdad; el precio a pagar es esta request extra, que igual
 * cachea fuerte porque `getRateToUsd` ya tiene su propio TTL in-memory.
 *
 * `rates[X]` = cuántas unidades de X vale 1 USD (lo natural para multiplicar).
 * Si una moneda no se pudo cotizar, no aparece en el objeto: el cliente cae a
 * USD en vez de mostrar un número inventado.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { getRateToUsd } from '#services/prices/fx/fx_service'

/** Monedas en las que se puede ver la app. Espejo de SUPPORTED_CURRENCIES. */
const DISPLAY_CURRENCIES = ['USD', 'ARS', 'EUR'] as const

export default class FxController {
  /** GET /fx/rates — cotizaciones de USD a cada moneda soportada. */
  async rates({ response }: HttpContext) {
    const rates: Record<string, number> = { USD: 1 }

    for (const currency of DISPLAY_CURRENCIES) {
      if (currency === 'USD') continue
      const toUsd = await getRateToUsd(currency)
      // toUsd = cuántos USD vale 1 unidad. Lo invertimos para tener el factor
      // que multiplica un importe en USD.
      if (toUsd !== null && toUsd > 0) rates[currency] = 1 / toUsd
    }

    return response.status(200).send({ base: 'USD', rates })
  }
}
