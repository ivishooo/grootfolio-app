/**
 * Handler global de excepciones (GF-215). Serializa TODOS los errores al shape
 * `ApiError` de `@grootfolio/shared` (`{ code, message, details? }`), para que
 * el cliente (ApiClient de web/mobile) tenga un contrato de error uniforme.
 *
 * - Errores de validacion de Vine -> 422 `VALIDATION_ERROR` con el detalle por
 *   campo en `details.errors`.
 * - Errores 5xx -> mensaje generico (no se filtra el interno en produccion).
 * - Resto de errores HTTP (404 de ruta, etc.) -> code/message del error.
 */
import app from '@adonisjs/core/services/app'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'

interface MaybeHttpError {
  status?: number
  code?: string
  message?: string
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return ctx.response.status(error.status).send({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son validos.',
        details: { errors: error.messages },
      })
    }

    const err = (error ?? {}) as MaybeHttpError
    const status = typeof err.status === 'number' ? err.status : 500

    if (status >= 500) {
      return ctx.response.status(status).send({
        code: 'INTERNAL_ERROR',
        message: this.debug ? String(err.message ?? error) : 'Error interno del servidor.',
      })
    }

    return ctx.response.status(status).send({
      code: err.code ?? 'REQUEST_ERROR',
      message: err.message ?? 'Error en la solicitud.',
    })
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
