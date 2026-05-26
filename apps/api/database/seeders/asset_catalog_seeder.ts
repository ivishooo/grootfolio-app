/**
 * Seeder del catalogo de activos. Carga los instrumentos del Figma (uno por
 * tipo) para tener datos de prueba y defaults lindos cuando se cargan
 * transacciones. Idempotente via updateOrCreate sobre (symbol, type).
 *
 * Es data de referencia: corre en todos los entornos.
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import type { AssetType } from '@grootfolio/shared/types'
import Asset from '#models/asset'

interface SeedAsset {
  symbol: string
  name: string
  type: AssetType
  currency: string
  preferredProvider: string
}

const ASSETS: SeedAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', currency: 'USD', preferredProvider: 'coingecko' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', currency: 'USD', preferredProvider: 'coingecko' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', currency: 'USD', preferredProvider: 'yahoo' },
  { symbol: 'US-T', name: 'US Treasury Bond', type: 'bond', currency: 'USD', preferredProvider: 'manual' },
  { symbol: 'EUR', name: 'Euro', type: 'currency', currency: 'USD', preferredProvider: 'frankfurter' },
]

export default class AssetCatalogSeeder extends BaseSeeder {
  async run() {
    for (const asset of ASSETS) {
      await Asset.updateOrCreate({ symbol: asset.symbol, type: asset.type }, asset)
    }
  }
}
