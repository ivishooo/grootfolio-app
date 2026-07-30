/**
 * AdminUsersController (F2). Gestión de usuarios para admins. Todo bajo
 * `/admin` con `auth` + `admin` middleware. Cada acción destructiva/moderadora
 * escribe en `admin_audit_logs`. Un admin no puede suspenderse a sí mismo ni a
 * otro admin (422). Suspender revoca los refresh tokens del usuario.
 */
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#models/transaction'
import RefreshToken from '#models/refresh_token'
import { revokeAllForUser } from '#services/auth/token_service'
import { aggregateHoldings } from '#services/portfolio/holdings_service'
import { aggregatePortfolio } from '#services/portfolio/portfolio_service'
import { getPrices } from '#services/prices/price_service'
import { getRateToUsd } from '#services/prices/fx/fx_service'
import {
  computeSuspendedUntil,
  createNotification,
  writeAudit,
  type SuspensionDuration,
} from '#services/admin/admin_actions'
import { sendSuspensionEmail } from '#services/mail_service'
import {
  bulkSuspendValidator,
  bulkUnsuspendValidator,
  deleteAvatarValidator,
  renameUserValidator,
  suspendUserValidator,
} from '#validators/admin'

const label = (u: User) => u.fullName?.trim() || u.email

export default class AdminUsersController {
  /** GET /admin/users — lista paginada con filtros + métricas. */
  async index({ request, response }: HttpContext) {
    const search = String(request.input('search', '')).trim()
    const status = request.input('status')
    const role = request.input('role')
    const sort = request.input('sort', 'recent')
    const page = Number(request.input('page', 1)) || 1
    const perPage = Math.min(Number(request.input('perPage', 20)) || 20, 100)

    const query = User.query()
    if (search) {
      query.where((b) => {
        b.whereILike('full_name', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }
    if (status === 'active' || status === 'suspended') query.where('status', status)
    if (role === 'user' || role === 'admin') query.where('role', role)
    if (sort === 'name') query.orderBy('full_name', 'asc')
    else if (sort === 'oldest') query.orderBy('created_at', 'asc')
    else query.orderBy('created_at', 'desc')

    const paginated = await query.paginate(page, perPage)
    const rows = paginated.all()

    // Agregado barato de transacciones por usuario de la página (conteo +
    // invertido aproximado en la moneda del precio; el detalle da el valor real).
    const ids = rows.map((u) => u.id)
    const txAgg = ids.length
      ? await db
          .from('transactions')
          .whereIn('user_id', ids)
          .whereNull('deleted_at')
          .groupBy('user_id')
          .select(
            'user_id',
            db.raw('count(*)::int as tx_count'),
            db.raw("coalesce(sum(case when kind='buy' then quantity*unit_price else 0 end),0)::float as invested")
          )
      : []
    const byUser = new Map<string, { tx_count: number; invested: number }>(
      txAgg.map((r: { user_id: string; tx_count: number; invested: number }) => [r.user_id, r])
    )

    const data = rows.map((u) => ({
      ...u.serialize(),
      portfolioValue: byUser.get(u.id)?.invested ?? 0,
      transactionsCount: byUser.get(u.id)?.tx_count ?? 0,
    }))

    const statsRow = await db
      .from('users')
      .select(
        db.raw('count(*)::int as total'),
        db.raw("count(*) filter (where status='active')::int as active"),
        db.raw("count(*) filter (where status='suspended')::int as suspended"),
        db.raw("count(*) filter (where created_at >= now() - interval '30 days')::int as new_last_30d")
      )
      .first()

    return response.status(200).send({
      data,
      meta: paginated.getMeta(),
      stats: {
        total: Number(statsRow?.total ?? 0),
        active: Number(statsRow?.active ?? 0),
        suspended: Number(statsRow?.suspended ?? 0),
        newLast30d: Number(statsRow?.new_last_30d ?? 0),
      },
    })
  }

  /** GET /admin/users/:id — detalle con valor real de portafolio y actividad. */
  async show({ params, response }: HttpContext) {
    const target = await User.find(params.id)
    if (!target) {
      return response.status(404).send({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' })
    }

    const transactions = await Transaction.query()
      .where('user_id', target.id)
      .whereNull('deleted_at')
      .preload('asset')
      .orderBy('purchased_at', 'asc')

    let portfolioValue = 0
    if (transactions.length > 0) {
      const fxRates: Record<string, number> = {}
      for (const currency of new Set(transactions.map((t) => t.priceCurrency))) {
        if (currency === 'USD' || fxRates[currency] !== undefined) continue
        const rate = await getRateToUsd(currency)
        if (rate !== null) fxRates[currency] = rate
      }
      const holdings = aggregateHoldings(transactions, fxRates)
      const assetRefs = holdings.map((h) => ({ id: h.assetId, symbol: h.asset.symbol, type: h.asset.type }))
      const prices = assetRefs.length > 0 ? await getPrices(assetRefs) : {}
      portfolioValue = aggregatePortfolio(holdings, prices).totalValue
    }

    const lastToken = await RefreshToken.query()
      .where('user_id', target.id)
      .orderBy('created_at', 'desc')
      .first()

    const recentActivity = transactions
      .slice(-5)
      .reverse()
      .map((t) => ({
        label: `${t.kind === 'buy' ? 'Compra' : 'Venta'} de ${t.asset.symbol}`,
        at: t.purchasedAt.toISO(),
      }))

    return response.status(200).send({
      user: target.serialize(),
      portfolioValue,
      transactionsCount: transactions.length,
      lastLoginAt: lastToken?.createdAt.toISO() ?? null,
      recentActivity,
    })
  }

  /** POST /admin/users/:id/suspend */
  async suspend({ params, request, response, currentUser }: HttpContext) {
    const target = await User.find(params.id)
    if (!target) {
      return response.status(404).send({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' })
    }
    if (this.guardTarget(target, currentUser, response)) return

    const payload = await request.validateUsing(suspendUserValidator)
    const until = this.resolveUntil(payload.duration as SuspensionDuration, payload.until, response)
    if (until === 'invalid') return

    target.status = 'suspended'
    target.suspendedUntil = until
    target.suspendedReason = payload.reason
    target.suspendedAt = DateTime.now()
    target.suspendedBy = currentUser.id
    await target.save()
    await revokeAllForUser(target.id)

    await writeAudit({
      actorId: currentUser.id,
      action: 'user.suspend',
      targetType: 'user',
      targetId: target.id,
      targetLabel: label(target),
      reason: payload.reason,
      metadata: { duration: payload.duration, until: until?.toISO() ?? null },
    })
    if (payload.notifyEmail) await sendSuspensionEmail(target.email, payload.reason, until)

    return response.status(200).send({ user: target.serialize() })
  }

  /** POST /admin/users/:id/unsuspend */
  async unsuspend({ params, response, currentUser }: HttpContext) {
    const target = await User.find(params.id)
    if (!target) {
      return response.status(404).send({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' })
    }
    this.clearSuspension(target)
    await target.save()
    await writeAudit({
      actorId: currentUser.id,
      action: 'user.unsuspend',
      targetType: 'user',
      targetId: target.id,
      targetLabel: label(target),
    })
    return response.status(200).send({ user: target.serialize() })
  }

  /** POST /admin/users/bulk-suspend */
  async bulkSuspend({ request, response, currentUser }: HttpContext) {
    const payload = await request.validateUsing(bulkSuspendValidator)
    const until = this.resolveUntil(payload.duration as SuspensionDuration, payload.until, response)
    if (until === 'invalid') return

    const targets = await User.query().whereIn('id', payload.userIds)
    // Se saltan a sí mismo y a otros admins (no se suspenden).
    const eligible = targets.filter((u) => u.id !== currentUser.id && u.role !== 'admin')

    for (const target of eligible) {
      target.status = 'suspended'
      target.suspendedUntil = until
      target.suspendedReason = payload.reason
      target.suspendedAt = DateTime.now()
      target.suspendedBy = currentUser.id
      await target.save()
      await revokeAllForUser(target.id)
      await writeAudit({
        actorId: currentUser.id,
        action: 'user.suspend',
        targetType: 'user',
        targetId: target.id,
        targetLabel: label(target),
        reason: payload.reason,
        metadata: { duration: payload.duration, until: until?.toISO() ?? null, bulk: true },
      })
      if (payload.notifyEmail) await sendSuspensionEmail(target.email, payload.reason, until)
    }

    return response.status(200).send({ affected: eligible.length, skipped: targets.length - eligible.length })
  }

  /** POST /admin/users/bulk-unsuspend */
  async bulkUnsuspend({ request, response, currentUser }: HttpContext) {
    const payload = await request.validateUsing(bulkUnsuspendValidator)
    const targets = await User.query().whereIn('id', payload.userIds)
    for (const target of targets) {
      this.clearSuspension(target)
      await target.save()
      await writeAudit({
        actorId: currentUser.id,
        action: 'user.unsuspend',
        targetType: 'user',
        targetId: target.id,
        targetLabel: label(target),
        metadata: { bulk: true },
      })
    }
    return response.status(200).send({ affected: targets.length })
  }

  /** DELETE /admin/users/:id/avatar */
  async deleteAvatar({ params, request, response, currentUser }: HttpContext) {
    const target = await User.find(params.id)
    if (!target) {
      return response.status(404).send({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' })
    }
    const payload = await request.validateUsing(deleteAvatarValidator)
    const had = !!target.avatarUrl
    // El borrado del archivo físico se hace en F3 (storage); acá anulamos la URL.
    target.avatarUrl = null
    await target.save()
    await writeAudit({
      actorId: currentUser.id,
      action: 'user.avatar_delete',
      targetType: 'user',
      targetId: target.id,
      targetLabel: label(target),
    })
    if (payload.notifyUser && had) {
      await createNotification(
        target.id,
        'profile.moderated',
        'Un administrador eliminó tu foto de perfil',
        'Tu avatar volvió a mostrar tus iniciales.'
      )
    }
    return response.status(200).send({ user: target.serialize() })
  }

  /** PATCH /admin/users/:id/name */
  async rename({ params, request, response, currentUser }: HttpContext) {
    const target = await User.find(params.id)
    if (!target) {
      return response.status(404).send({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' })
    }
    const payload = await request.validateUsing(renameUserValidator)
    const from = target.fullName
    target.fullName = payload.fullName
    await target.save()
    await writeAudit({
      actorId: currentUser.id,
      action: 'user.rename',
      targetType: 'user',
      targetId: target.id,
      targetLabel: payload.fullName,
      metadata: { from, to: payload.fullName },
    })
    if (payload.notifyUser) {
      await createNotification(
        target.id,
        'profile.moderated',
        'Un administrador cambió tu nombre visible',
        `Ahora tu nombre es "${payload.fullName}".`
      )
    }
    return response.status(200).send({ user: target.serialize() })
  }

  // --- helpers privados ---

  /**
   * `true` (y ya envió el 422) si el target es uno mismo u otro admin. El caller
   * debe `return` en ese caso. En Adonis `response.send()` no corta la ejecución,
   * por eso devolvemos un boolean en vez de la respuesta.
   */
  private guardTarget(target: User, actor: User, response: HttpContext['response']): boolean {
    if (target.id === actor.id) {
      response.status(422).send({ code: 'CANNOT_SUSPEND_SELF', message: 'No podés suspender tu propia cuenta.' })
      return true
    }
    if (target.role === 'admin') {
      response.status(422).send({ code: 'CANNOT_SUSPEND_ADMIN', message: 'No se puede suspender a otro administrador.' })
      return true
    }
    return false
  }

  /**
   * Resuelve la fecha de fin. Manda 422 y devuelve 'invalid' si `custom` no
   * trae una fecha futura válida. Si no, devuelve la DateTime|null.
   */
  private resolveUntil(
    duration: SuspensionDuration,
    until: string | undefined,
    response: HttpContext['response']
  ): DateTime | null | 'invalid' {
    if (duration === 'custom') {
      if (!until) {
        response.status(422).send({ code: 'SUSPENSION_UNTIL_REQUIRED', message: 'Indicá la fecha de reactivación.' })
        return 'invalid'
      }
      const dt = DateTime.fromISO(until)
      if (!dt.isValid || dt <= DateTime.now()) {
        response.status(422).send({ code: 'SUSPENSION_UNTIL_INVALID', message: 'La fecha debe ser futura y válida.' })
        return 'invalid'
      }
      return dt
    }
    return computeSuspendedUntil(duration, until)
  }

  private clearSuspension(user: User) {
    user.status = 'active'
    user.suspendedUntil = null
    user.suspendedReason = null
    user.suspendedAt = null
    user.suspendedBy = null
  }
}
