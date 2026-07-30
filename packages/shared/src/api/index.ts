/**
 * Cliente HTTP minimalista compartido por web y mobile.
 * Wrapper sobre fetch con auth y manejo uniforme de errores.
 */

import type { ApiError } from '../types'

export interface ApiClientOptions {
  baseUrl: string
  getAccessToken?: () => string | null | Promise<string | null>
  /**
   * Renueva el access token (refresh rotatorio). Devuelve true si lo logro.
   * Ante un 401, el cliente lo invoca UNA vez y reintenta la request original.
   * La implementacion debe ser single-flight (compartir un refresh en curso)
   * para no disparar varios refresh en paralelo: con rotacion, el segundo
   * usaria un token ya consumido y el backend revocaria toda la sesion.
   */
  refreshAccessToken?: () => Promise<boolean>
  onUnauthorized?: () => void
}

export class ApiClient {
  constructor(private readonly opts: ApiClientOptions) {}

  async request<T>(path: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
    const token = await this.opts.getAccessToken?.()
    const headers = new Headers(init.headers)
    // FormData define su propio Content-Type (con boundary): no lo pisamos.
    if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const res = await fetch(`${this.opts.baseUrl}${path}`, { ...init, headers })

    if (res.status === 401 && retryOn401 && this.opts.refreshAccessToken) {
      const refreshed = await this.opts.refreshAccessToken()
      if (refreshed) return this.request<T>(path, init, false)
    }
    if (res.status === 401) {
      this.opts.onUnauthorized?.()
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as ApiError
      throw Object.assign(new Error(err.message || res.statusText), err)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  get<T>(path: string) {
    return this.request<T>(path)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
  }

  delete<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined })
  }

  /** Sube `FormData` (multipart). El navegador/RN setean el Content-Type. */
  upload<T>(path: string, form: FormData, method: 'POST' | 'PATCH' = 'POST') {
    return this.request<T>(path, { method, body: form })
  }
}
