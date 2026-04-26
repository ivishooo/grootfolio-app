/**
 * Migracion inicial del esquema Postgres.
 * Genera las tablas base acordadas en el documento de arquitectura:
 * users, refresh_tokens, asset_catalog, transactions, price_snapshots,
 * quiz_questions, quiz_options, quiz_responses, risk_profiles.
 */

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class InitialSchema extends BaseSchema {
  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    this.schema.createTable('users', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.string('email', 190).unique().notNullable()
      t.string('password').notNullable()
      t.string('full_name', 80).nullable()
      t.string('risk_profile', 20).nullable()
      t.integer('risk_score').nullable()
      t.timestamp('risk_calculated_at').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    this.schema.createTable('refresh_tokens', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      t.string('token_hash').notNullable()
      t.timestamp('expires_at', { useTz: true }).notNullable()
      t.timestamp('revoked_at', { useTz: true }).nullable()
      t.string('replaced_by').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
    })

    this.schema.createTable('asset_catalog', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.string('symbol', 20).notNullable()
      t.string('name', 120).notNullable()
      t.string('type', 20).notNullable() // crypto | stock | bond | currency
      t.string('currency', 10).notNullable().defaultTo('USD')
      t.string('preferred_provider', 30).notNullable().defaultTo('coingecko')
      t.jsonb('metadata').nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.unique(['symbol', 'type'])
    })

    this.schema.createTable('transactions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      t.uuid('asset_id').references('id').inTable('asset_catalog').notNullable()
      t.string('kind', 10).notNullable() // buy | sell
      t.decimal('quantity', 24, 10).notNullable()
      t.decimal('unit_price', 24, 10).notNullable()
      t.decimal('fee', 24, 10).notNullable().defaultTo(0)
      t.timestamp('purchased_at', { useTz: true }).notNullable()
      t.text('notes').nullable()
      t.timestamp('deleted_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      t.index(['user_id', 'asset_id'])
    })

    this.schema.createTable('price_snapshots', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('asset_id').references('id').inTable('asset_catalog').onDelete('CASCADE').notNullable()
      t.decimal('price', 24, 10).notNullable()
      t.string('currency', 10).notNullable()
      t.string('provider', 30).notNullable()
      t.timestamp('fetched_at', { useTz: true }).notNullable()
      t.jsonb('raw').nullable()
      t.index(['asset_id', 'fetched_at'])
    })

    this.schema.createTable('quiz_questions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.integer('order').notNullable()
      t.string('text', 500).notNullable()
      t.boolean('active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).defaultTo(this.now())
    })

    this.schema.createTable('quiz_options', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('question_id').references('id').inTable('quiz_questions').onDelete('CASCADE').notNullable()
      t.string('label', 300).notNullable()
      t.integer('score').notNullable()
      t.integer('order').notNullable()
    })

    this.schema.createTable('quiz_responses', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      t.uuid('attempt_id').notNullable()
      t.uuid('question_id').references('id').inTable('quiz_questions').notNullable()
      t.uuid('option_id').references('id').inTable('quiz_options').notNullable()
      t.timestamp('answered_at', { useTz: true }).defaultTo(this.now())
      t.index(['user_id', 'attempt_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists('quiz_responses')
    this.schema.dropTableIfExists('quiz_options')
    this.schema.dropTableIfExists('quiz_questions')
    this.schema.dropTableIfExists('price_snapshots')
    this.schema.dropTableIfExists('transactions')
    this.schema.dropTableIfExists('asset_catalog')
    this.schema.dropTableIfExists('refresh_tokens')
    this.schema.dropTableIfExists('users')
  }
}
