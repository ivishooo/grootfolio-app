/**
 * Seeder de desarrollo. Crea (o actualiza) un usuario `dev@grootfolio.test`
 * con password `DevPass123!` para probar el flujo de auth localmente.
 *
 * No corre en `production`. Como sub-producto verifica que el hashing
 * funciona end-to-end (smoke test del modelo User para GF-205): si la
 * verificacion falla, aborta con error.
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

const DEV_EMAIL = 'dev@grootfolio.test'
const DEV_PASSWORD = 'DevPass123!'

export default class DevUserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    const user = await User.updateOrCreate(
      { email: DEV_EMAIL },
      {
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
        fullName: 'Usuario Dev',
      }
    )

    const verified = await User.verifyPassword(DEV_PASSWORD, user.password)
    if (!verified) {
      throw new Error('Smoke test fallo: el hash no verifica contra el password esperado')
    }
  }
}
