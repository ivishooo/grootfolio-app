/**
 * Comando `transactions:fix-cedears`.
 *
 * Arregla los datos que dejó el bug de CEDEARs: hasta octubre de 2026 la app
 * dejaba cargar una acción que cotiza en dólares con el precio en pesos. En la
 * práctica eso es haber comprado el CEDEAR y haberlo anotado contra el ticker
 * del subyacente — ADBE en vez de ADBE.BA — y el motor terminaba comparando un
 * costo en pesos por CEDEAR contra el precio en Nasdaq, unas 40 veces más alto.
 * Así apareció un +4.109,9% de rentabilidad en el Dashboard de un usuario.
 *
 * La regla nueva (TX_CURRENCY_MISMATCH) frena las altas, pero no toca lo ya
 * cargado. Esto sí.
 *
 *   node ace transactions:fix-cedears            # dry-run: dice qué cambiaría
 *   node ace transactions:fix-cedears --commit   # lo aplica
 *
 * Qué hace: repunta la transacción al activo `.BA`, creándolo en el catálogo si
 * hace falta. NO toca cantidad, precio ni moneda, porque eso ya estaba bien: 30
 * unidades a $6.000 es exactamente ADBE.BA. Lo único mal era contra qué activo
 * apuntaba.
 *
 * A diferencia de `db:clean-test-data`, este comando SÍ corre en producción:
 * los datos a corregir están justamente ahí. Por eso es dry-run por defecto.
 *
 * Lo que NO arregla: el error inverso, cargar importes en pesos dejando la
 * moneda en USD. Eso es indistinguible de una compra cara legítima mirando
 * sólo los datos, y necesita revisión humana.
 */
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/** Sufijo de BYMA, donde cotizan los CEDEARs. */
const BYMA_SUFFIX = '.BA'

interface Candidata {
  id: string
  userId: string
  symbol: string
  // El driver de Postgres devuelve DECIMAL como string y DATE como objeto Date;
  // la query es cruda (sin modelo), así que llegan sin castear.
  quantity: string
  unitPrice: string
  purchasedAt: Date
}

/** `1234.5600000000` -> `1234,56`, para que el listado se pueda leer. */
const numero = (v: string) => Number(v).toLocaleString('es-AR')

/** El Date del driver a `yyyy-MM-dd`. */
const fecha = (d: Date) => new Date(d).toISOString().slice(0, 10)

export default class TransactionsFixCedears extends BaseCommand {
  static commandName = 'transactions:fix-cedears'
  static description = 'Repunta al ticker .BA las transacciones de CEDEARs cargadas contra el subyacente'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Aplica los cambios. Sin este flag sólo informa qué haría.' })
  declare commit: boolean

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { default: Asset } = await import('#models/asset')
    const { yahooProvider } = await import('#services/prices/providers/yahoo_provider')

    // Misma condición que la regla que hoy rechaza estas altas: acción que
    // cotiza en dólares (sin sufijo .BA) con el precio en pesos.
    const candidatas = (await db
      .from('transactions as t')
      .join('asset_catalog as a', 'a.id', 't.asset_id')
      .where('a.type', 'stock')
      .whereNot('a.symbol', 'like', `%${BYMA_SUFFIX}`)
      .where('t.price_currency', 'ARS')
      .whereNull('t.deleted_at')
      .select(
        't.id',
        't.user_id as userId',
        'a.symbol',
        't.quantity',
        't.unit_price as unitPrice',
        't.purchased_at as purchasedAt'
      )
      .orderBy('a.symbol')) as Candidata[]

    if (candidatas.length === 0) {
      this.logger.info('No hay transacciones afectadas por el bug de CEDEARs.')
      return
    }

    const porSymbol = new Map<string, Candidata[]>()
    for (const c of candidatas) {
      const bucket = porSymbol.get(c.symbol)
      if (bucket) bucket.push(c)
      else porSymbol.set(c.symbol, [c])
    }

    const usuarios = new Set(candidatas.map((c) => c.userId))
    this.logger.info(
      `${candidatas.length} transacción(es) de ${usuarios.size} usuario(s) en ${porSymbol.size} activo(s).`
    )

    // Un CEDEAR sólo existe si Yahoo cotiza el .BA. Una acción de EE. UU. sin
    // CEDEAR no tiene a dónde repuntarse: va a revisión manual.
    const tickersBa = [...porSymbol.keys()].map((s) => `${s}${BYMA_SUFFIX}`)
    const quotes = await yahooProvider.fetchQuotes(
      tickersBa.map((symbol) => ({ id: symbol, symbol, type: 'stock' as const }))
    )

    const migrables: Array<{ symbol: string; cedear: string; txs: Candidata[] }> = []
    const manuales: Array<{ symbol: string; txs: Candidata[] }> = []
    for (const [symbol, txs] of porSymbol) {
      const cedear = `${symbol}${BYMA_SUFFIX}`
      if (quotes[cedear]) migrables.push({ symbol, cedear, txs })
      else manuales.push({ symbol, txs })
    }

    for (const m of migrables) {
      this.logger.info(`  ${m.symbol} → ${m.cedear}   ${m.txs.length} transacción(es)`)
      for (const t of m.txs) {
        this.logger.info(`      ${numero(t.quantity)} u a $${numero(t.unitPrice)} · ${fecha(t.purchasedAt)}`)
      }
    }
    for (const m of manuales) {
      this.logger.warning(
        `  ${m.symbol}: Yahoo no cotiza ${m.symbol}${BYMA_SUFFIX}. ` +
          `${m.txs.length} transacción(es) quedan para revisión manual.`
      )
    }

    const total = migrables.reduce((acc, m) => acc + m.txs.length, 0)

    if (!this.commit) {
      this.logger.warning(
        `Dry-run: se repuntarían ${total} transacción(es). Volvé a correrlo con --commit para hacerlo.`
      )
      return
    }

    let movidas = 0
    for (const m of migrables) {
      // El activo .BA puede no existir todavía en el catálogo. Lo creamos con
      // la moneda correcta (ARS) para que el price_service lo convierta a USD.
      const asset = await Asset.firstOrCreate(
        { symbol: m.cedear, type: 'stock' },
        {
          symbol: m.cedear,
          type: 'stock',
          name: m.cedear,
          currency: 'ARS',
          preferredProvider: 'yahoo',
        }
      )
      await db
        .from('transactions')
        .whereIn(
          'id',
          m.txs.map((t) => t.id)
        )
        .update({ asset_id: asset.id })
      movidas += m.txs.length
    }

    this.logger.success(
      `Repuntadas ${movidas} transacción(es) a su ticker .BA.` +
        (manuales.length > 0 ? ` Quedan ${manuales.length} activo(s) para revisión manual.` : '')
    )
  }
}
