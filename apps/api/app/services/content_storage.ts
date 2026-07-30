/**
 * Storage de archivos de contenidos y avatares (F3). Implementación local:
 * los archivos se guardan bajo `storage/uploads/<subdir>/<uuid>.<ext>` y se
 * sirven por la ruta pública `GET /uploads/*`. Valida tamaño y mime por tipo.
 *
 * TODO(storage-prod): el FS de Railway es efímero. Para producción migrar a
 * Adonis Drive con disco S3/R2 (mismo contrato: saveUpload/deleteUpload/publicUrl).
 */
import { randomUUID } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import app from '@adonisjs/core/services/app'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { HttpContext } from '@adonisjs/core/http'

export type UploadKind = 'doc' | 'video' | 'image' | 'avatar'

interface Rule {
  mimes: string[]
  maxBytes: number
  label: string
}

const MB = 1024 * 1024

export const UPLOAD_RULES: Record<UploadKind, Rule> = {
  doc: {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxBytes: 20 * MB,
    label: 'PDF o DOC de hasta 20 MB',
  },
  video: { mimes: ['video/mp4', 'video/quicktime'], maxBytes: 200 * MB, label: 'MP4 o MOV de hasta 200 MB' },
  image: { mimes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB, label: 'JPG, PNG o WEBP de hasta 10 MB' },
  avatar: { mimes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 2 * MB, label: 'JPG, PNG o WEBP de hasta 2 MB' },
}

/** Directorio raíz de subidas (fuera de app/, servido por /uploads). */
export function uploadsRoot(): string {
  return app.makePath('storage/uploads')
}

export function resolveUploadPath(key: string): string {
  // `key` es "<subdir>/<uuid>.<ext>"; se normaliza contra el root para evitar
  // path traversal.
  const safe = key.replace(/\.\.+/g, '').replace(/^\/+/, '')
  return join(uploadsRoot(), safe)
}

export class UploadValidationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
  }
}

/**
 * Valida y guarda un `MultipartFile` bajo `<subdir>`. Devuelve la metadata para
 * persistir (key, mimeType, sizeBytes). Lanza UploadValidationError si no cumple.
 */
export async function saveUpload(
  file: MultipartFile,
  kind: UploadKind,
  subdir: string
): Promise<{ key: string; mimeType: string; sizeBytes: number }> {
  const rule = UPLOAD_RULES[kind]
  const mime = `${file.type}/${file.subtype}`
  if (!rule.mimes.includes(mime)) {
    throw new UploadValidationError('UPLOAD_BAD_MIME', `Formato no permitido. Se aceptan: ${rule.label}.`)
  }
  const size = file.size ?? 0
  if (size > rule.maxBytes) {
    throw new UploadValidationError('UPLOAD_TOO_LARGE', `El archivo supera el máximo (${rule.label}).`)
  }

  const ext = (file.extname ? `.${file.extname}` : extname(file.clientName || '')) || ''
  const name = `${randomUUID()}${ext}`
  const destDir = join(uploadsRoot(), subdir)
  await mkdir(destDir, { recursive: true })
  await file.move(destDir, { name, overwrite: true })

  return { key: `${subdir}/${name}`, mimeType: mime, sizeBytes: size }
}

/** Borra el archivo de una key (best-effort: no tira si no existe). */
export async function deleteUpload(key: string | null): Promise<void> {
  if (!key) return
  try {
    await unlink(resolveUploadPath(key))
  } catch {
    // ya no existe o no es local: ignorar.
  }
}

/** URL pública absoluta de una key, según el host de la request. */
export function publicUrl(ctx: HttpContext, key: string): string {
  const proto = ctx.request.protocol()
  const host = ctx.request.host()
  return `${proto}://${host}/uploads/${key}`
}
