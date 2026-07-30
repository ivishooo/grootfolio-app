/**
 * Subida multipart con progreso real (F7). RN soporta XMLHttpRequest con
 * `upload.onprogress` y FormData con file objects `{ uri, name, type }`. Reusa
 * el token async de auth-storage y la baseUrl del ApiClient.
 */
import { getAccessToken } from './auth-storage'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<T> {
  const token = await getAccessToken()
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${baseUrl}${path}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let parsed: unknown = null
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        parsed = null
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(parsed as T)
      else {
        const err = (parsed ?? {}) as { message?: string; code?: string }
        reject(Object.assign(new Error(err.message || `HTTP ${xhr.status}`), err))
      }
    }
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo.'))
    xhr.send(form)
  })
}
