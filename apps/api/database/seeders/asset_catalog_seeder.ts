/**
 * Seeder del catalogo de activos. Alimenta el autocomplete (GF-248, Fase D)
 * con los instrumentos mas usados de cada categoria. Idempotente via
 * updateOrCreate sobre (symbol, type).
 *
 * Es data de referencia: corre en todos los entornos. Convenciones:
 * - crypto  -> currency USD, provider coingecko
 * - stock US -> currency USD, provider yahoo
 * - stock .BA (acciones argentinas y CEDEARs) -> currency ARS (el orquestador
 *   convierte a USD via FX, GF-219), provider yahoo
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
/**
 * CEDEAR: el instrumento con el que un inversor argentino accede a una accion
 * extranjera. Cotiza en pesos en BYMA y representa una fraccion de la accion,
 * asi que NO se puede cargar contra el ticker del subyacente — ver ADR-0005.
 * El nombre lleva el sufijo "(CEDEAR)" para distinguirlo en el autocomplete.
 *
 * Todos los symbols de esta lista estan verificados contra Yahoo: devuelven
 * precio en ARS y la razon social de la empresa correcta. Atencion al agregar
 * mas: `XXX.BA` no siempre es el CEDEAR de `XXX`. `BAC.BA`, por ejemplo, es el
 * CEDEAR de Boeing en su serie en dolares, no el de Bank of America.
 */
const cedear = (symbol: string, name: string): SeedAsset => ({
  symbol,
  name: `${name} (CEDEAR)`,
  type: 'stock',
  currency: 'ARS',
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

  // --- CEDEARs (acciones y ETFs extranjeros que cotizan en pesos en BYMA) ---
  cedear('AAPL.BA', 'Apple Inc.'),
  cedear('MSFT.BA', 'Microsoft Corporation'),
  cedear('AMZN.BA', 'Amazon.com Inc.'),
  cedear('GOOGL.BA', 'Alphabet Inc.'),
  cedear('META.BA', 'Meta Platforms Inc.'),
  cedear('TSLA.BA', 'Tesla Inc.'),
  cedear('NVDA.BA', 'NVIDIA Corporation'),
  cedear('AMD.BA', 'Advanced Micro Devices Inc.'),
  cedear('INTC.BA', 'Intel Corporation'),
  cedear('ADBE.BA', 'Adobe Inc.'),
  cedear('ORCL.BA', 'Oracle Corporation'),
  cedear('CRM.BA', 'Salesforce Inc.'),
  cedear('QCOM.BA', 'QUALCOMM Incorporated'),
  cedear('NFLX.BA', 'Netflix Inc.'),
  cedear('BABA.BA', 'Alibaba Group Holding Limited'),
  cedear('MELI.BA', 'MercadoLibre Inc.'),
  cedear('GLOB.BA', 'Globant S.A.'),
  cedear('VIST.BA', 'Vista Energy'),
  cedear('TXR.BA', 'Ternium S.A.'),
  cedear('PBR.BA', 'Petroleo Brasileiro S.A.'),
  cedear('VALE.BA', 'Vale S.A.'),
  cedear('KO.BA', 'The Coca-Cola Company'),
  cedear('MCD.BA', 'McDonalds Corporation'),
  cedear('SBUX.BA', 'Starbucks Corporation'),
  cedear('NKE.BA', 'NIKE Inc.'),
  cedear('PG.BA', 'Procter & Gamble'),
  cedear('WMT.BA', 'Walmart Inc.'),
  cedear('HD.BA', 'The Home Depot Inc.'),
  cedear('JNJ.BA', 'Johnson & Johnson'),
  cedear('PFE.BA', 'Pfizer Inc.'),
  cedear('UNH.BA', 'UnitedHealth Group'),
  cedear('V.BA', 'Visa Inc.'),
  cedear('MA.BA', 'Mastercard Incorporated'),
  cedear('JPM.BA', 'JPMorgan Chase & Co.'),
  cedear('C.BA', 'Citigroup Inc.'),
  cedear('GS.BA', 'The Goldman Sachs Group Inc.'),
  cedear('BRKB.BA', 'Berkshire Hathaway Inc.'),
  cedear('XOM.BA', 'Exxon Mobil Corporation'),
  cedear('CAT.BA', 'Caterpillar Inc.'),
  cedear('MMM.BA', '3M Company'),
  cedear('BA.BA', 'The Boeing Company'),
  cedear('T.BA', 'AT&T Inc.'),
  cedear('VZ.BA', 'Verizon Communications Inc.'),
  cedear('SPY.BA', 'SPDR S&P 500 ETF Trust'),
  cedear('QQQ.BA', 'Invesco QQQ Trust'),
  cedear('DIA.BA', 'SPDR Dow Jones Industrial Average ETF'),
  cedear('EEM.BA', 'iShares MSCI Emerging Markets ETF'),

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
