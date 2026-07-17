/**
 * Seeder del catalogo de activos. Alimenta el autocomplete (GF-248, Fase D)
 * con los instrumentos mas usados de cada categoria. Idempotente via
 * updateOrCreate sobre (symbol, type).
 *
 * Es data de referencia: corre en todos los entornos. Convenciones:
 * - crypto  -> currency USD, provider coingecko
 * - stock US -> currency USD, provider yahoo
 * - stock .BA (argentina) -> currency ARS (el orquestador convierte a USD via
 *   FX, GF-219), provider yahoo
 * - currency -> currency USD (par contra USD), provider frankfurter
 * - bond -> provider manual (aun sin precio en vivo)
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

const crypto = (symbol: string, name: string): SeedAsset => ({
  symbol,
  name,
  type: 'crypto',
  currency: 'USD',
  preferredProvider: 'coingecko',
})
const stockUs = (symbol: string, name: string): SeedAsset => ({
  symbol,
  name,
  type: 'stock',
  currency: 'USD',
  preferredProvider: 'yahoo',
})
const stockAr = (symbol: string, name: string): SeedAsset => ({
  symbol,
  name,
  type: 'stock',
  currency: 'ARS',
  preferredProvider: 'yahoo',
})
const currency = (symbol: string, name: string): SeedAsset => ({
  symbol,
  name,
  type: 'currency',
  currency: 'USD',
  preferredProvider: 'frankfurter',
})
const bond = (symbol: string, name: string, cur = 'USD'): SeedAsset => ({
  symbol,
  name,
  type: 'bond',
  currency: cur,
  preferredProvider: 'manual',
})

const ASSETS: SeedAsset[] = [
  // --- Crypto (top por market cap) ---
  crypto('BTC', 'Bitcoin'),
  crypto('ETH', 'Ethereum'),
  crypto('USDT', 'Tether'),
  crypto('BNB', 'BNB'),
  crypto('SOL', 'Solana'),
  crypto('XRP', 'XRP'),
  crypto('USDC', 'USD Coin'),
  crypto('ADA', 'Cardano'),
  crypto('DOGE', 'Dogecoin'),
  crypto('AVAX', 'Avalanche'),
  crypto('TRX', 'TRON'),
  crypto('DOT', 'Polkadot'),
  crypto('MATIC', 'Polygon'),
  crypto('LINK', 'Chainlink'),
  crypto('SHIB', 'Shiba Inu'),
  crypto('LTC', 'Litecoin'),
  crypto('BCH', 'Bitcoin Cash'),
  crypto('UNI', 'Uniswap'),
  crypto('ATOM', 'Cosmos'),
  crypto('XLM', 'Stellar'),
  crypto('NEAR', 'NEAR Protocol'),
  crypto('ETC', 'Ethereum Classic'),
  crypto('FIL', 'Filecoin'),
  crypto('APT', 'Aptos'),
  crypto('ARB', 'Arbitrum'),
  crypto('OP', 'Optimism'),
  crypto('VET', 'VeChain'),
  crypto('ALGO', 'Algorand'),
  crypto('AAVE', 'Aave'),
  crypto('GRT', 'The Graph'),

  // --- Acciones US ---
  stockUs('AAPL', 'Apple Inc.'),
  stockUs('MSFT', 'Microsoft Corporation'),
  stockUs('GOOGL', 'Alphabet Inc.'),
  stockUs('AMZN', 'Amazon.com Inc.'),
  stockUs('NVDA', 'NVIDIA Corporation'),
  stockUs('META', 'Meta Platforms Inc.'),
  stockUs('TSLA', 'Tesla Inc.'),
  stockUs('BRK-B', 'Berkshire Hathaway Inc.'),
  stockUs('JPM', 'JPMorgan Chase & Co.'),
  stockUs('V', 'Visa Inc.'),
  stockUs('JNJ', 'Johnson & Johnson'),
  stockUs('WMT', 'Walmart Inc.'),
  stockUs('PG', 'Procter & Gamble Co.'),
  stockUs('MA', 'Mastercard Inc.'),
  stockUs('HD', 'The Home Depot Inc.'),
  stockUs('DIS', 'The Walt Disney Company'),
  stockUs('KO', 'The Coca-Cola Company'),
  stockUs('PEP', 'PepsiCo Inc.'),
  stockUs('NFLX', 'Netflix Inc.'),
  stockUs('ADBE', 'Adobe Inc.'),
  stockUs('INTC', 'Intel Corporation'),
  stockUs('AMD', 'Advanced Micro Devices Inc.'),
  stockUs('CSCO', 'Cisco Systems Inc.'),
  stockUs('CRM', 'Salesforce Inc.'),
  stockUs('ORCL', 'Oracle Corporation'),
  stockUs('QCOM', 'Qualcomm Inc.'),
  stockUs('PYPL', 'PayPal Holdings Inc.'),
  stockUs('BA', 'The Boeing Company'),
  stockUs('NKE', 'Nike Inc.'),
  stockUs('XOM', 'Exxon Mobil Corporation'),

  // --- Acciones argentinas (.BA) ---
  stockAr('GGAL.BA', 'Grupo Financiero Galicia'),
  stockAr('YPFD.BA', 'YPF S.A.'),
  stockAr('PAMP.BA', 'Pampa Energia S.A.'),
  stockAr('BMA.BA', 'Banco Macro S.A.'),
  stockAr('ALUA.BA', 'Aluar Aluminio Argentino'),
  stockAr('TXAR.BA', 'Ternium Argentina S.A.'),
  stockAr('CRES.BA', 'Cresud S.A.'),
  stockAr('CEPU.BA', 'Central Puerto S.A.'),
  stockAr('TGSU2.BA', 'Transportadora de Gas del Sur'),
  stockAr('COME.BA', 'Sociedad Comercial del Plata'),
  stockAr('SUPV.BA', 'Grupo Supervielle S.A.'),
  stockAr('BBAR.BA', 'Banco BBVA Argentina S.A.'),
  stockAr('LOMA.BA', 'Loma Negra C.I.A.S.A.'),
  stockAr('MIRG.BA', 'Mirgor S.A.C.I.F.I.A.'),

  // --- Divisas (par contra USD) ---
  currency('USD', 'Dolar estadounidense'),
  currency('EUR', 'Euro'),
  currency('GBP', 'Libra esterlina'),
  currency('JPY', 'Yen japones'),
  currency('CHF', 'Franco suizo'),
  currency('CAD', 'Dolar canadiense'),
  currency('AUD', 'Dolar australiano'),
  currency('BRL', 'Real brasileno'),
  currency('CNY', 'Yuan chino'),
  currency('MXN', 'Peso mexicano'),
  currency('CLP', 'Peso chileno'),
  currency('UYU', 'Peso uruguayo'),
  currency('ARS', 'Peso argentino'),

  // --- Bonos ---
  bond('US-T', 'US Treasury Bond'),
  bond('AL30', 'Bonar 2030 (Ley Local)'),
  bond('GD30', 'Global 2030 (Ley NY)'),
  bond('AL35', 'Bonar 2035 (Ley Local)'),
  bond('GD35', 'Global 2035 (Ley NY)'),
  bond('AE38', 'Global 2038 (Ley NY)'),
  bond('GD41', 'Global 2041 (Ley NY)'),
]

export default class AssetCatalogSeeder extends BaseSeeder {
  async run() {
    for (const asset of ASSETS) {
      await Asset.updateOrCreate({ symbol: asset.symbol, type: asset.type }, asset)
    }
  }
}
