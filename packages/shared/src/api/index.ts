/**
 * Cliente HTTP minimalista compartido por web y mobile.
 * Wrapper sobre fetch con auth y manejo uniforme de errores.
 */

import type { ApiError } from '../types'

export interface ApiClientOptions {
  baseUrl: string
  getAccessToken?: () => string | null | Promise<string | null>
  onUnauthorized?: () => void
}

export class ApiClient {
  constructor(private readonly opts: ApiClientOptions) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.opts.getAccessToken?.()
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const res = await fetch(`${this.opts.baseUrl}${path}`, { ...init, headers })
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

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
