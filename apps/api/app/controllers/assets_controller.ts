/**
 * AssetsController (GF-248, Fase D). Autocomplete del catalogo de activos.
 *
 * - GET /assets/search?q=&type=  busca en `asset_catalog` por symbol o name
 *                                (case-insensitive), opcionalmente filtrando
 *                                por tipo. Devuelve hasta 10 resultados.
 *
 * Sub-fase local: solo consulta el catalogo sembrado. La sub-fase 2 (D.2)
 * extendera esto con proveedores externos (CoinGecko/Yahoo) cuando el catalogo
 * devuelva pocos resultados.
 */
import type { HttpContext } from '@adonisjs/core/http'
import type { AssetType } from '@grootfolio/shared/types'
import Asset from '#models/asset'

const ASSET_TYPES: readonly AssetType[] = ['crypto', 'stock', 'bond', 'currency']

export default class AssetsController {
  /**
   * GET /assets/search — resultados del catalogo para el autocomplete.
   * `q` de menos de 2 caracteres devuelve lista vacia (evita traer todo).
   */
  async search({ request, response }: HttpContext) {
    const q = String(request.input('q', '')).trim()
    const typeParam = request.input('type')
    const type = ASSET_TYPES.includes(typeParam) ? (typeParam as AssetType) : undefined

    if (q.length < 2) {
      return response.status(200).send({ results: [] })
    }

    const like = `%${q}%`
    const query = Asset.query()
      .where((builder) => {
        builder.whereILike('name', like).orWhereILike('symbol', like)
      })
      .orderBy('name', 'asc')
      .limit(10)

    if (type) query.where('type', type)

    const assets = await query
    return response.status(200).send({
      results: assets.map((a) => ({
        symbol: a.symbol,
        name: a.name,
        type: a.type,
        currency: a.currency,
      })),
    })
  }
}
