import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@grootfolio/shared'
import { api, setOnSessionExpired } from '@/lib/api'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/auth-storage'

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  user: User | null
  /** Carga inicial: estamos recuperando la sesion (`/me`) desde el token guardado. */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  /** Actualiza el usuario en memoria (ej. tras editar perfil/avatar en Configuración). */
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Al montar: si hay un token guardado, recuperamos el usuario con /me. Si el
  // refresh tampoco alcanza, el onUnauthorized del ApiClient limpia y avisa.
  useEffect(() => {
    setOnSessionExpired(() => setUser(null))
    let active = true
    async function bootstrap() {
      if (!getAccessToken()) {
        setLoading(false)
        return
      }
      try {
        const { user: me } = await api.get<{ user: User }>('/me')
        if (active) setUser(me)
      } catch {
        clearTokens()
      } finally {
        if (active) setLoading(false)
      }
    }
    void bootstrap()
    return () => {
      active = false
      setOnSessionExpired(null)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }, [])

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const data = await api.post<AuthResponse>('/auth/register', { email, password, fullName })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {
      // logout es idempotente en el backend; igual limpiamos local.
    }
    clearTokens()
    setUser(null)
  }, [])

  const updateUser = useCallback((next: User) => setUser(next), [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: user !== null, user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
