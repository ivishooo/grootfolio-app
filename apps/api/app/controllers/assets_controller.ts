/**
 * AssetsController (GF-248). Autocomplete del catalogo de activos.
 *
 * - GET /assets/search?q=&type=  busca en `asset_catalog` por symbol o name
 *                                (case-insensitive), opcionalmente filtrando
 *                                por tipo. Devuelve hasta 10 resultados.
 *
 * Sub-fase local + externa (D.1/D.2): primero consulta el catalogo sembrado; si
 * trae pocos resultados y hay `type`, completa con el proveedor externo
 * (CoinGecko/Yahoo/lista de divisas) y PERSISTE esos hits en el catalogo con
 * `firstOrCreate` (name/currency/provider correctos) — asi el proximo alta
 * resuelve el asset con el nombre real y no queda el symbol en mayuscula.
 */
import type { HttpContext } from '@adonisjs/core/http'
import type { AssetSearchResult, AssetType } from '@grootfolio/shared/types'
import Asset from '#models/asset'
import { searchExternalAssets } from '#services/assets/asset_search_external'

const ASSET_TYPES: readonly AssetType[] = ['crypto', 'stock', 'bond', 'currency']

// Si el catalogo local trae al menos esto, no consultamos proveedores externos.
const LOCAL_ENOUGH = 5

const PROVIDER_BY_TYPE: Record<AssetType, string> = {
  crypto: 'coingecko',
  stock: 'yahoo',
  bond: 'manual',
  currency: 'frankfurter',
}

export default class AssetsController {
  /**
   * GET /assets/search — resultados del catalogo (+ proveedor externo) para el
   * autocomplete. `q` de menos de 2 caracteres devuelve lista vacia.
   */
  async search({ request, response }: HttpContext) {
    const q = String(request.input('q', '')).trim()
    const typeParam = request.input('type')
    const type = ASSET_TYPES.includes(typeParam) ? (typeParam as AssetType) : undefined

    if (q.length < 2) {
      return response.status(200).send({ results: [] })
    }

    const like = `%${q}%`
    const localQuery = Asset.query()
      .where((builder) => {
        builder.whereILike('name', like).orWhereILike('symbol', like)
      })
      .orderBy('name', 'asc')
      .limit(10)
    if (type) localQuery.where('type', type)

    const localAssets = await localQuery
    const local: AssetSearchResult[] = localAssets.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      type: a.type,
      currency: a.currency,
    }))

    // Suficiente localmente, o sin `type` para rutear el proveedor: solo local.
    if (!type || local.length >= LOCAL_ENOUGH) {
      return response.status(200).send({ results: local })
    }

    const external = await searchExternalAssets(type, q)

    // Dedup por symbol (el catalogo local tiene prioridad).
    const seen = new Set(local.map((r) => r.symbol.toUpperCase()))
    const fresh = external.filter((r) => !seen.has(r.symbol.toUpperCase()))

    // Persistimos los hits externos en el catalogo (name/currency/provider
    // correctos) para que el proximo alta/busqueda no dependa del proveedor.
    for (const r of fresh) {
      const symbol = r.symbol.toUpperCase()
      await Asset.firstOrCreate(
        { symbol, type: r.type },
        {
          symbol,
          type: r.type,
          name: r.name,
          currency: r.currency,
          preferredProvider: PROVIDER_BY_TYPE[r.type],
        }
      )
    }

    const results = [...local, ...fresh].slice(0, 10)
    return response.status(200).send({ results })
  }
}
