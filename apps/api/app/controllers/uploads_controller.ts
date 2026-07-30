/**
 * UploadsController (F3). Sirve los archivos guardados por content_storage bajo
 * `GET /uploads/*` (público, por key opaca uuid). Inline (no attachment) para que
 * imágenes y videos carguen en <img>/<video>.
 */
import { existsSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import { resolveUploadPath } from '#services/content_storage'

export default class UploadsController {
  async show({ params, response }: HttpContext) {
    const parts: string[] = Array.isArray(params['*']) ? params['*'] : [params['*']]
    const key = parts.join('/')
    const path = resolveUploadPath(key)

    if (!existsSync(path)) {
      return response.status(404).send({ code: 'FILE_NOT_FOUND', message: 'Archivo no encontrado.' })
    }
    response.header('Cache-Control', 'public, max-age=3600')
    // download() en Adonis sirve inline con el content-type inferido por extensión.
    return response.download(path)
  }
}
