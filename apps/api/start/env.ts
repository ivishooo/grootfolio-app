/**
 * Validador de variables de entorno. Adonis lee este archivo durante el
 * arranque y aborta si falta o es invalida alguna variable obligatoria.
 */
import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const),
  APP_KEY: Env.schema.string(),
  TZ: Env.schema.string.optional(),

  // Conexion a Postgres. En local se usan las DB_* discretas (ver .env.example).
  // En deploy (Railway/Fly), el Postgres gestionado expone una connection string
  // en DATABASE_URL; si esta presente tiene prioridad sobre las DB_*. DB_SSL
  // fuerza TLS (los Postgres gestionados suelen requerirlo); por default se
  // activa cuando hay DATABASE_URL. Detalle en config/database.ts.
  DATABASE_URL: Env.schema.string.optional(),
  DB_SSL: Env.schema.boolean.optional(),
  DB_HOST: Env.schema.string.optional({ format: 'host' }),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string.optional(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string.optional(),

  JWT_SECRET: Env.schema.string(),
  JWT_ACCESS_TTL: Env.schema.string(),
  JWT_REFRESH_TTL: Env.schema.string(),

  CORS_ORIGINS: Env.schema.string.optional(),

  COINGECKO_API_KEY: Env.schema.string.optional(),
  COINGECKO_PRICE_TTL_SECONDS: Env.schema.number.optional(),
  COINGECKO_DB_TTL_SECONDS: Env.schema.number.optional(),

  // FX / divisas (GF-219). Fuente del dolar para convertir activos en ARS a la
  // moneda base USD: 'ccl' (dolarapi, default) u 'oficial' (BCRA). Las demas
  // divisas (EUR, GBP, etc.) salen de Frankfurter. TTL del cache in-memory de
  // tasas, default 3600s (las cotizaciones de cierre se mueven lento).
  FX_ARS_SOURCE: Env.schema.enum.optional(['ccl', 'oficial'] as const),
  FX_TTL_SECONDS: Env.schema.number.optional(),

  // Job de actualizacion periodica de precios (GF-221). El scheduler in-process
  // solo arranca con PRICES_REFRESH_ENABLED=true (default off para no fetchear
  // en dev/test sin querer). Intervalo por tipo de activo, en segundos.
  PRICES_REFRESH_ENABLED: Env.schema.boolean.optional(),
  PRICES_REFRESH_CRYPTO_SECONDS: Env.schema.number.optional(),
  PRICES_REFRESH_STOCK_SECONDS: Env.schema.number.optional(),
  PRICES_REFRESH_CURRENCY_SECONDS: Env.schema.number.optional(),
})
