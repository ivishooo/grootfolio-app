/**
 * Instancia compartida del ApiClient para mobile. Espejo de la web (GF-223)
 * pero con storage async (expo-secure-store) y baseUrl desde
 * EXPO_PUBLIC_API_URL. Refresh rotatorio single-flight ante 401.
 *
 * Nota: en dispositivo fisico/emulador Android, "localhost" no apunta a tu
 * maquina. Usa la IP LAN de la PC (o 10.0.2.2 en el emulador de Android) en
 * EXPO_PUBLIC_API_URL. En el simulador de iOS, localhost funciona.
 */
import { ApiClient } from '@grootfolio/shared/api'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth-storage'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333'

let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(cb: (() => void) | null): void {
  onSessionExpired = cb
}

let refreshInFlight: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    await setTokens(data.accessToken, data.refreshToken)
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
    void clearTokens()
    onSessionExpired?.()
  },
})
