/**
 * Persistencia de tokens de auth en localStorage (web). El access token se
 * manda en cada request; el refresh token se usa para renovar la sesion
 * (refresh rotatorio). En mobile el equivalente vive en expo-secure-store.
 */
const ACCESS_KEY = 'gf_access_token'
const REFRESH_KEY = 'gf_refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
