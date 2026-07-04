/**
 * Seeder de usuario demo. A diferencia de `dev_user_seeder`, este SÍ corre en
 * `production`: deja un usuario fijo para demos / defensa de tesis sin tener
 * que registrarse a mano contra el backend desplegado.
 *
 * Credenciales: demo@grootfolio.app / DemoGroot123!
 *
 * Idempotente (`updateOrCreate` por email), así que re-correr `db:seed` no
 * duplica ni pisa datos inesperados. Como sub-producto verifica el hashing
 * end-to-end: si la verificacion falla, aborta.
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

const DEMO_EMAIL = 'demo@grootfolio.app'
const DEMO_PASSWORD = 'DemoGroot123!'

export default class DemoUserSeeder extends BaseSeeder {
  static environment = ['production', 'development', 'testing']

  async run() {
    const user = await User.updateOrCreate(
      { email: DEMO_EMAIL },
      {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        fullName: 'Usuario Demo',
      }
    )

    const verified = await User.verifyPassword(DEMO_PASSWORD, user.password)
    if (!verified) {
      throw new Error('Smoke test fallo: el hash del usuario demo no verifica')
    }
  }
}
