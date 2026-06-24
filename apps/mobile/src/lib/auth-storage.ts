/**
 * Persistencia de tokens en expo-secure-store (mobile). A diferencia de la web
 * (localStorage, sincrono), aca las operaciones son async. Solo iOS/Android:
 * en Expo web SecureStore no esta disponible.
 */
import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'gf_access_token'
const REFRESH_KEY = 'gf_refresh_token'

export function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY)
}

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY)
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken)
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}
