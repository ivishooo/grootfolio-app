/**
 * Instancia compartida del ApiClient para la web. Cablea:
 *  - baseUrl desde VITE_API_URL (default http://localhost:3333).
 *  - getAccessToken: lee el token de localStorage en cada request.
 *  - refreshAccessToken: refresh rotatorio single-flight (una sola renovacion
 *    en curso compartida; ver nota en ApiClient).
 *  - onUnauthorized: si la sesion no se pudo recuperar, limpia tokens y avisa
 *    al AuthProvider (via setOnSessionExpired) para volver al login.
 */
import { ApiClient } from '@grootfolio/shared/api'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth-storage'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

let onSessionExpired: (() => void) | null = null

/** El AuthProvider registra aca como reaccionar cuando expira la sesion. */
export function setOnSessionExpired(cb: (() => void) | null): void {
  onSessionExpired = cb
}

let refreshInFlight: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export const api = new ApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken,
  onUnauthorized: () => {
    clearTokens()
    onSessionExpired?.()
  },
})
