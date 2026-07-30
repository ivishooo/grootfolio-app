/**
 * F1.3 (Admin/Contenidos). Tablas de la biblioteca de contenidos: secciones
 * planas (sin subcarpetas), items (doc/video/imagen/enlace) y vistas por usuario.
 */
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('content_sections', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.string('name', 120).notNullable()
      t.string('slug', 140).notNullable().unique()
      t.string('icon', 40).nullable()
      t.string('color', 20).nullable()
      t.integer('position').notNullable().defaultTo(0)
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    this.schema.createTable('content_items', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('section_id').references('id').inTable('content_sections').onDelete('CASCADE').notNullable()
      t.string('type', 10).notNullable() // doc | video | image | link
      t.string('title', 200).notNullable()
      t.text('description').nullable()
      t.string('storage_key').nullable()
      t.text('external_url').nullable()
      t.string('mime_type', 100).nullable()
      t.bigInteger('size_bytes').nullable()
      t.integer('duration_seconds').nullable()
      t.string('status', 12).notNullable().defaultTo('draft') // draft | published
      t.boolean('pinned').notNullable().defaultTo(false)
      t.integer('views_count').notNullable().defaultTo(0)
      t.timestamp('published_at', { useTz: true }).nullable()
      t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      t.index(['status', 'published_at'])
      t.index('section_id')
      t.index('pinned')
    })

    this.schema.createTable('content_views', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      t.uuid('content_item_id').references('id').inTable('content_items').onDelete('CASCADE').notNullable()
      t.timestamp('viewed_at', { useTz: true }).defaultTo(this.now())
      t.unique(['user_id', 'content_item_id'])
    })
  }

  async down() {
    this.schema.dropTable('content_views')
    this.schema.dropTable('content_items')
    this.schema.dropTable('content_sections')
  }
}
