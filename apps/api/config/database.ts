import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Conexion a Postgres con dos modos:
 *  - Local/dev: variables DB_* discretas (host, port, user, ...).
 *  - Deploy (Railway/Fly): DATABASE_URL (connection string) si esta presente.
 *
 * TLS: los Postgres gestionados suelen exigir SSL con cadenas no verificables
 * por la CA del sistema, por eso `rejectUnauthorized: false`. Se activa cuando
 * DB_SSL=true o, por default, cuando hay DATABASE_URL.
 */
const databaseUrl = env.get('DATABASE_URL')
const ssl = (env.get('DB_SSL') ?? Boolean(databaseUrl)) ? { rejectUnauthorized: false } : false

const connection = databaseUrl
  ? { connectionString: databaseUrl, ssl }
  : {
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD'),
      database: env.get('DB_DATABASE'),
      ssl,
    }

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
  },
})

export default dbConfig
