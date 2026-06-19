/**
 * Whitelist de symbols soportados por Yahoo Finance. Yahoo acepta los tickers
 * directamente (sin slug interno como CoinGecko); el rol del set es:
 *  1. Limitar las llamadas a lo que conocemos y validamos.
 *  2. Cortar tickers raros antes de gastar una request a Yahoo.
 *
 * Top ~20 US (NASDAQ/NYSE) + top ~13 argentinos (sufijo .BA). Si el usuario
 * registra un symbol fuera de la lista, el provider lo devuelve null y el
 * orquestador lo marca `unsupported` (no se persiste snapshot).
 *
 * Atencion: los .BA cotizan en ARS, no USD. Desde GF-219 el orquestador
 * convierte esas quotes a USD via fx_service (dolarapi CCL u BCRA oficial)
 * para reportar el portfolio en moneda base.
 */
export const YAHOO_KNOWN_SYMBOLS: ReadonlySet<string> = new Set([
  // US (NASDAQ/NYSE, en USD)
  'AAPL',
  'MSFT',
  'GOOGL',
  'GOOG',
  'AMZN',
  'NVDA',
  'META',
  'TSLA',
  'BRK.B',
  'JPM',
  'V',
  'JNJ',
  'WMT',
  'PG',
  'MA',
  'UNH',
  'HD',
  'DIS',
  'BAC',
  'ADBE',
  'NFLX',
  // Argentina (BCBA, sufijo .BA, cotizan en ARS hasta tener FX)
  'GGAL.BA',
  'YPF.BA',
  'BBAR.BA',
  'BMA.BA',
  'PAMP.BA',
  'TGSU2.BA',
  'TXAR.BA',
  'MIRG.BA',
  'COME.BA',
  'EDN.BA',
  'ALUA.BA',
  'CRES.BA',
  'TECO2.BA',
])
