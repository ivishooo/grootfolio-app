/**
 * Mapeo SYMBOL → coingecko id. CoinGecko no acepta tickers directos: cada
 * activo tiene un slug interno (BTC → "bitcoin", ETH → "ethereum", etc).
 *
 * Tabla curada de las ~35 cryptos por market cap mas habituales. Si llega un
 * symbol que no esta aca, el price_service devuelve precio null + warning;
 * el frontend lo mostrara con guion en vez de cotizacion.
 *
 * Post-MVP: GF-218+ podria promover esto a un lookup dinamico contra
 * /coins/list y persistirlo en `Asset.metadata.coingeckoId`.
 */
export const CG_SYMBOL_TO_ID: Readonly<Record<string, string>> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  SOL: 'solana',
  USDC: 'usd-coin',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  TRX: 'tron',
  TON: 'the-open-network',
  AVAX: 'avalanche-2',
  SHIB: 'shiba-inu',
  DOT: 'polkadot',
  LINK: 'chainlink',
  BCH: 'bitcoin-cash',
  NEAR: 'near',
  MATIC: 'matic-network',
  POL: 'polygon-ecosystem-token',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ICP: 'internet-computer',
  DAI: 'dai',
  APT: 'aptos',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  STX: 'blockstack',
  ATOM: 'cosmos',
  XMR: 'monero',
  ARB: 'arbitrum',
  OP: 'optimism',
  FIL: 'filecoin',
  HBAR: 'hedera-hashgraph',
  CRO: 'crypto-com-chain',
  ALGO: 'algorand',
}
