/**
 * MeController (F3). Perfil propio editable: nombre visible y avatar (subir/quitar).
 * `GET /me` sigue en auth_controller (ya devuelve role/avatarUrl/status vía serialize).
 */
import type { HttpContext } from '@adonisjs/core/http'
import {
  UploadValidationError,
  deleteUpload,
  publicUrl,
  saveUpload,
} from '#services/content_storage'
import { updateProfileValidator } from '#validators/content'

/** Deriva la storage key de una avatarUrl pública (…/uploads/<key>). */
function keyFromAvatarUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/uploads/'
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

export default class MeController {
  /** PATCH /me — nombre visible y/o moneda base. Ambos campos son opcionales. */
  async update({ request, response, currentUser }: HttpContext) {
    const { fullName, baseCurrency } = await request.validateUsing(updateProfileValidator)
    if (fullName !== undefined) currentUser.fullName = fullName
    if (baseCurrency !== undefined) currentUser.baseCurrency = baseCurrency
    await currentUser.save()
    return response.status(200).send({ user: currentUser.serialize() })
  }

  /** POST /me/avatar — sube (y reemplaza) la foto de perfil. */
  async uploadAvatar(ctx: HttpContext) {
    const { request, response, currentUser } = ctx
    const file = request.file('file')
    if (!file) {
      return response.status(422).send({ code: 'FILE_REQUIRED', message: 'Adjuntá la imagen.' })
    }
    let saved
    try {
      saved = await saveUpload(file, 'avatar', 'avatars')
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return response.status(422).send({ code: err.code, message: err.message })
      }
      throw err
    }
    // Borra la anterior (best-effort).
    await deleteUpload(keyFromAvatarUrl(currentUser.avatarUrl))
    currentUser.avatarUrl = publicUrl(ctx, saved.key)
    await currentUser.save()
    return response.status(200).send({ avatarUrl: currentUser.avatarUrl, user: currentUser.serialize() })
  }

  /** DELETE /me/avatar — quita la foto (vuelve a iniciales). */
  async deleteAvatar({ response, currentUser }: HttpContext) {
    await deleteUpload(keyFromAvatarUrl(currentUser.avatarUrl))
    currentUser.avatarUrl = null
    await currentUser.save()
    return response.status(200).send({ user: currentUser.serialize() })
  }
}
