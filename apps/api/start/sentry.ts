/**
 * Inicializacion de Sentry (observabilidad, GF-185).
 *
 * Se activa SOLO si `SENTRY_DSN` esta definido; sin DSN es un no-op total, asi
 * que no afecta dev/test/CI ni requiere una cuenta para buildear/correr. Se
 * carga como primer preload (ver adonisrc.ts) para inicializar temprano.
 *
 * La captura de errores 5xx se hace en `app/exceptions/handler.ts` (report()).
 */
import env from '#start/env'
import * as Sentry from '@sentry/node'

const dsn = env.get('SENTRY_DSN')

if (dsn) {
  Sentry.init({
    dsn,
    environment: env.get('NODE_ENV'),
    tracesSampleRate: env.get('SENTRY_TRACES_SAMPLE_RATE') ?? 0,
  })
}
