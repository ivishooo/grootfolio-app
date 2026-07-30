/**
 * Seeder de admin (F1). Promueve a `role='admin'` los usuarios de prueba (dev y
 * demo) y crea las 4 secciones base de contenidos. Idempotente.
 *
 * Prefijo `z_` para que corra DESPUÉS de dev_user_seeder / demo_user_seeder
 * (los seeders se ejecutan en orden alfabético): así los usuarios ya existen
 * cuando los promovemos.
 */
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import ContentSection from '#models/content_section'

const ADMIN_EMAILS = ['dev@grootfolio.test', 'demo@grootfolio.app']

const BASE_SECTIONS = [
  { name: 'Primeros pasos', slug: 'primeros-pasos', icon: '🚀', color: '#F97316', position: 0 },
  { name: 'Cripto', slug: 'cripto', icon: '₿', color: '#F97316', position: 1 },
  { name: 'Acciones y bonos', slug: 'acciones-y-bonos', icon: '↗', color: '#3B82F6', position: 2 },
  { name: 'Impuestos', slug: 'impuestos', icon: '§', color: '#8B5CF6', position: 3 },
]

export default class extends BaseSeeder {
  async run() {
    for (const email of ADMIN_EMAILS) {
      const user = await User.findBy('email', email)
      if (user && user.role !== 'admin') {
        user.role = 'admin'
        await user.save()
      }
    }

    for (const section of BASE_SECTIONS) {
      await ContentSection.updateOrCreate({ slug: section.slug }, section)
    }
  }
}
