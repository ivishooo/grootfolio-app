/**
 * Comando `db:clean-test-data` (ISSUE-010 del pase de QA del 2026-08-26).
 *
 * Las suites automatizadas y las pruebas manuales del plan de pruebas crean
 * usuarios y contenidos descartables, y ninguna los limpia. El resultado es que
 * la base de desarrollo se va llenando: al momento de escribir esto había 29
 * usuarios, de los cuales 27 eran fixtures, y los 6 items de la biblioteca de
 * Contenidos se llamaban todos `E2E Guía <timestamp>`. Cualquier demo o QA
 * visual arrancaba sucio.
 *
 * No alcanza con que cada test borre lo suyo: la API expone borrado de
 * contenidos pero **no** de usuarios (a los usuarios se los suspende, con
 * registro en el historial de auditoría, que es una decisión de producto). Por
 * eso la limpieza vive acá, del lado de la base.
 *
 *   node ace db:clean-test-data            # dry-run: dice qué borraría
 *   node ace db:clean-test-data --commit   # borra de verdad
 *
 * Es dry-run por defecto a propósito: borra usuarios en cascada (transacciones,
 * tokens, respuestas del quiz, notificaciones, conversaciones del chat), así
 * que conviene leer antes de disparar.
 */
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Emails que NUNCA se borran, aunque matcheen algún patrón. Son las dos cuentas
 * que siembra `db:seed` y sobre las que se apoyan las demos y los propios tests.
 */
const PROTEGIDOS = ['dev@grootfolio.test', 'demo@grootfolio.app']

/**
 * Cómo se reconoce un usuario descartable. Son patrones SQL `LIKE`.
 *
 * El primero es la convención **a usar de ahora en adelante**: cualquier fixture
 * nueva debería registrarse bajo el dominio reservado `@e2e.grootfolio.test`,
 * así este comando no necesita crecer cada vez que se agrega una prueba.
 *
 * El resto son los patrones históricos, de cuando no había convención. Están
 * enumerados uno por uno en vez de con un `LIKE '%test%'` genérico: una regla
 * amplia acá termina borrando un usuario real el día que alguien se registre
 * con un mail que casualmente matchee.
 */
const PATRONES_EMAIL = [
  '%@e2e.grootfolio.test', // convención nueva
  '%@gf.test', // pruebas de auth por curl (rot/logb/logout/chainc/flow/me/dup/final)
  '%@test.local', // pruebas de holdings y portfolio (gf213/gf214)
  'e2e-suspend-%@grootfolio.test', // admin-users.spec.ts
  'e2e-user-%@grootfolio.test', // admin-users.spec.ts
  'crud-test-%@grootfolio.test', // pruebas manuales del CRUD de admin
  'reg%@grootfolio.test', // pruebas de registro
  'fasec%@grootfolio.test', // pruebas de la fase C
  'f6-%@grootfolio.test', // pruebas de la fase 6
  'test1@grootfolio.test', // prueba suelta temprana
]

/** Títulos de contenidos descartables. `content.spec.ts` usa `E2E Guía <ts>`. */
const PATRONES_CONTENIDO = ['E2E %']

export default class DbCleanTestData extends BaseCommand {
  static commandName = 'db:clean-test-data'
  static description = 'Borra los usuarios y contenidos descartables que dejan las pruebas'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Borra de verdad. Sin este flag sólo informa qué borraría.' })
  declare commit: boolean

  async run() {
    const app = await import('@adonisjs/core/services/app')
    if (app.default.inProduction) {
      this.logger.error('Este comando no corre en producción. Abortado.')
      this.exitCode = 1
      return
    }

    const { default: User } = await import('#models/user')
    const { default: ContentItem } = await import('#models/content_item')

    const usuarios = await User.query()
      .where((q) => {
        for (const patron of PATRONES_EMAIL) q.orWhereILike('email', patron)
      })
      .whereNotIn('email', PROTEGIDOS)

    const contenidos = await ContentItem.query().where((q) => {
      for (const patron of PATRONES_CONTENIDO) q.orWhereILike('title', patron)
    })

    // Notificaciones que apuntan a contenidos que ya no existen. Enlazan por
    // `data->>'contentItemId'`, que es jsonb y no tiene FK, asi que sobreviven
    // al borrado del item y quedan en la campana enlazando a la nada. El
    // controller ya no las deja huerfanas (`admin_content_controller.deleteItem`),
    // pero las que quedaron de antes hay que barrerlas igual.
    const huerfanas = await db
      .from('notifications')
      .whereNotNull(db.raw("data->>'contentItemId'"))
      .whereNotExists((q) =>
        q.from('content_items').whereRaw("content_items.id::text = notifications.data->>'contentItemId'")
      )
      .count('* as total')
    const huerfanasTotal = Number(huerfanas[0]?.total ?? 0)

    if (usuarios.length === 0 && contenidos.length === 0 && huerfanasTotal === 0) {
      this.logger.info('No hay datos de prueba para limpiar.')
      return
    }

    for (const u of usuarios) this.logger.info(`usuario        ${u.email}`)
    for (const c of contenidos) this.logger.info(`contenido      ${c.title}`)
    if (huerfanasTotal > 0) this.logger.info(`notificaciones ${huerfanasTotal} huérfana(s)`)

    if (!this.commit) {
      this.logger.warning(
        `Dry-run: se borrarían ${usuarios.length} usuario(s), ${contenidos.length} contenido(s) ` +
          `y ${huerfanasTotal} notificación(es) huérfana(s). Volvé a correrlo con --commit para hacerlo.`
      )
      return
    }

    // Los borrados de usuario arrastran en cascada transacciones, refresh
    // tokens, respuestas del quiz, vistas de contenido, notificaciones y el
    // historial de chat (ver los `onDelete('CASCADE')` de las migraciones). El
    // historial de auditoría sobrevive con `actor_id` en null, que es lo que
    // queremos: la acción del admin quedó registrada aunque el usuario ya no esté.
    for (const u of usuarios) await u.delete()
    for (const c of contenidos) await c.delete()

    // Después de borrar los contenidos, porque recién ahí quedan huérfanas las
    // notificaciones que los apuntaban.
    const barridas = await db
      .from('notifications')
      .whereNotNull(db.raw("data->>'contentItemId'"))
      .whereNotExists((q) =>
        q.from('content_items').whereRaw("content_items.id::text = notifications.data->>'contentItemId'")
      )
      .delete()

    this.logger.success(
      `Borrados ${usuarios.length} usuario(s), ${contenidos.length} contenido(s) ` +
        `y ${barridas} notificación(es) huérfana(s).`
    )
  }
}
