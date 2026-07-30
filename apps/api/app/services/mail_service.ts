/**
 * MailService (F2, stub). Todavía no hay mailer configurado en el proyecto, así
 * que por ahora logueamos el envío en vez de mandar el email. No bloquea la
 * feature: cuando se integre @adonisjs/mail, reemplazar el cuerpo de cada método.
 */
import logger from '@adonisjs/core/services/logger'
import type { DateTime } from 'luxon'

// TODO(mailer): integrar @adonisjs/mail (SMTP/Resend) y enviar el email real.
export async function sendSuspensionEmail(
  to: string,
  reason: string,
  until: DateTime | null
): Promise<void> {
  logger.info(
    { to, reason, until: until?.toISO() ?? 'indefinida' },
    'MailService: aviso de suspensión (stub, no se envió email real)'
  )
}
